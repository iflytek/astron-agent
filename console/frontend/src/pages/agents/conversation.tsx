import { useEffect, useRef, useState } from 'react';
import copy from 'copy-to-clipboard';
import { Alert, Button, Drawer, Modal, Skeleton } from 'antd';
import {
  PaperClipOutlined,
  CloseOutlined,
  DeleteOutlined,
  HistoryOutlined,
  PlusOutlined,
  UserOutlined,
  ArrowUpOutlined,
  StopOutlined,
  ReloadOutlined,
  CopyOutlined,
  CheckOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import MarkdownRender from '@/components/markdown-render';
import agentAvatar from '@/assets/imgs/avatars/agent-chat-avatar.svg';
import agentDebugIcon from '@/assets/imgs/avatars/agent-debug-robot-icon.svg';
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
        <PaperClipOutlined /> {file.name}（历史附件不可下载，请重新上传）
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
      {file.direction === 'output' ? '下载生成文件：' : <PaperClipOutlined />}
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
  if (!events?.length) return null;
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
          return <ToolCallDetails key={index} data={data} />;
        if (event.type === 'knowledge')
          return (
            <KnowledgeReferences key={index} references={data.references} />
          );
        return null;
      })}
    </div>
  );
}

function formatToolValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

function ToolCallDetails({ data }: { data: Record<string, unknown> }) {
  const tool =
    data.function && typeof data.function === 'object'
      ? (data.function as Record<string, unknown>)
      : data;
  const name =
    typeof tool.name === 'string' && tool.name.trim()
      ? tool.name
      : '未命名工具';
  const request = formatToolValue(tool.arguments);
  const response = formatToolValue(tool.response ?? data.result);
  return (
    <details className="agent-tool-call">
      <summary className="agent-tool-name">{name}</summary>
      <div className="agent-tool-exchange agent-tool-request">
        <h4>REQUEST</h4>
        {request === null ? (
          <p className="agents-muted">此记录未保存请求参数。</p>
        ) : (
          <pre>{request}</pre>
        )}
      </div>
      <div className="agent-tool-exchange agent-tool-response">
        <h4>RESPONSE</h4>
        {response === null ? (
          <p className="agents-muted">此记录未保存返回结果。</p>
        ) : (
          <pre>{response}</pre>
        )}
      </div>
    </details>
  );
}

export function RunEvents({ run }: { run: AgentRun }) {
  const events = run.events || [];
  const tools = events.filter(event => event.type === 'tool');
  return (
    <>
      <EventDetails events={events.filter(event => event.type === 'error')} />
      {tools.length > 0 && (
        <details className="agent-tool-trace">
          <summary className="agent-run-progress">
            {run.status === 'running' && (
              <LoadingOutlined spin aria-hidden="true" />
            )}
            Thinking
          </summary>
          <EventDetails events={tools} />
        </details>
      )}
      <EventDetails
        events={events.filter(event => event.type === 'knowledge')}
      />
    </>
  );
}

export function hasVisibleRunOutput(run: AgentRun): boolean {
  return Boolean(
    run.answer ||
      run.status !== 'running' ||
      run.files?.some(file => file.direction === 'output') ||
      run.events?.some(event =>
        ['tool', 'knowledge', 'error'].includes(String(event.type))
      )
  );
}

