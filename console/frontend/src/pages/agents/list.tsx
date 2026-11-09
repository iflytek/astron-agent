import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  Alert,
  Button,
  Dropdown,
  Empty,
  Image,
  Input,
  Modal,
  Pagination,
  Spin,
} from 'antd';
import {
  ApiOutlined,
  ApartmentOutlined,
  ArrowRightOutlined,
  DatabaseOutlined,
  EllipsisOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  StarFilled,
  StarOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import useSpaceStore from '@/store/space-store';
import {
  createAgent,
  deleteAgent,
  favoriteAgent,
  listAgents,
  type AgentDefinition,
} from '@/services/agents';
import botIcon from '@/assets/imgs/main/bot-no.png';
import styles from './catalog.module.scss';
import { errorText } from './errors';
import { formatCatalogUpdatedAt } from './catalog-utils';

function ResourceSummary({ agent }: { agent: AgentDefinition }): ReactElement {
  const mcpCount =
    (agent.mcpServerIds?.length || 0) + (agent.configuredMcpCount || 0);
  const resources = [
    {
      label: agent.model || (agent.modelId ? '已配置模型' : '模型待配置'),
      icon: <DatabaseOutlined />,
    },
    ...(agent.tools?.length
      ? [{ label: `工具 ${agent.tools.length}`, icon: <ToolOutlined /> }]
      : []),
    ...(agent.repoIds?.length
      ? [
          {
            label: `知识库 ${agent.repoIds.length}`,
            icon: <FileTextOutlined />,
          },
        ]
      : []),
    ...(agent.skills?.length
      ? [{ label: `Skill ${agent.skills.length}`, icon: <FileTextOutlined /> }]
      : []),
    ...(mcpCount ? [{ label: `MCP ${mcpCount}`, icon: <ApiOutlined /> }] : []),
    ...(agent.workflows?.length
      ? [
          {
            label: `工作流 ${agent.workflows.length}`,
            icon: <ApartmentOutlined />,
          },
        ]
      : []),
    ...(agent.legacyDatasetIds?.length
      ? [
          {
            label: `旧知识 ${agent.legacyDatasetIds.length}`,
            icon: <FileTextOutlined />,
          },
        ]
      : []),
  ];
  return (
    <div className={styles.resources} aria-label="关联资源">
      <span className={styles.resourceLabel}>关联资源</span>
      {resources.map((resource, index) => (
        <span
          className={styles.resourceChip}
          key={`${index}-${resource.label}`}
          title={resource.label}
        >
          {resource.icon}
          {resource.label}
        </span>
      ))}
    </div>
  );
}

export default function AgentList(): ReactElement {
  const { spaceId, enterpriseId } = useSpaceStore();
  const navigate = useNavigate();
  const [items, setItems] = useState<AgentDefinition[]>([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [deleteTarget, setDeleteTarget] = useState<AgentDefinition | null>(
    null
  );
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    setItems([]);
    setLoading(true);
    listAgents({ search, favorite, page, pageSize: 20 })
      .then(data => {
        if (active) {
          const lastPage = Math.max(1, Math.ceil(data.total / 20));
          if (page > lastPage) {
            setPage(lastPage);
            return;
          }
          setItems(data.records);
          setTotal(data.total);
        }
      })
      .catch(reason => {
        if (active) setError(errorText(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return (): void => {
      active = false;
    };
  }, [spaceId, enterpriseId, page, search, favorite, revision]);

  const action = async (operation: () => Promise<unknown>): Promise<void> => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setActionError('');
    try {
      await operation();
      setRevision(value => value + 1);
    } catch (reason) {
      setActionError(errorText(reason));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const create = (): void => {
    if (!name.trim()) return;
    void action(async () => {
      const row = await createAgent({
        botName: name.trim(),
        botDesc: description,
        prompt: '',
        supportContext: true,
        supportUpload: true,
      });
      navigate(`/space/config/${row.id}/base`);
    });
  };
  const openCreate = (): void => {
    setActionError('');
    setCreating(true);
  };
  const clearFilters = (): void => {
    setSearch('');
    setSearchInput('');
    setFavorite(false);
    setPage(1);
  };

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1>Agent</h1>
            <p>连接模型、工具与知识，构建并调试你的智能应用。</p>
          </div>
          <div className={styles.actions}>
            <Button onClick={() => navigate('/store/agent')}>Agent 市场</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              创建 Agent
            </Button>
          </div>
        </header>
        <nav className={styles.tabs} aria-label="应用类型">
          <Link
            to="/space/agent"
            aria-current="page"
            className={styles.activeTab}
          >
            Agent
          </Link>
          <Link to="/space/workflows">工作流</Link>
        </nav>
        <div className={styles.toolbar}>
          <div className={styles.actions}>
            <Input.Search
              className={styles.search}
              aria-label="搜索 Agent"
              placeholder="搜索 Agent 名称"
              allowClear
              value={searchInput}
              onChange={event => {
                setSearchInput(event.target.value);
                if (!event.target.value) {
                  setSearch('');
                  setPage(1);
                }
              }}
              onSearch={value => {
                setSearch(value.trim());
                setPage(1);
              }}
            />
            <div
              className={styles.filters}
              role="group"
              aria-label="Agent 收藏筛选"
            >
              <Button
                type={!favorite ? 'text' : 'default'}
                aria-pressed={!favorite}
                onClick={() => {
                  setFavorite(false);
                  setPage(1);
                }}
              >
                全部
              </Button>
              <Button
                type={favorite ? 'text' : 'default'}
                aria-pressed={favorite}
                onClick={() => {
                  setFavorite(true);
                  setPage(1);
                }}
              >
                仅收藏
              </Button>
            </div>
            <Button
              icon={<ReloadOutlined />}
              aria-label="刷新 Agent"
              title="刷新 Agent"
              disabled={loading}
              onClick={() => setRevision(value => value + 1)}
            />
          </div>
          {!loading && !error && (
            <span className={styles.count}>{total} 个 Agent</span>
          )}
        </div>
        {error && (
          <Alert
            className={styles.notice}
            type="error"
            showIcon
            message="无法读取 Agent"
            description={error}
            action={
              <Button
                size="small"
                onClick={() => setRevision(value => value + 1)}
              >
                重试
              </Button>
            }
          />
        )}
        {actionError && !creating && !deleteTarget && (
          <Alert
            className={styles.notice}
            type="error"
            showIcon
            message={actionError}
          />
        )}
        <Spin spinning={loading} tip="正在读取 Agent…">
          <div className={styles.grid} aria-busy={loading}>
            {items.map(agent => (
              <article className={styles.card} key={agent.id}>
                <div className={styles.cardTop}>
                  <Link
                    className={styles.cardBody}
                    to={`/space/config/${agent.id}/base`}
                  >
                    <Image
                      preview={false}
                      width={36}
                      height={36}
                      wrapperStyle={{ flexShrink: 0 }}
                      className={styles.avatar}
                      src={agent.avatar || botIcon}
                      fallback={botIcon}
                      alt=""
                    />
                    <div className={styles.details}>
                      <h2 title={agent.botName}>{agent.botName}</h2>
                      <span className={styles.tag}>独立 Agent</span>
                    </div>
                  </Link>
                </div>
                <p className={styles.description} title={agent.botDesc}>
                  {agent.botDesc ||
                    '尚未填写描述，可在配置中完善 Agent 的用途。'}
                </p>
                <ResourceSummary agent={agent} />
                <div className={styles.footer}>
                  <div className={styles.cardMeta}>
                    <span className={styles.updated}>
                      {formatCatalogUpdatedAt(agent.updatedAt) || '独立 Agent'}
                    </span>
                    <div className={styles.cardMenus}>
                      <Button
                        type="text"
                        aria-label={
                          agent.favorite
                            ? `取消收藏 ${agent.botName}`
                            : `收藏 ${agent.botName}`
                        }
                        aria-pressed={!!agent.favorite}
                        title={agent.favorite ? '取消收藏' : '收藏'}
                        icon={
                          agent.favorite ? <StarFilled /> : <StarOutlined />
                        }
                        disabled={busy}
                        onClick={() =>
                          void action(() =>
                            favoriteAgent(agent.id, !agent.favorite)
                          )
                        }
                      />
                      <Dropdown
                        trigger={['click']}
                        disabled={busy}
                        menu={{
                          items: [
                            {
                              key: 'edit',
                              label: '编辑与调试',
                              onClick: () =>
                                navigate(`/space/config/${agent.id}/base`),
                            },
                            {
                              key: 'delete',
                              label: '删除',
                              danger: true,
                              onClick: (): void => {
                                setActionError('');
                                setDeleteTarget(agent);
                              },
                            },
                          ],
                        }}
                      >
                        <Button
                          type="text"
                          aria-label={`${agent.botName} 更多操作`}
                          icon={<EllipsisOutlined />}
                        />
                      </Dropdown>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <Link to={`/space/config/${agent.id}/base`}>
                      编辑与调试
                    </Link>
                    <Link to={`/space/bot/${agent.id}/chat`}>
                      开始对话 <ArrowRightOutlined />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {loading && (
            <div
              className={styles.state}
              role="status"
              aria-label="正在读取 Agent"
            />
          )}
          {!loading && !items.length && !error && (
            <div className={styles.state}>
              <Empty
                description={
                  search
                    ? '未找到匹配的 Agent'
                    : favorite
                      ? '还没有收藏的 Agent'
                      : '还没有 Agent，创建一个开始配置与调试'
                }
              >
                {search || favorite ? (
                  <Button onClick={clearFilters}>清除筛选</Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openCreate}
                  >
                    创建 Agent
                  </Button>
                )}
              </Empty>
            </div>
          )}
        </Spin>
        {!loading && !error && total > 0 && (
          <Pagination
            className={styles.pagination}
            current={page}
            pageSize={20}
            total={total}
            showSizeChanger={false}
            onChange={setPage}
          />
        )}
      </div>
      <Modal
        title="创建 Agent"
        open={creating}
        okText="创建并配置"
        cancelText="取消"
        confirmLoading={busy}
        okButtonProps={{ disabled: !name.trim() }}
        closable={!busy}
        keyboard={!busy}
        maskClosable={!busy}
        onCancel={() => {
          if (!busy) setCreating(false);
        }}
        onOk={create}
      >
        <form
          className={styles.form}
          onSubmit={event => {
            event.preventDefault();
            create();
          }}
        >
          <label>
            名称
            <Input
              required
              maxLength={48}
              value={name}
              onChange={event => setName(event.target.value)}
            />
          </label>
          <label>
            描述
            <Input.TextArea
              maxLength={255}
              value={description}
              onChange={event => setDescription(event.target.value)}
            />
          </label>
          {actionError && <Alert type="error" message={actionError} />}
        </form>
      </Modal>
      <Modal
        title="删除 Agent"
        open={deleteTarget !== null}
        okText="删除"
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
            await deleteAgent(deleteTarget.id);
            setDeleteTarget(null);
          });
        }}
      >
        <p>删除 Agent“{deleteTarget?.botName}”？</p>
        {actionError && <Alert type="error" message={actionError} />}
      </Modal>
    </main>
  );
}
