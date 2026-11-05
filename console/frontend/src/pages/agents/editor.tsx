import { useEffect, useRef, useState } from 'react';
import { Modal } from 'antd';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import useSpaceStore from '@/store/space-store';
import {
  getAgent,
  updateAgent,
  buildAgentResourceUpdate,
  getAgentResources,
  listAgentVersions,
  createAgentVersion,
  publishAgentVersion,
  getAgentMemoryConfig,
  saveAgentMemoryConfig,
  listAgentMemories,
  addAgentMemory,
  deleteAgentMemory,
  type AgentDefinition,
  type AgentResourceOptions,
  type AgentMemoryConfig,
  type AgentMemoryItem,
} from '@/services/agents';
import Conversation from './conversation';
import { errorText } from './errors';
import './style.css';

function Memory({
  agentId,
  agentName,
}: {
  agentId: number;
  agentName: string;
}) {
  const [config, setConfig] = useState<AgentMemoryConfig | null>(null);
  const [items, setItems] = useState<AgentMemoryItem[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [memory, setMemory] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: 'one'; item: AgentMemoryItem } | { kind: 'all' } | null
  >(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    getAgentMemoryConfig(agentId)
      .then(value => {
        if (active) setConfig(value);
      })
      .catch(reason => {
        if (active) setError(errorText(reason));
      });
    listAgentMemories(agentId)
      .then(value => {
        if (active) setItems(value);
      })
      .catch(reason => {
        if (active) setError(errorText(reason));
      });
    return () => {
      active = false;
    };
  }, [agentId, revision]);
  const action = async (fn: () => Promise<unknown>) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await fn();
      setRevision(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="agents-panel">
      <h2>长期记忆</h2>
      <p>
        记忆按当前空间、用户和 Agent
        保存，版本变化不会分割记忆。聊天与调试会话历史分别保存。
      </p>
      {error && (
        <p className="agents-error" role="alert">
          {error}
        </p>
      )}
      {config && (
        <form
          onSubmit={event => {
            event.preventDefault();
            void action(async () => {
              setConfig(
                await saveAgentMemoryConfig(agentId, {
                  provider: config.provider,
                  enabled: config.enabled,
                  autoSearch: config.autoSearch,
                  searchTopK: config.searchTopK,
                  minScore: config.minScore,
                  ...(apiKey ? { apiKey } : {}),
                })
              );
              setApiKey('');
            });
          }}
        >
          <label className="inline">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={e =>
                setConfig({ ...config, enabled: e.target.checked })
              }
            />
            启用 Mem0
          </label>
          <label>
            Mem0 API Key{' '}
            {config.hasApiKey && <small>（已配置，留空保留）</small>}
            <input
              type="password"
              autoComplete="new-password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
          </label>
          <label className="inline">
            <input
              type="checkbox"
              checked={config.autoSearch}
              onChange={e =>
                setConfig({ ...config, autoSearch: e.target.checked })
              }
            />
            对话前检索记忆
          </label>
          <div className="agents-form-row">
            <label>
              检索数量
              <input
                type="number"
                min={1}
                max={20}
                value={config.searchTopK}
                onChange={e =>
                  setConfig({ ...config, searchTopK: Number(e.target.value) })
                }
              />
            </label>
            <label>
              最低相关分数
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={config.minScore}
                onChange={e =>
                  setConfig({ ...config, minScore: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <button disabled={busy} type="submit">
            保存记忆配置
          </button>
        </form>
      )}
      <form
        onSubmit={e => {
          e.preventDefault();
          void action(async () => {
            await addAgentMemory(agentId, memory);
            setMemory('');
          });
        }}
      >
        <label>
          添加个人偏好
          <textarea
            required
            value={memory}
            onChange={e => setMemory(e.target.value)}
          />
        </label>
        <button disabled={busy || !memory.trim()} type="submit">
          保存偏好
        </button>
      </form>
      <div className="agents-toolbar">
        <h3>已保存记忆</h3>
        <button disabled={busy} onClick={() => setRevision(value => value + 1)}>
          刷新
        </button>
        <button
          className="danger"
          disabled={busy || !items.length}
          onClick={() => {
            setError('');
            setDeleteTarget({ kind: 'all' });
          }}
        >
          清空记忆
        </button>
      </div>
      {items.map(item => (
        <div className="agents-memory" key={item.id}>
          <p>{item.memory}</p>
          <button
            disabled={busy}
            onClick={() => {
              setError('');
              setDeleteTarget({ kind: 'one', item });
            }}
          >
            删除
          </button>
        </div>
      ))}
      {!items.length && <p className="agents-muted">暂无记忆</p>}
      <Modal
        title={
          deleteTarget?.kind === 'all' ? '清空长期记忆' : '删除一条长期记忆'
        }
        open={deleteTarget !== null}
        okText={deleteTarget?.kind === 'all' ? '清空记忆' : '删除这条记忆'}
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
          if (!deleteTarget) return;
          void action(async () => {
            await deleteAgentMemory(
              agentId,
              deleteTarget.kind === 'one' ? deleteTarget.item.id : undefined
            );
            setDeleteTarget(null);
          });
        }}
      >
        <p>
          {deleteTarget?.kind === 'all'
            ? `清空当前用户在 Agent“${agentName}”下的全部长期记忆？`
            : `删除当前用户在 Agent“${agentName}”下的这条长期记忆？`}
        </p>
        {deleteTarget?.kind === 'one' && (
          <p
            style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}
          >
            {deleteTarget.item.memory}
          </p>
        )}
        {error && (
          <p role="alert" className="agents-error">
            {error}
          </p>
        )}
      </Modal>
    </section>
  );
}

