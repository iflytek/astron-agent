import { useEffect, useRef, useState } from 'react';
import { Modal } from 'antd';
import MarkdownRender from '@/components/markdown-render';
import { downloadFileWithHeaders } from '@/utils/http';
import {
  createAgentSession,
  deleteAgentSession,
  getAgentMessages,
  listAgentSessions,
  stopAgentRun,
  streamAgentRun,
  uploadAgentFile,
  type AgentDefinition,
  type AgentFile,
  type AgentKind,
  type AgentRun,
  type AgentSession,
} from '@/services/agents';
import { errorText } from './errors';
import { isFileAvailable, inputFiles, needsFileUpload } from './files';
import {
  interruptRun,
  reduceRun,
  statusText,
  type RunEvent,
} from './run-state';

function Attachment({ agentId, file }: { agentId: number; file: AgentFile }) {
  if (!isFileAvailable(file))
    return (
      <span className="agents-muted">
        📎 {file.name}（历史附件不可下载，请重新上传）
      </span>
    );
  return (
    <button
      onClick={() =>
        downloadFileWithHeaders(
          `/console-api/agents/${agentId}/files/${file.id}`,
          file.name
        )
      }
    >
      {file.direction === 'output' ? '下载生成文件：' : '📎 '}
      {file.name}
    </button>
  );
}

interface KnowledgeSource {
  source_id: string;
  chunk: Array<{ chunk_context: string }>;
}

function isKnowledgeSource(value: unknown): value is KnowledgeSource {
  if (!value || typeof value !== 'object') return false;
  const source = value as Record<string, unknown>;
  return (
    typeof source.source_id === 'string' &&
    !!source.source_id &&
    Array.isArray(source.chunk) &&
    source.chunk.length > 0 &&
    source.chunk.every(
      chunk =>
        chunk &&
        typeof chunk.chunk_context === 'string' &&
        !!chunk.chunk_context.trim()
    )
  );
}

function KnowledgeReferences({ references }: { references: unknown }) {
  if (!Array.isArray(references) || !references.every(isKnowledgeSource))
    return (
      <p role="alert" className="agents-error">
        知识引用格式无效，无法显示来源片段。
      </p>
    );
  return (
    <details open>
      <summary>
        知识引用 ·{' '}
        {references.reduce((count, source) => count + source.chunk.length, 0)}{' '}
        个片段
      </summary>
      {!references.length && (
        <p className="agents-muted">本次检索未返回引用。</p>
      )}
      <ol className="agents-references">
        {references.flatMap((source, sourceIndex) =>
          source.chunk.map((chunk, chunkIndex) => {
            // Core builds chunk_context as source title + newline + retrieved text.
            const separator = chunk.chunk_context.indexOf('\n');
            const title =
              separator < 0 ? '' : chunk.chunk_context.slice(0, separator);
            const excerpt =
              separator < 0
                ? chunk.chunk_context
                : chunk.chunk_context.slice(separator + 1);
            return (
              <li key={`${sourceIndex}:${chunkIndex}`}>
                <strong>{title || '未命名来源'}</strong>
                <p>{excerpt}</p>
              </li>
            );
          })
        )}
      </ol>
    </details>
  );
}

export function EventDetails({ events }: { events: AgentRun['events'] }) {
  return (
    <div className="agents-events">
      {(events || []).map((event, index) => {
        const data =
          event.data && typeof event.data === 'object'
            ? (event.data as Record<string, unknown>)
            : event;
        if (event.type === 'error')
          return (
            <p role="alert" className="agents-error" key={index}>
              {String(data.message || '执行失败')}
            </p>
          );
        if (event.type === 'tool')
          return (
            <details key={index} open>
              <summary>工具调用与结果</summary>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </details>
          );
        if (event.type === 'knowledge')
          return (
            <KnowledgeReferences key={index} references={data.references} />
          );
        return null;
      })}
    </div>
  );
}

