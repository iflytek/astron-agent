import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Modal, Select, Skeleton, Tabs } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
  useBlocker,
} from 'react-router-dom';
import useSpaceStore from '@/store/space-store';
import useUserStore from '@/store/user-store';
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
  onGuardChange,
}: {
  agentId: number;
  agentName: string;
  onGuardChange: (reason: string) => void;
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
  const [configRevision, setConfigRevision] = useState(0);
  const [savedConfig, setSavedConfig] = useState('');
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState('');
  useEffect(() => {
    let active = true;
    getAgentMemoryConfig(agentId)
      .then(value => {
        if (active) {
          setConfig(value);
          setSavedConfig(JSON.stringify(value));
        }
      })
      .catch(reason => {
        if (active) setError(errorText(reason));
      });
    return () => {
      active = false;
    };
  }, [agentId, configRevision]);
  useEffect(() => {
    let active = true;
    setLoadingItems(true);
    setItemsError('');
    listAgentMemories(agentId)
      .then(value => {
        if (active) setItems(value);
      })
      .catch(reason => {
        if (active) setItemsError(errorText(reason));
      })
      .finally(() => {
        if (active) setLoadingItems(false);
      });
    return () => {
      active = false;
    };
  }, [agentId, revision]);
  useEffect(() => {
    onGuardChange(
      (config && JSON.stringify(config) !== savedConfig) ||
        apiKey ||
        memory.trim()
        ? '长期记忆配置或个人偏好尚未保存，离开后会丢失。'
        : ''
    );
    return () => onGuardChange('');
  }, [config, savedConfig, apiKey, memory, onGuardChange]);
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
      {!config &&
        (error ? (
          <Button
            onClick={() => {
              setError('');
              setConfigRevision(value => value + 1);
            }}
          >
            重新读取记忆配置
          </Button>
        ) : (
          <Skeleton active />
        ))}
      {config && (
        <form
          onSubmit={event => {
            event.preventDefault();
            void action(async () => {
              const saved = await saveAgentMemoryConfig(agentId, {
                provider: config.provider,
                enabled: config.enabled,
                autoSearch: config.autoSearch,
                searchTopK: config.searchTopK,
                minScore: config.minScore,
                ...(apiKey ? { apiKey } : {}),
              });
              setConfig(saved);
              setSavedConfig(JSON.stringify(saved));
              setApiKey('');
            });
          }}
        >
          <label className="inline">
            <input
              type="checkbox"
              disabled={busy}
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
              disabled={busy}
              autoComplete="new-password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
          </label>
          <label className="inline">
            <input
              type="checkbox"
              disabled={busy}
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
                disabled={busy}
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
                disabled={busy}
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
            disabled={busy}
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
      {itemsError && (
        <Alert
          type="error"
          message={itemsError}
          action={
            <Button onClick={() => setRevision(value => value + 1)}>
              重试读取记忆
            </Button>
          }
        />
      )}
      {loadingItems && <Skeleton active />}
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
      {!loadingItems && !itemsError && !items.length && (
        <p className="agents-muted">暂无记忆</p>
      )}
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
  disabled,
}: {
  title: string;
  value: number[];
  options: Array<{ id: number; name: string }>;
  onChange: (value: number[]) => void;
  disabled?: boolean;
}) {
  return (
    <label>
      {title}
      <Select
        aria-label={title}
        mode="multiple"
        disabled={disabled}
        allowClear
        optionFilterProp="label"
        value={value}
        placeholder={`选择${title}`}
        onChange={onChange}
        options={[
          ...options.map(option => ({ value: option.id, label: option.name })),
          ...value
            .filter(id => !options.some(option => option.id === id))
            .map(id => ({
              value: id,
              label: `已关联资源 #${id}（当前不可选）`,
            })),
        ]}
        notFoundContent="没有可选资源"
      />
      <small>搜索资源名称，可选择多个。</small>
    </label>
  );
}

const agentDraftSnapshot = (value: AgentDefinition | null) =>
  value
    ? JSON.stringify({
        botName: value.botName,
        botDesc: value.botDesc,
        prompt: value.prompt,
        modelId: value.modelId,
        supportContext: value.supportContext,
        supportUpload: value.supportUpload,
        personality: value.personality,
        tools: value.tools || [],
        skills: value.skills || [],
        mcpServerIds: value.mcpServerIds || [],
        repoIds: value.repoIds || [],
        workflows: value.workflows || [],
        maxLoopCount: value.maxLoopCount,
        promptType: value.promptType,
        promptSections: value.promptSections || [],
      })
    : '';

function Workspace({ id, mode }: { id: number; mode: 'edit' | 'chat' }) {
  const navigate = useNavigate();
  const spaceName = useSpaceStore(state => state.spaceName);
  const spaceType = useSpaceStore(state => state.spaceType);
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
  const [loadRevision, setLoadRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resourceError, setResourceError] = useState('');
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState('');
  const [versionsRevision, setVersionsRevision] = useState(0);
  const [contentGuard, setContentGuard] = useState('');
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const saving = useRef(false);
  const isDirty = useMemo(
    () =>
      mode === 'edit' &&
      (agentDraftSnapshot(agent) !== agentDraftSnapshot(draft) ||
        knowledgeChanged ||
        workflowsChanged ||
        toolsChanged ||
        skillsChanged ||
        mcpChanged),
    [
      agent,
      draft,
      mode,
      knowledgeChanged,
      workflowsChanged,
      toolsChanged,
      skillsChanged,
      mcpChanged,
    ]
  );
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      useUserStore.getState().getIsLogin() &&
      (isDirty || !!contentGuard) &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search)
  );
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
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
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, mode, loadRevision]);
  const [resourceRevision, setResourceRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setResourceError('');
    if (mode === 'edit')
      getAgentResources(id)
        .then(value => {
          if (active) setResources(value);
        })
        .catch(reason => {
          if (active) setResourceError(errorText(reason));
        });
    return () => {
      active = false;
    };
  }, [id, mode, resourceRevision]);
  useEffect(() => {
    let active = true;
    if (tab === 'versions') {
      setVersionsLoading(true);
      setVersionsError('');
      listAgentVersions(id)
        .then(value => {
          if (active) setVersions(value);
        })
        .catch(reason => {
          if (active) setVersionsError(errorText(reason));
        })
        .finally(() => {
          if (active) setVersionsLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [id, tab, versionsRevision]);
  useEffect(() => {
    if (!isDirty && !contentGuard) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!useUserStore.getState().getIsLogin()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, contentGuard]);
  const patch = (value: Partial<AgentDefinition>) =>
    setDraft(current => (current ? { ...current, ...value } : current));
  const save = async () => {
    if (!draft || saving.current) return;
    saving.current = true;
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
      saving.current = false;
      setBusy(false);
    }
  };
  const requestNavigation = (to: string) => {
    navigate(to);
  };
  const changeTab = (nextTab: string) => {
    if (nextTab !== tab && contentGuard) setPendingTab(nextTab);
    else setTab(nextTab);
  };
  return (
    <main className="agents-page">
      <header className="agents-header">
        <div>
          <button
            className="agents-back-link"
            type="button"
            onClick={() => requestNavigation('/space/agent')}
          >
            <ArrowLeftOutlined /> Agent 列表
          </button>
          <div className="agents-title-row">
            <div>
              <h1>{agent?.botName || 'Agent'}</h1>
            </div>
            {agent && (
              <span
                className={`agents-draft-state${isDirty ? ' is-dirty' : ''}`}
              >
                {isDirty ? '未保存修改' : '已同步'}
              </span>
            )}
          </div>
        </div>
        <div className="agents-actions">
          {mode === 'chat' ? (
            <button
              className="button"
              type="button"
              onClick={() => requestNavigation(`/space/config/${id}/base`)}
            >
              编辑与调试
            </button>
          ) : (
            <button
              className="button"
              type="button"
              onClick={() => requestNavigation(`/space/bot/${id}/chat`)}
            >
              开始聊天
            </button>
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
      {loading && <Skeleton active paragraph={{ rows: 6 }} />}
      {!agent && error && (
        <Button onClick={() => setLoadRevision(value => value + 1)}>
          重新读取 Agent
        </Button>
      )}
      {agent && (
        <>
          {isDirty && tab !== 'definition' && (
            <Alert
              type="warning"
              showIcon
              message="配置修改尚未保存；调试、聊天和版本快照使用上次保存的配置。"
              action={
                <Button onClick={() => changeTab('definition')}>
                  返回配置保存
                </Button>
              }
            />
          )}
          <div className="agents-context-bar">
            <span>
              {spaceName ||
                (spaceType === 'personal' ? '我的个人资源' : '当前空间')}{' '}
              / {mode === 'chat' ? '对话工作区' : '配置工作区'}
            </span>
            <span className="agents-context-divider">/</span>
            <span>{agent.botDesc || '为 Agent 配置行为、资源和运行方式'}</span>
          </div>
          <Tabs
            className="agents-tabs"
            activeKey={tab}
            onChange={changeTab}
            items={(mode === 'chat'
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
            ).map(([key, title]) => ({ key: key!, label: title }))}
          />
          {tab === 'definition' && draft && (
            <form
              className="agents-panel agents-definition-panel"
              onSubmit={event => {
                event.preventDefault();
                void save();
              }}
            >
              <fieldset disabled={busy} className="agents-definition-fields">
                <div className="agents-section-heading">
                  <h2>基础配置</h2>
                  <p>定义 Agent 的身份、模型和行为指令。</p>
                </div>
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
                      {draft.modelId &&
                        !resources?.models.some(
                          model => model.id === draft.modelId
                        ) && (
                          <option value={draft.modelId}>
                            {draft.model || `当前模型 #${draft.modelId}`}
                          </option>
                        )}
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
                      onChange={e =>
                        patch({ supportContext: e.target.checked })
                      }
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
                <div className="agents-section-heading">
                  <h2>关联资源</h2>
                  <p>配置可调用的工具、知识库、Skill 和 MCP 服务。</p>
                </div>
                {resourceError ? (
                  <Alert
                    type="error"
                    showIcon
                    message="资源列表读取失败，已有绑定保持不变。"
                    description={resourceError}
                    action={
                      <Button
                        onClick={() => setResourceRevision(value => value + 1)}
                      >
                        重试
                      </Button>
                    }
                  />
                ) : (
                  !resources && <Skeleton active paragraph={{ rows: 2 }} />
                )}
                {resources && (
                  <div className="agents-resource-grid">
                    <ResourceSelect
                      disabled={busy}
                      title="插件工具"
                      value={draft.tools || []}
                      options={resources.tools}
                      onChange={tools => {
                        patch({ tools });
                        setToolsChanged(true);
                      }}
                    />
                    <ResourceSelect
                      disabled={busy}
                      title="工作流工具"
                      value={draft.workflows || []}
                      options={resources.workflows || []}
                      onChange={workflows => {
                        patch({ workflows });
                        setWorkflowsChanged(true);
                      }}
                    />
                    <ResourceSelect
                      disabled={busy}
                      title="知识库"
                      value={draft.repoIds || []}
                      options={resources.repos}
                      onChange={repoIds => {
                        patch({ repoIds });
                        setKnowledgeChanged(true);
                      }}
                    />
                    <ResourceSelect
                      disabled={busy}
                      title="Skill"
                      value={draft.skills || []}
                      options={resources.skills}
                      onChange={skills => {
                        patch({ skills });
                        setSkillsChanged(true);
                      }}
                    />
                    <ResourceSelect
                      disabled={busy}
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
              </fieldset>
              <div className="agents-actions agents-save-bar">
                <button className="primary" disabled={busy} type="submit">
                  {busy ? '保存中…' : '保存草稿'}
                </button>
                <span className="agents-muted">
                  {isDirty
                    ? '保存后再开始调试，避免运行旧配置。'
                    : '当前草稿已保存。'}
                </span>
              </div>
            </form>
          )}
          {(tab === 'chat' || tab === 'debug') && (
            <Conversation
              key={tab}
              agent={agent}
              kind={tab}
              onGuardChange={setContentGuard}
            />
          )}
          {tab === 'memory' && (
            <Memory
              agentId={id}
              agentName={agent.botName}
              onGuardChange={setContentGuard}
            />
          )}
          {tab === 'versions' && (
            <section className="agents-panel">
              <h2>不可变版本快照</h2>
              <p>快照保存已保存的草稿内容，创建后不可修改。</p>
              <button
                disabled={busy || isDirty || versionsLoading}
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
              {versionsError && (
                <Alert
                  type="error"
                  showIcon
                  message={versionsError}
                  action={
                    <Button
                      onClick={() => setVersionsRevision(value => value + 1)}
                    >
                      重试
                    </Button>
                  }
                />
              )}
              {versionsLoading ? (
                <Skeleton active />
              ) : versions.length ? (
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
                !versionsError && <p>暂无版本快照。保存配置后创建首个快照。</p>
              )}
            </section>
          )}
        </>
      )}
      <Modal
        title="切换工作区？"
        open={pendingTab !== null}
        okText="继续切换"
        cancelText="留在当前工作区"
        onCancel={() => setPendingTab(null)}
        onOk={() => {
          if (pendingTab) setTab(pendingTab);
          setPendingTab(null);
        }}
      >
        <p>{contentGuard}</p>
      </Modal>
      <Modal
        title="有未保存的修改"
        open={blocker.state === 'blocked'}
        okText="放弃修改并离开"
        cancelText="继续编辑"
        okButtonProps={{ danger: true, disabled: busy }}
        onOk={() => {
          if (blocker.state === 'blocked') blocker.proceed();
        }}
        onCancel={() => {
          if (blocker.state === 'blocked') blocker.reset();
        }}
      >
        {isDirty && (
          <p>离开后当前 Agent 草稿会丢失。继续编辑可保留这些修改。</p>
        )}
        {contentGuard && <p>{contentGuard}</p>}
      </Modal>
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