function ResourceSelect({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: number[];
  options: Array<{ id: number; name: string }>;
  onChange: (value: number[]) => void;
}) {
  return (
    <label>
      {title}
      <select
        multiple
        value={value.map(String)}
        onChange={e =>
          onChange(
            Array.from(e.target.selectedOptions, option => Number(option.value))
          )
        }
      >
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <small>可按住 Ctrl / Command 多选。</small>
    </label>
  );
}

function Workspace({ id, mode }: { id: number; mode: 'edit' | 'chat' }) {
  const [agent, setAgent] = useState<AgentDefinition | null>(null);
  const [draft, setDraft] = useState<AgentDefinition | null>(null);
  const [knowledgeChanged, setKnowledgeChanged] = useState(false);
  const [workflowsChanged, setWorkflowsChanged] = useState(false);
  const [toolsChanged, setToolsChanged] = useState(false);
  const [skillsChanged, setSkillsChanged] = useState(false);
  const [mcpChanged, setMcpChanged] = useState(false);
  const [resources, setResources] = useState<AgentResourceOptions | null>(null);
  const [tab, setTab] = useState(mode === 'chat' ? 'chat' : 'definition');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [versions, setVersions] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    let active = true;
    getAgent(id)
      .then(value => {
        if (active) {
          setAgent(value);
          setDraft(value);
          setKnowledgeChanged(false);
          setWorkflowsChanged(false);
          setToolsChanged(false);
          setSkillsChanged(false);
          setMcpChanged(false);
        }
      })
      .catch(reason => {
        if (active) setError(errorText(reason));
      });
    if (mode === 'edit')
      getAgentResources(id)
        .then(value => {
          if (active) setResources(value);
        })
        .catch(reason => {
          if (active) setError(errorText(reason));
        });
    return () => {
      active = false;
    };
  }, [id, mode]);
  useEffect(() => {
    let active = true;
    if (tab === 'versions')
      listAgentVersions(id)
        .then(value => {
          if (active) setVersions(value);
        })
        .catch(reason => {
          if (active) setError(errorText(reason));
        });
    return () => {
      active = false;
    };
  }, [id, tab]);
  const patch = (value: Partial<AgentDefinition>) =>
    setDraft(current => (current ? { ...current, ...value } : current));
  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const saved = await updateAgent(id, {
        botName: draft.botName,
        botDesc: draft.botDesc,
        prompt: draft.prompt,
        modelId: draft.modelId,
        supportContext: draft.supportContext,
        supportUpload: draft.supportUpload,
        personality: draft.personality,
        ...buildAgentResourceUpdate(draft, {
          tools: toolsChanged,
          skills: skillsChanged,
          mcpServerIds: mcpChanged,
          repoIds: knowledgeChanged,
          workflows: workflowsChanged,
        }),
        maxLoopCount: draft.maxLoopCount,
        revision: draft.revision,
        promptType: draft.promptType,
        promptSections: draft.promptSections,
      });
      setAgent(saved);
      setDraft(saved);
      setKnowledgeChanged(false);
      setWorkflowsChanged(false);
      setToolsChanged(false);
      setSkillsChanged(false);
      setMcpChanged(false);
      setNotice('草稿已保存，后续调试和聊天使用此配置。');
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="agents-page">
      <header className="agents-header">
        <div>
          <Link to="/space/agent">← Agent 列表</Link>
          <h1>{agent?.botName || 'Agent'}</h1>
        </div>
        <div className="agents-actions">
          {mode === 'chat' ? (
            <Link className="button" to={`/space/config/${id}/base`}>
              编辑与调试
            </Link>
          ) : (
            <Link className="button" to={`/space/bot/${id}/chat`}>
              开始聊天
            </Link>
          )}
        </div>
      </header>
      {error && (
        <p className="agents-error" role="alert">
          {error}
        </p>
      )}
      {!!agent?.legacyDatasetIds?.length && (
        <p role="status" className="agents-notice">
          此 Agent 保留了 {agent.legacyDatasetIds.length}{' '}
          个旧知识数据集关联，尚未迁移，暂时无法运行或创建版本快照。请在定义中重新选择知识库并保存。修改名称等其他字段会保留旧关联。
        </p>
      )}
      {notice && (
        <p role="status" className="agents-notice">
          {notice}
        </p>
      )}
      {!agent && !error && <p>正在读取 Agent…</p>}
      {agent && (
        <>
          <nav className="agents-tabs">
            {(mode === 'chat'
              ? [
                  ['chat', '聊天'],
                  ['memory', '长期记忆'],
                ]
              : [
                  ['definition', '定义'],
                  ['debug', '调试'],
                  ['memory', '长期记忆'],
                  ['versions', '版本快照'],
                ]
            ).map(([key, title]) => (
              <button
                key={key}
                className={tab === key ? 'selected' : ''}
                onClick={() => setTab(key || 'definition')}
              >
                {title}
              </button>
            ))}
          </nav>
          {tab === 'definition' && draft && (
            <form
              className="agents-panel"
              onSubmit={event => {
                event.preventDefault();
                void save();
              }}
            >
              <div className="agents-form-row">
                <label>
                  名称
                  <input
                    required
                    maxLength={48}
                    value={draft.botName}
                    onChange={e => patch({ botName: e.target.value })}
                  />
                </label>
                <label>
                  模型
                  <select
                    required
                    value={draft.modelId || ''}
                    onChange={e => patch({ modelId: Number(e.target.value) })}
                  >
                    <option value="">请选择模型</option>
                    {resources?.models.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                        {model.provider ? ` · ${model.provider}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                描述
                <textarea
                  maxLength={255}
                  value={draft.botDesc || ''}
                  onChange={e => patch({ botDesc: e.target.value })}
                  rows={2}
                />
              </label>
              <label>
                系统指令
                <textarea
                  maxLength={2048}
                  value={draft.prompt || ''}
                  onChange={e => patch({ prompt: e.target.value })}
                  rows={9}
                />
              </label>
              <div className="agents-form-row">
                <label className="inline">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.supportContext)}
                    onChange={e => patch({ supportContext: e.target.checked })}
                  />
                  多轮上下文
                </label>
                <label className="inline">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.supportUpload)}
                    onChange={e => patch({ supportUpload: e.target.checked })}
                  />
                  文件输入
                </label>
                <label>
                  最大工具决策轮数
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={draft.maxLoopCount || 5}
                    onChange={e =>
                      patch({ maxLoopCount: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              {draft.promptType === 1 && (
                <fieldset>
                  <legend>结构化提示词</legend>
                  {draft.promptSections?.map((section, index) => (
                    <label key={index}>
                      {section.key}
                      <textarea
                        value={section.value}
                        maxLength={4000}
                        onChange={e =>
                          patch({
                            promptSections: draft.promptSections?.map(
                              (row, i) =>
                                i === index
                                  ? { ...row, value: e.target.value }
                                  : row
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                </fieldset>
              )}
              <fieldset>
                <legend>人格配置</legend>
                <label className="inline">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.personality?.enabled)}
                    onChange={e =>
                      patch({
                        personality: {
                          ...draft.personality,
                          enabled: e.target.checked,
                        },
                      })
                    }
                  />
                  启用人格
                </label>
                <label>
                  人格描述
                  <textarea
                    maxLength={1000}
                    value={draft.personality?.personality || ''}
                    onChange={e =>
                      patch({
                        personality: {
                          ...draft.personality,
                          personality: e.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label>
                  场景
                  <select
                    value={draft.personality?.sceneType || ''}
                    onChange={e =>
                      patch({
                        personality: {
                          ...draft.personality,
                          sceneType: Number(e.target.value) || undefined,
                        },
                      })
                    }
                  >
                    <option value="">通用</option>
                    <option value="1">陪伴</option>
                    <option value="2">陪练</option>
                  </select>
                </label>
                <label>
                  场景说明
                  <textarea
                    maxLength={1000}
                    value={draft.personality?.sceneInfo || ''}
                    onChange={e =>
                      patch({
                        personality: {
                          ...draft.personality,
                          sceneInfo: e.target.value,
                        },
                      })
                    }
                  />
                </label>
              </fieldset>
              {resources && (
                <div className="agents-form-row">
                  <ResourceSelect
                    title="插件工具"
                    value={draft.tools || []}
                    options={resources.tools}
                    onChange={tools => {
                      patch({ tools });
                      setToolsChanged(true);
                    }}
                  />
                  <ResourceSelect
                    title="工作流工具"
                    value={draft.workflows || []}
                    options={resources.workflows || []}
                    onChange={workflows => {
                      patch({ workflows });
                      setWorkflowsChanged(true);
                    }}
                  />
                  <ResourceSelect
                    title="知识库"
                    value={draft.repoIds || []}
                    options={resources.repos}
                    onChange={repoIds => {
                      patch({ repoIds });
                      setKnowledgeChanged(true);
                    }}
                  />
                  <ResourceSelect
                    title="Skill"
                    value={draft.skills || []}
                    options={resources.skills}
                    onChange={skills => {
                      patch({ skills });
                      setSkillsChanged(true);
                    }}
                  />
                  <ResourceSelect
                    title="MCP 服务"
                    value={draft.mcpServerIds || []}
                    options={resources.mcp}
                    onChange={mcpServerIds => {
                      patch({ mcpServerIds });
                      setMcpChanged(true);
                    }}
                  />
                </div>
              )}
              {!!draft.legacyDatasetIds?.length && knowledgeChanged && (
                <p className="agents-notice">
                  保存后将以当前知识库选择替换旧知识关联。
                </p>
              )}
              {(!!draft.configuredMcpCount ||
                !!draft.mcpServerIds.length ||
                mcpChanged) && (
                <div>
                  {!!draft.configuredMcpCount && !mcpChanged && (
                    <p className="agents-muted">
                      当前保留 {draft.configuredMcpCount} 个旧 MCP
                      绑定。重新选择 MCP
                      服务并保存会替换这些绑定；修改其他字段会保留它们。
                    </p>
                  )}
                  {mcpChanged && (
                    <p role="status" className="agents-notice">
                      {draft.mcpServerIds.length
                        ? '保存后将仅使用当前选择的 MCP 服务，不再使用旧绑定。'
                        : '保存后将清除全部 MCP 运行绑定，不再调用旧 MCP 服务。'}
                    </p>
                  )}
                  <div className="agents-actions">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        patch({ mcpServerIds: [] });
                        setMcpChanged(true);
                      }}
                    >
                      清除全部 MCP 绑定
                    </button>
                    {mcpChanged && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          patch({ mcpServerIds: agent.mcpServerIds });
                          setMcpChanged(false);
                        }}
                      >
                        撤销 MCP 修改
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="agents-actions">
                <button className="primary" disabled={busy} type="submit">
                  {busy ? '保存中…' : '保存草稿'}
                </button>
                <span className="agents-muted">修改后先保存，再开始调试。</span>
              </div>
            </form>
          )}
          {(tab === 'chat' || tab === 'debug') && (
            <Conversation key={tab} agent={agent} kind={tab} />
          )}
          {tab === 'memory' && (
            <Memory agentId={id} agentName={agent.botName} />
          )}
          {tab === 'versions' && (
            <section className="agents-panel">
              <h2>不可变版本快照</h2>
              <p>快照保存已保存的草稿内容，创建后不可修改。</p>
              <button
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError('');
                  void createAgentVersion(id)
                    .then(version => {
                      setVersions(current => [version, ...current]);
                      setNotice('版本快照已创建。');
                    })
                    .catch(reason => setError(errorText(reason)))
                    .finally(() => setBusy(false));
                }}
              >
                {busy ? '创建中…' : '创建版本快照'}
              </button>
              {versions.length ? (
                versions.map((version, index) => (
                  <details key={String(version.id || index)}>
                    <summary>
                      版本{' '}
                      {String(version.id || version.versionId || index + 1)}
                    </summary>
                    <button
                      disabled={busy}
                      onClick={() => {
                        setBusy(true);
                        setError('');
                        void publishAgentVersion(id, Number(version.id))
                          .then(result =>
                            setNotice(
                              result.approvalRequired
                                ? '已提交发布审批，审批通过后新运行生效。'
                                : `已将版本 ${version.id} 设为工作流引用版本，新运行生效。`
                            )
                          )
                          .catch(reason => setError(errorText(reason)))
                          .finally(() => setBusy(false));
                      }}
                    >
                      用于工作流引用
                    </button>
                    <pre>{JSON.stringify(version, null, 2)}</pre>
                  </details>
                ))
              ) : (
                <p>暂无版本快照</p>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

export default function AgentWorkspace({
  mode = 'edit',
}: {
  mode?: 'edit' | 'chat';
}) {
  const params = useParams();
  const [query] = useSearchParams();
  const { spaceId, enterpriseId } = useSpaceStore();
  const id = Number(params.id || params.botId || query.get('botId'));
  if (!Number.isSafeInteger(id) || id < 1)
    return (
      <main className="agents-page">
        <Link to="/space/agent">返回 Agent 列表</Link>
        <p role="alert">请选择一个 Agent。</p>
      </main>
    );
  return (
    <Workspace
      key={`${spaceId}:${enterpriseId}:${id}:${mode}`}
      id={id}
      mode={mode}
    />
  );
}