function SessionMessages({
  agent,
  session,
  onChanged,
}: {
  agent: AgentDefinition;
  session: AgentSession;
  onChanged: () => void;
}) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<
    Array<{ id: string; name: string; size: number }>
  >([]);
  const stream = useRef<AbortController | null>(null);
  const runId = useRef('');
  const alive = useRef(true);
  const sending = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    alive.current = true;
    getAgentMessages(agent.id, session.id)
      .then(result => {
        if (alive.current) setRuns(result);
      })
      .catch(reason => {
        if (alive.current) setError(errorText(reason));
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
    return () => {
      alive.current = false;
      stream.current?.abort();
    };
  }, [agent.id, session.id]);

  const refresh = async () => {
    const result = await getAgentMessages(agent.id, session.id);
    if (alive.current) {
      setRuns(result);
      onChanged();
    }
  };

  const send = async (previous?: AgentRun) => {
    if (
      sending.current ||
      stopping ||
      uploading ||
      loading ||
      (!previous && !question.trim())
    )
      return;
    if (previous && needsFileUpload(previous)) {
      setQuestion(previous.question);
      setFiles([]);
      setError(
        '此历史问题包含不可访问的旧附件。问题已填入输入框，请重新上传原文件后发送；本次未发起重答。'
      );
      return;
    }
    sending.current = true;
    const controller = new AbortController();
    stream.current = controller;
    runId.current = '';
    let attempt: AgentRun = {
      id: `pending-${Date.now()}`,
      question: previous?.question || question.trim(),
      answer: '',
      reasoning: '',
      events: [],
      status: 'running',
      createdAt: new Date().toISOString(),
      files: previous ? inputFiles(previous) : files,
    };
    const pendingId = attempt.id;
    setError('');
    setBusy(true);
    setStopping(false);
    setRuns(current => [...current, attempt]);
    setQuestion('');
    setFiles([]);
    const apply = (event: RunEvent) => {
      attempt = reduceRun(attempt, event);
      if (alive.current)
        setRuns(current =>
          current.map(row =>
            row.id === pendingId || row.id === runId.current ? attempt : row
          )
        );
      if (event.type === 'run') runId.current = attempt.id;
    };
    try {
      await streamAgentRun(
        agent.id,
        session.id,
        {
          message: attempt.question,
          files: (attempt.files || []).map(file => file.id),
          ...(previous ? { regenerateId: previous.id } : {}),
        },
        {
          onRun: data => apply({ type: 'run', data }),
          onDelta: data => apply({ type: 'delta', data }),
          onTool: data => apply({ type: 'tool', data }),
          onKnowledge: data => apply({ type: 'knowledge', data }),
          onError: data => apply({ type: 'error', data }),
          onEnd: data => apply({ type: 'end', data }),
        },
        controller.signal
      );
      if (alive.current && !controller.signal.aborted) await refresh();
    } catch (reason) {
      if (alive.current) {
        const message = errorText(reason);
        attempt = interruptRun(attempt, message);
        setRuns(current =>
          current.map(row =>
            row.id === pendingId || row.id === runId.current ? attempt : row
          )
        );
        setError(message);
      }
    } finally {
      sending.current = false;
      if (alive.current) {
        setBusy(false);
      }
    }
  };

  const stop = async () => {
    if (!runId.current || stopping) return;
    setStopping(true);
    setError('');
    try {
      await stopAgentRun(agent.id, runId.current);
      stream.current?.abort();
      // Wait for the server checkpoint after upstream cancellation; do not label a pending stop as cancelled.
      for (let retry = 0; retry < 40 && alive.current; retry++) {
        const result = await getAgentMessages(agent.id, session.id);
        if (!alive.current) return;
        setRuns(result);
        const stopped = result.find(row => row.id === runId.current);
        if (stopped && stopped.status !== 'running') {
          onChanged();
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      if (alive.current)
        setError('停止请求已提交，终态尚未确认，请刷新历史查看。');
    } catch (reason) {
      if (alive.current) setError(errorText(reason));
    } finally {
      if (alive.current) setStopping(false);
    }
  };

  const upload = async (selected: FileList | null) => {
    if (!selected) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(selected)) {
        const uploaded = await uploadAgentFile(agent.id, file);
        if (!alive.current) return;
        setFiles(current => [...current, uploaded]);
      }
    } catch (reason) {
      if (alive.current) setError(errorText(reason));
    } finally {
      if (alive.current) {
        setUploading(false);
        if (fileInput.current) fileInput.current.value = '';
      }
    }
  };

  return (
    <section className="agents-conversation">
      <div className="agents-toolbar">
        <h2>{session.title || '新会话'}</h2>
        <button
          disabled={busy || stopping}
          onClick={() =>
            void refresh().catch(reason => setError(errorText(reason)))
          }
        >
          刷新历史
        </button>
      </div>
      <div className="agents-message-list" aria-live="polite">
        {loading && <p>正在读取历史…</p>}
        {!loading && !runs.length && (
          <p className="agents-empty">
            发送消息开始{session.kind === 'debug' ? '调试' : '聊天'}。
          </p>
        )}
        {runs.map((run, index) => (
          <article className="agents-run" key={run.id}>
            <div className="agents-question">
              <span>你</span>
              <p>{run.question}</p>
              {inputFiles(run).map(file => (
                <Attachment key={file.id} agentId={agent.id} file={file} />
              ))}
            </div>
            <div className="agents-answer">
              <div className="agents-answer-meta">
                <strong>{agent.botName}</strong>
                <span className={`agents-status ${run.status}`}>
                  {statusText[run.status] || run.status}
                </span>
              </div>
              {run.reasoning && (
                <details>
                  <summary>思考过程</summary>
                  <MarkdownRender
                    content={run.reasoning}
                    isSending={busy && index === runs.length - 1}
                  />
                </details>
              )}
              {run.answer && (
                <MarkdownRender
                  content={run.answer}
                  isSending={busy && index === runs.length - 1}
                />
              )}
              <EventDetails events={run.events} />
              {run.files
                ?.filter(file => file.direction === 'output')
                .map(file => (
                  <Attachment key={file.id} agentId={agent.id} file={file} />
                ))}
              {!run.answer && run.status !== 'running' && (
                <p className="agents-muted">本次执行未生成文本回答。</p>
              )}
              <button
                disabled={busy || stopping || loading}
                onClick={() => void send(run)}
              >
                {needsFileUpload(run) ? '重新上传文件后再回答' : '重新回答'}
              </button>
            </div>
          </article>
        ))}
      </div>
      {error && (
        <div role="alert" className="agents-error">
          {error}
        </div>
      )}
      <form
        className="agents-composer"
        onSubmit={event => {
          event.preventDefault();
          void send();
        }}
      >
        <label>
          消息
          <textarea
            aria-label={session.kind === 'debug' ? '调试消息' : '聊天消息'}
            value={question}
            disabled={busy || stopping || loading}
            onChange={event => setQuestion(event.target.value)}
            placeholder="输入消息…"
            rows={3}
          />
        </label>
        {!!files.length && (
          <div className="agents-files">
            {files.map(file => (
              <span key={file.id}>
                {file.name}
                <button
                  type="button"
                  aria-label={`移除 ${file.name}`}
                  onClick={() =>
                    setFiles(current =>
                      current.filter(item => item.id !== file.id)
                    )
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="agents-actions">
          {Boolean(agent.supportUpload) && (
            <>
              <input
                ref={fileInput}
                className="agents-file-input"
                type="file"
                accept=".txt,.md,.csv,.json,.pdf,.docx"
                multiple
                disabled={busy || stopping || uploading}
                onChange={event => void upload(event.target.files)}
              />
              <button
                type="button"
                disabled={busy || stopping || uploading}
                onClick={() => fileInput.current?.click()}
              >
                {uploading ? '上传中…' : '添加文件'}
              </button>
            </>
          )}
          {busy || stopping ? (
            <button
              className="danger"
              type="button"
              disabled={stopping || !runId.current}
              onClick={() => void stop()}
            >
              {stopping ? '正在停止…' : '停止生成'}
            </button>
          ) : (
            <button
              className="primary"
              type="submit"
              disabled={loading || uploading || !question.trim()}
            >
              发送
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

export default function Conversation({
  agent,
  kind,
}: {
  agent: AgentDefinition;
  kind: AgentKind;
}) {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [selected, setSelected] = useState<AgentSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AgentSession | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [revision, setRevision] = useState(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    let active = true;
    listAgentSessions(agent.id, kind)
      .then(result => {
        if (active) {
          setSessions(result);
          setSelected(current => current || result[0] || null);
        }
      })
      .catch(reason => {
        if (active) setError(errorText(reason));
      });
    return () => {
      active = false;
      alive.current = false;
    };
  }, [agent.id, kind, revision]);
  const create = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const session = await createAgentSession(agent.id, kind, '新会话');
      if (alive.current) {
        setSessions(current => [session, ...current]);
        setSelected(session);
      }
    } catch (reason) {
      if (alive.current) setError(errorText(reason));
    } finally {
      submitting.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const remove = async (session: AgentSession) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await deleteAgentSession(agent.id, session.id);
      if (alive.current) {
        setSessions(current => current.filter(row => row.id !== session.id));
        setSelected(current => (current?.id === session.id ? null : current));
        setDeleteTarget(null);
      }
    } catch (reason) {
      if (alive.current) setError(errorText(reason));
    } finally {
      submitting.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return (
    <div className="agents-chat-layout">
      <aside className="agents-session-list">
        <button
          className="primary"
          disabled={busy}
          onClick={() => void create()}
        >
          新建{kind === 'debug' ? '调试' : '聊天'}会话
        </button>
        {sessions.map(session => (
          <div
            className={`agents-session ${selected?.id === session.id ? 'selected' : ''}`}
            key={session.id}
          >
            <button onClick={() => setSelected(session)}>
              {session.title || '未命名会话'}
              <small>{session.updatedAt}</small>
            </button>
            <button
              aria-label={`删除会话 ${session.title}`}
              disabled={busy}
              onClick={() => {
                setError('');
                setDeleteTarget(session);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </aside>
      <div className="agents-chat-main">
        {error && (
          <div role="alert" className="agents-error">
            {error}
          </div>
        )}
        {selected ? (
          <SessionMessages
            key={selected.id}
            agent={agent}
            session={selected}
            onChanged={() => setRevision(value => value + 1)}
          />
        ) : (
          <div className="agents-empty">
            创建或选择一个会话。调试与聊天的历史分别保存。
          </div>
        )}
      </div>
      <Modal
        title={kind === 'debug' ? '删除调试会话' : '删除聊天会话'}
        open={deleteTarget !== null}
        okText="删除会话"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        cancelButtonProps={{ disabled: busy }}
        confirmLoading={busy}
        closable={!busy}
        keyboard={!busy}
        maskClosable={!busy}
        onCancel={() => {
          if (!submitting.current) setDeleteTarget(null);
        }}
        onOk={() => {
          if (deleteTarget) void remove(deleteTarget);
        }}
      >
        <p>
          删除 Agent“{agent.botName}”的{kind === 'debug' ? '调试' : '聊天'}会话“
          {deleteTarget?.title || '未命名会话'}”？
        </p>
        {error && (
          <p role="alert" className="agents-error">
            {error}
          </p>
        )}
      </Modal>
    </div>
  );
}