function SessionMessages({
  agent,
  session,
  onChanged,
  onGuardChange,
  refreshRevision,
  onRefreshStateChange,
}: {
  agent: AgentDefinition;
  session: AgentSession;
  onChanged: () => void;
  onGuardChange: (reason: string) => void;
  refreshRevision: number;
  onRefreshStateChange: (disabled: boolean) => void;
}) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [files, setFiles] = useState<
    Array<{ id: string; name: string; size: number }>
  >([]);
  const stream = useRef<AbortController | null>(null);
  const runId = useRef('');
  const alive = useRef(true);
  const sending = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const messageList = useRef<HTMLDivElement>(null);
  const followsLatest = useRef(true);
  const [copiedId, setCopiedId] = useState('');
  useEffect(() => {
    if (followsLatest.current && messageList.current) {
      messageList.current.scrollTop = messageList.current.scrollHeight;
    }
  }, [runs, loading]);

  useEffect(() => {
    alive.current = true;
    let active = true;
    setLoading(true);
    setHistoryError('');
    getAgentMessages(agent.id, session.id)
      .then(result => {
        if (active) {
          setRuns(result);
          setHistoryError('');
          setHistoryLoaded(true);
        }
      })
      .catch(reason => {
        if (active) setHistoryError(errorText(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      alive.current = false;
      stream.current?.abort();
    };
  }, [agent.id, session.id, historyRevision, refreshRevision]);

  useEffect(() => {
    onRefreshStateChange(busy || stopping || loading);
  }, [busy, stopping, loading, onRefreshStateChange]);

  const running = runs.some(run => run.status === 'running');
  useEffect(() => {
    onGuardChange(
      busy || stopping || running
        ? '离开会断开当前运行的反馈连接；服务端运行状态可在历史中重新读取。'
        : question.trim() || files.length || uploading
          ? '当前消息或附件尚未发送，离开后会丢失。'
          : ''
    );
    return () => onGuardChange('');
  }, [
    busy,
    stopping,
    running,
    question,
    files.length,
    uploading,
    onGuardChange,
  ]);

  const refresh = async () => {
    const result = await getAgentMessages(agent.id, session.id);
    if (alive.current) {
      setRuns(result);
      setHistoryError('');
      setHistoryLoaded(true);
      setError('');
      onChanged();
    }
  };

  const send = async (previous?: AgentRun) => {
    if (
      sending.current ||
      stopping ||
      uploading ||
      loading ||
      !historyLoaded ||
      running ||
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
    followsLatest.current = true;
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
        // A disconnected stream is not proof that the server has stopped.
        setHistoryLoaded(false);
      }
    } finally {
      sending.current = false;
      if (alive.current) {
        setBusy(false);
      }
    }
  };

  const stop = async () => {
    const targetId =
      runs.find(
        run => run.status === 'running' && !run.id.startsWith('pending-')
      )?.id || (sending.current ? runId.current : '');
    if (!targetId || stopping) return;
    runId.current = targetId;
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
      <div
        className="agents-message-list"
        aria-live="polite"
        ref={messageList}
        onScroll={event => {
          const element = event.currentTarget;
          followsLatest.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            80;
        }}
      >
        {loading && <Skeleton active paragraph={{ rows: 4 }} />}
        {historyError && (
          <div role="alert" className="agents-error agents-error-action">
            <span>历史读取失败：{historyError}</span>
            <button
              type="button"
              disabled={busy || stopping || loading}
              onClick={() => setHistoryRevision(value => value + 1)}
            >
              重试读取历史
            </button>
          </div>
        )}
        {!loading && !historyError && !runs.length && (
          <div className="agents-empty agent-conversation-welcome">
            <img src={agentAvatar} alt="" />
            <h3>今天有什么可以帮你？</h3>
            <p>
              {session.kind === 'debug'
                ? '发送消息，看看 Agent 的表现。'
                : agent.botDesc || '从一个问题或任务开始。'}
            </p>
          </div>
        )}
        {runs.map((run, index) => (
          <article className="agents-run" key={run.id}>
            <div className="agents-question-row">
              <div className="agents-question">
                <span className="agent-sr-only">你</span>
                <p>{run.question}</p>
                {inputFiles(run).map(file => (
                  <Attachment key={file.id} agentId={agent.id} file={file} />
                ))}
              </div>
              <span
                className="agent-message-avatar agent-user-avatar"
                aria-hidden="true"
              >
                <UserOutlined />
              </span>
            </div>
            {(hasVisibleRunOutput(run) || !busy) && (
              <div className="agents-answer-row">
                <img
                  className="agent-message-avatar"
                  src={agentAvatar}
                  alt=""
                />
                <div className="agents-answer-content">
                  <div className="agents-answer">
                    <div className="agents-answer-meta">
                      <strong className="agent-sr-only">{agent.botName}</strong>
                      {run.status !== 'completed' &&
                        run.status !== 'running' && (
                          <span className={`agents-status ${run.status}`}>
                            {statusText[run.status] || run.status}
                          </span>
                        )}
                    </div>
                    <RunEvents run={run} />
                    {run.answer && (
                      <MarkdownRender
                        content={run.answer}
                        isSending={busy && index === runs.length - 1}
                      />
                    )}
                    {run.files
                      ?.filter(file => file.direction === 'output')
                      .map(file => (
                        <Attachment
                          key={file.id}
                          agentId={agent.id}
                          file={file}
                        />
                      ))}
                    {!run.answer && run.status !== 'running' && (
                      <p className="agents-muted">本次执行未生成文本回答。</p>
                    )}
                    {run.status === 'running' && !busy && (
                      <p className="agents-muted">
                        运行尚未结束，可在会话历史中刷新，或停止生成。
                      </p>
                    )}
                  </div>
                  <div className="agent-answer-actions">
                    {run.answer && (
                      <Button
                        type="text"
                        size="small"
                        icon={
                          copiedId === run.id ? (
                            <CheckOutlined />
                          ) : (
                            <CopyOutlined />
                          )
                        }
                        aria-label={
                          copiedId === run.id ? '已复制回答' : '复制回答'
                        }
                        title={copiedId === run.id ? '已复制' : '复制回答'}
                        onClick={() => {
                          if (copy(run.answer, { format: 'text/plain' }))
                            setCopiedId(run.id);
                          else setError('无法复制，请选择回答文本后复制。');
                        }}
                      />
                    )}
                    {run.status !== 'running' && (
                      <Button
                        type="text"
                        size="small"
                        icon={<ReloadOutlined />}
                        aria-label={
                          needsFileUpload(run)
                            ? '重新上传文件后再回答'
                            : '重新回答'
                        }
                        title={
                          needsFileUpload(run)
                            ? '重新上传文件后再回答'
                            : '重新回答'
                        }
                        disabled={
                          busy ||
                          stopping ||
                          loading ||
                          running ||
                          !historyLoaded
                        }
                        onClick={() => void send(run)}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
      {error && (
        <div role="alert" className="agents-error agents-error-action">
          <span>{error}</span>
          <button
            type="button"
            disabled={busy || stopping || loading}
            onClick={() =>
              void refresh().catch(reason => setError(errorText(reason)))
            }
          >
            重试
          </button>
        </div>
      )}
      <form
        className="agents-composer"
        onSubmit={event => {
          event.preventDefault();
          void send();
        }}
      >
        <label className="agent-message-input">
          <span className="agent-sr-only">消息</span>
          <textarea
            aria-label={session.kind === 'debug' ? '调试消息' : '聊天消息'}
            value={question}
            disabled={busy || stopping || loading}
            onChange={event => setQuestion(event.target.value)}
            placeholder={
              session.kind === 'debug'
                ? '发送消息，测试你的 Agent…'
                : '发送消息…'
            }
            rows={2}
            onKeyDown={event => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void send();
              }
            }}
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
                  disabled={busy || stopping || uploading}
                  onClick={() =>
                    setFiles(current =>
                      current.filter(item => item.id !== file.id)
                    )
                  }
                >
                  <CloseOutlined />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="agents-actions agent-composer-actions">
          <input
            ref={fileInput}
            className="agents-file-input"
            type="file"
            accept=".txt,.md,.csv,.json,.pdf,.docx"
            multiple
            disabled={busy || stopping || uploading}
            onChange={event => void upload(event.target.files)}
          />
          <Button
            type="text"
            icon={<PaperClipOutlined />}
            aria-label="添加文件"
            title="添加文件"
            loading={uploading}
            disabled={busy || stopping || uploading}
            onClick={() => fileInput.current?.click()}
          />
          {busy || stopping || running ? (
            <button
              className="danger"
              type="button"
              disabled={
                stopping ||
                (!runId.current &&
                  !runs.some(
                    run =>
                      run.status === 'running' && !run.id.startsWith('pending-')
                  ))
              }
              onClick={() => void stop()}
            >
              <StopOutlined />{' '}
              <span>{stopping ? '正在停止…' : '停止生成'}</span>
            </button>
          ) : (
            <button
              className="primary agent-send-button"
              aria-label="发送消息"
              title="发送消息"
              type="submit"
              disabled={
                loading ||
                !historyLoaded ||
                uploading ||
                running ||
                !question.trim()
              }
            >
              <ArrowUpOutlined />
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
  onGuardChange,
  embedded = false,
  standalone = false,
}: {
  agent: AgentDefinition;
  kind: AgentKind;
  embedded?: boolean;
  standalone?: boolean;
  onGuardChange: (reason: string) => void;
}) {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selected, setSelected] = useState<AgentSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AgentSession | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionGuard, setSessionGuard] = useState('');
  const [pendingChange, setPendingChange] = useState<(() => void) | null>(null);
  const submitting = useRef(false);
  const [revision, setRevision] = useState(0);
  const [messageRevision, setMessageRevision] = useState(0);
  const [refreshDisabled, setRefreshDisabled] = useState(true);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    let active = true;
    setLoading(true);
    setError('');
    listAgentSessions(agent.id, kind)
      .then(result => {
        if (active) {
          setSessions(result);
          setSelected(current => current || result[0] || null);
        }
      })
      .catch(reason => {
        if (active) setError(errorText(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      alive.current = false;
    };
  }, [agent.id, kind, revision]);
  useEffect(() => {
    onGuardChange(sessionGuard);
    return () => onGuardChange('');
  }, [onGuardChange, sessionGuard]);
  const requestChange = (action: () => void) => {
    if (sessionGuard) setPendingChange(() => action);
    else action();
  };
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
        setShowHistory(false);
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
    <div
      className={`agents-chat-layout${embedded ? ' agents-chat-embedded' : ''}${standalone ? ' agents-chat-standalone' : ''}`}
    >
      <div className="agent-preview-toolbar">
        <div className="agent-chat-identity">
          {standalone && (
            <img className="agent-chat-avatar" src={agentAvatar} alt="" />
          )}
          {!standalone && (
            <img className="agent-debug-icon" src={agentDebugIcon} alt="" />
          )}
          <h2 title={agent.botName}>
            {standalone ? agent.botName : '调试与预览'}
          </h2>
        </div>
        <Button
          type="text"
          icon={<HistoryOutlined />}
          aria-label="会话历史"
          title="会话历史"
          aria-expanded={showHistory}
          onClick={() => setShowHistory(value => !value)}
        />
        <Button
          type="text"
          icon={<PlusOutlined />}
          disabled={busy || loading}
          onClick={() => requestChange(() => void create())}
        >
          新对话
        </Button>
      </div>
      <Drawer
        title="会话历史"
        placement="right"
        width={320}
        open={showHistory}
        onClose={() => setShowHistory(false)}
        rootClassName="agent-history-drawer"
      >
        <aside className="agents-session-list">
          <div className="agent-history-actions">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              disabled={
                busy || loading || (Boolean(selected) && refreshDisabled)
              }
              onClick={() => {
                setRevision(value => value + 1);
                setMessageRevision(value => value + 1);
              }}
            >
              刷新历史
            </Button>
          </div>
          {error && (
            <Alert
              type="error"
              showIcon
              message={error}
              action={
                <Button
                  disabled={busy || loading}
                  onClick={() => setRevision(value => value + 1)}
                >
                  重试读取会话
                </Button>
              }
            />
          )}
          <button
            className="primary"
            disabled={busy || loading}
            onClick={() => requestChange(() => void create())}
          >
            新建{kind === 'debug' ? '调试' : '聊天'}会话
          </button>
          {loading && <Skeleton active paragraph={{ rows: 3 }} />}
          {!loading && !error && !sessions.length && (
            <p className="agents-muted">还没有会话，点击上方按钮开始。</p>
          )}
          {sessions.map(session => (
            <div
              className={`agents-session ${selected?.id === session.id ? 'selected' : ''}`}
              key={session.id}
            >
              <button
                disabled={busy}
                aria-current={selected?.id === session.id ? 'true' : undefined}
                onClick={() => {
                  if (selected?.id !== session.id)
                    requestChange(() => {
                      setSelected(session);
                      setShowHistory(false);
                    });
                }}
              >
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
                <DeleteOutlined />
              </button>
            </div>
          ))}
        </aside>
      </Drawer>
      <div className="agents-chat-main">
        {loading && !selected && <Skeleton active paragraph={{ rows: 4 }} />}
        {error && (
          <div role="alert" className="agents-error agents-error-action">
            <span>{error}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => setRevision(value => value + 1)}
            >
              重试读取会话
            </button>
          </div>
        )}
        {selected ? (
          <SessionMessages
            key={selected.id}
            agent={agent}
            session={selected}
            onChanged={() => setRevision(value => value + 1)}
            onGuardChange={setSessionGuard}
            refreshRevision={messageRevision}
            onRefreshStateChange={setRefreshDisabled}
          />
        ) : (
          !loading &&
          !error && (
            <div className="agents-empty">
              {embedded || standalone ? (
                <>
                  <img
                    src={agentAvatar}
                    alt=""
                    className="agent-preview-empty-avatar"
                  />
                  <h3>
                    {kind === 'debug'
                      ? '开始调试你的 Agent'
                      : '开始与 Agent 对话'}
                  </h3>
                  <p>
                    {kind === 'debug'
                      ? '创建会话，测试提示词、工具调用与知识检索。'
                      : '发送一条消息，开始使用这个 Agent。'}
                  </p>
                  <button
                    className="primary"
                    disabled={busy || loading}
                    onClick={() => requestChange(() => void create())}
                  >
                    <PlusOutlined /> 新建{kind === 'debug' ? '调试' : '聊天'}
                    会话
                  </button>
                </>
              ) : (
                '创建或选择一个会话。调试与聊天的历史分别保存。'
              )}
            </div>
          )
        )}
      </div>
      <Modal
        title="离开当前会话？"
        open={pendingChange !== null}
        okText="继续切换"
        cancelText="留在会话"
        onCancel={() => setPendingChange(null)}
        onOk={() => {
          const action = pendingChange;
          setPendingChange(null);
          action?.();
        }}
      >
        <p>{sessionGuard}</p>
      </Modal>
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
        {deleteTarget?.id === selected?.id && sessionGuard && (
          <p>{sessionGuard}</p>
        )}
        {error && (
          <p role="alert" className="agents-error">
            {error}
          </p>
        )}
      </Modal>
    </div>
  );
}
