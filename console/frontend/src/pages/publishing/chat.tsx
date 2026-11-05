import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import http, { getLanguageCode, downloadFileWithHeaders } from '@/utils/http';
import { fetchSseWithContext } from '@/utils/sse-request';
import useSpaceStore from '@/store/space-store';
import { errorText } from '@/pages/agents/errors';
import '@/pages/agents/style.css';
interface Detail {
  id: number;
  name: string;
  description: string;
  kind: string;
  prologue: string;
  supportUpload: boolean;
  inputs: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
}
interface History {
  id: string;
  sessionId: string;
  question: unknown;
  answer: string;
  status: string;
  files?: { id: string; name: string; downloadUrl: string }[];
}
export default function PublishedChat() {
  const { botId } = useParams();
  const spaceId = useSpaceStore(state => state.spaceId);
  const [params] = useSearchParams();
  const shareKey = params.get('shareKey') || undefined;
  const [detail, setDetail] = useState<Detail | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [message, setMessage] = useState('');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [resume, setResume] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const runId = useRef('');
  const sessionId = useRef('');
  const controller = useRef<AbortController | null>(null);
  const stopRequested = useRef(false);
  const generation = useRef(0);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    generation.current += 1;
    controller.current?.abort();
    runId.current = '';
    sessionId.current = '';
    setDetail(null);
    setHistory([]);
    setAnswer('');
    setStatus('');
    setBusy(false);
    setFiles([]);
    setInputs({});
    setUploading(false);
    http
      .get<unknown, Detail>(`/published/${botId}`, { params: { shareKey } })
      .then(data => {
        if (active) {
          setDetail(data);
          setError('');
        }
      })
      .catch(reason => {
        if (active) setError(errorText(reason));
      });
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, [botId, shareKey, spaceId]);
  useEffect(() => {
    let active = true;
    http
      .get<unknown, History[]>(`/published/${botId}/history`, {
        params: { shareKey },
      })
      .then(data => {
        if (active) setHistory(data);
      })
      .catch(reason => {
        if (active) setError(errorText(reason));
      });
    return () => {
      active = false;
    };
  }, [botId, shareKey, spaceId, revision]);
  const stop = async () => {
    const currentGeneration = generation.current;
    stopRequested.current = true;
    if (!runId.current) return;
    try {
      const result = await http.post<unknown, { status: string }>(
        `/published/runs/${runId.current}/stop`
      );
      if (currentGeneration !== generation.current) return;
      setStatus(result.status);
      if (
        ['completed', 'failed', 'cancelled', 'interrupted'].includes(
          result.status
        )
      ) {
        controller.current?.abort();
        setBusy(false);
      }
      setRevision(value => value + 1);
    } catch (reason) {
      if (currentGeneration === generation.current) setError(errorText(reason));
    }
  };
  const execute = async (resuming = false) => {
    if (busy || uploading) return;
    setBusy(true);
    setError('');
    stopRequested.current = false;
    if (!resuming) {
      setAnswer('');
      runId.current = '';
    }
    setStatus('running');
    const abort = new AbortController();
    const currentGeneration = generation.current;
    controller.current = abort;
    const space = useSpaceStore.getState();
    let ended = false;
    try {
      const values: Record<string, unknown> = {};
      for (const item of detail?.inputs || []) {
        const value = inputs[item.name];
        if (value === undefined || value === '') {
          if (item.required) throw new Error(`请输入 ${item.name}`);
          continue;
        }
        values[item.name] = item.type === 'string' ? value : JSON.parse(value);
      }
      await fetchSseWithContext(
        resuming
          ? `/console-api/published/runs/${runId.current}/resume`
          : `/console-api/published/${botId}/chat`,
        {
          getContext: () => ({
            languageCode: getLanguageCode(),
            spaceId: space.spaceId,
            spaceType: space.spaceType,
            enterpriseId: space.enterpriseId,
          }),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(
            resuming
              ? { content: resume }
              : {
                  message,
                  files: files.map(file => file.id),
                  inputs: values,
                  shareKey,
                  sessionId: sessionId.current || undefined,
                }
          ),
          signal: abort.signal,
          openWhenHidden: true,
          onopen: async response => {
            if (
              !response.ok ||
              !response.headers
                .get('content-type')
                ?.includes('text/event-stream')
            ) {
              const value = await response.json().catch(() => null);
              throw new Error(value?.message || '无法开始执行');
            }
          },
          onmessage: event => {
            if (currentGeneration !== generation.current) return;
            if (!event.data || event.data === '[DONE]') return;
            const data = JSON.parse(event.data);
            if (event.event === 'run') {
              runId.current = data.runId || data.id;
              if (data.sessionId) sessionId.current = data.sessionId;
              if (stopRequested.current) void stop();
            } else if (event.event === 'delta')
              setAnswer(value => value + (data.content || ''));
            else if (event.event === 'end' || event.event === 'run-end') {
              ended = true;
              setStatus(data.status);
            } else if (event.event === 'error' || data.code)
              setError(data.message || '执行失败');
            else
              for (const choice of data.choices || [])
                setAnswer(value => value + (choice.delta?.content || ''));
          },
          onclose: () => {
            if (!ended && !abort.signal.aborted)
              throw new Error('连接在执行结束前断开');
          },
          onerror: reason => {
            throw reason;
          },
        }
      );
    } catch (reason) {
      if (!abort.signal.aborted && currentGeneration === generation.current) {
        setError(errorText(reason));
        setStatus('failed');
      }
    } finally {
      if (currentGeneration === generation.current) {
        setBusy(false);
        setRevision(value => value + 1);
      }
    }
  };
  return (
    <main className="agents-page">
      <header className="agents-header">
        <div>
          <h1>{detail?.name || '已发布 Agent'}</h1>
          <p>{detail?.description}</p>
        </div>
        <Link to="/store/agent">返回市场</Link>
      </header>
      {error && (
        <p role="alert" className="agents-error">
          {error}
        </p>
      )}
      {detail?.prologue && <p>{detail.prologue}</p>}
      <section className="agents-panel">
        <h2>我的会话历史</h2>
        {history.map(item => (
          <article key={item.id}>
            <p>
              <strong>提问：</strong>
              {typeof item.question === 'string'
                ? item.question
                : JSON.stringify(item.question)}
            </p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{item.answer}</p>
            <small>{item.status}</small>
            {item.files?.map(file => (
              <button
                key={file.id}
                onClick={() =>
                  downloadFileWithHeaders(file.downloadUrl, file.name)
                }
              >
                {file.name}
              </button>
            ))}
            {item.status === 'paused' && (
              <button
                disabled={busy}
                onClick={() => {
                  runId.current = item.id;
                  setStatus('paused');
                  setAnswer(item.answer);
                }}
              >
                继续此运行
              </button>
            )}
          </article>
        ))}
      </section>
      <form
        className="agents-panel"
        onSubmit={event => {
          event.preventDefault();
          void execute();
        }}
      >
        {detail?.kind === 'workflow' ? (
          detail.inputs.map(item => (
            <label key={item.name}>
              {item.name} · {item.description}
              <textarea
                required={item.required}
                disabled={busy}
                value={inputs[item.name] || ''}
                placeholder={
                  item.type === 'string' ? '输入文本' : '输入 JSON 值'
                }
                onChange={event =>
                  setInputs(value => ({
                    ...value,
                    [item.name]: event.target.value,
                  }))
                }
              />
            </label>
          ))
        ) : (
          <label>
            消息
            <textarea
              required
              disabled={busy}
              value={message}
              onChange={event => setMessage(event.target.value)}
            />
          </label>
        )}
        {detail?.supportUpload && (
          <label>
            上传文件
            <input
              type="file"
              disabled={busy || uploading || files.length >= 10}
              accept=".txt,.md,.csv,.json,.pdf,.docx"
              onChange={event => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                const currentGeneration = generation.current;
                setUploading(true);
                const form = new FormData();
                form.append('file', file);
                if (shareKey) form.append('shareKey', shareKey);
                void http
                  .post<unknown, { id: string; name: string }>(
                    `/published/${botId}/files`,
                    form,
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                  )
                  .then(data => {
                    if (currentGeneration === generation.current)
                      setFiles(previous => [...previous, data]);
                  })
                  .catch(reason => {
                    if (currentGeneration === generation.current)
                      setError(errorText(reason));
                  })
                  .finally(() => {
                    if (currentGeneration === generation.current)
                      setUploading(false);
                  });
              }}
            />
            {files.map(file => (
              <span key={file.id}>
                {file.name}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setFiles(previous =>
                      previous.filter(value => value.id !== file.id)
                    )
                  }
                >
                  移除
                </button>
              </span>
            ))}
          </label>
        )}
        <div className="agents-actions">
          <button className="primary" disabled={busy || uploading || !detail}>
            发送
          </button>
          {(busy || status === 'paused') && (
            <button type="button" onClick={() => void stop()}>
              停止
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              sessionId.current = '';
              setNoticeEmpty();
            }}
          >
            新会话
          </button>
        </div>
      </form>
      {(answer || status) && (
        <section className="agents-panel">
          <h2>当前回答</h2>
          <div style={{ whiteSpace: 'pre-wrap' }}>{answer}</div>
          <p role="status">{status}</p>
        </section>
      )}
      {status === 'paused' && (
        <form
          className="agents-panel"
          onSubmit={event => {
            event.preventDefault();
            void execute(true);
          }}
        >
          <label>
            补充内容
            <textarea
              required
              value={resume}
              onChange={event => setResume(event.target.value)}
            />
          </label>
          <button disabled={busy}>恢复运行</button>
        </form>
      )}
    </main>
  );
  function setNoticeEmpty() {
    setFiles([]);
    setAnswer('');
    setMessage('');
    setStatus('');
    runId.current = '';
  }
}
