import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dropdown,
  Empty,
  Image,
  Input,
  Modal,
  Pagination,
  Spin,
} from 'antd';
import {
  EllipsisOutlined,
  PlusOutlined,
  StarFilled,
  StarOutlined,
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

export default function AgentList() {
  const { spaceId, enterpriseId } = useSpaceStore();
  const navigate = useNavigate();
  const [items, setItems] = useState<AgentDefinition[]>([]);
  const [search, setSearch] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
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
    return () => {
      active = false;
    };
  }, [spaceId, enterpriseId, page, search, favorite, revision]);
  const action = async (operation: () => Promise<unknown>) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await operation();
      setRevision(value => value + 1);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const create = () => {
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
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1>独立 Agent</h1>
          <div className={styles.actions}>
            <Button onClick={() => navigate('/store/agent')}>Agent 市场</Button>
            <Button onClick={() => navigate('/management/release')}>
              发布管理
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreating(true)}
            >
              创建 Agent
            </Button>
          </div>
        </header>
        <div className={styles.toolbar}>
          <div className={styles.actions}>
            <Checkbox
              checked={favorite}
              onChange={event => {
                setFavorite(event.target.checked);
                setPage(1);
              }}
            >
              只看收藏
            </Checkbox>
            <span className={styles.count}>{total} 个 Agent</span>
          </div>
          <div className={styles.actions}>
            <Input.Search
              className={styles.search}
              aria-label="搜索 Agent"
              placeholder="搜索名称"
              allowClear
              onSearch={value => {
                setSearch(value);
                setPage(1);
              }}
            />
            <Button onClick={() => setRevision(value => value + 1)}>
              刷新
            </Button>
          </div>
        </div>
        {error && (
          <Alert
            className={styles.notice}
            type="error"
            showIcon
            message={error}
          />
        )}
        <Spin spinning={loading}>
          <div className={styles.grid}>
            {items.map(agent => (
              <article className={styles.card} key={agent.id}>
                <Link
                  className={styles.cardBody}
                  to={`/space/config/${agent.id}/base`}
                >
                  <Image
                    preview={false}
                    width={64}
                    height={64}
                    wrapperStyle={{ flexShrink: 0 }}
                    className={styles.avatar}
                    src={agent.avatar || botIcon}
                    fallback={botIcon}
                    alt=""
                  />
                  <div className={styles.details}>
                    <h2 title={agent.botName}>{agent.botName}</h2>
                    <p title={agent.botDesc}>
                      {agent.botDesc || '尚未填写描述'}
                    </p>
                  </div>
                </Link>
                <div className={styles.footer}>
                  <span className={styles.tag}>提示词</span>
                  <div className={styles.actions}>
                    <Button
                      aria-label={
                        agent.favorite
                          ? `取消收藏 ${agent.botName}`
                          : `收藏 ${agent.botName}`
                      }
                      title={agent.favorite ? '取消收藏' : '收藏'}
                      icon={agent.favorite ? <StarFilled /> : <StarOutlined />}
                      disabled={busy}
                      onClick={() =>
                        void action(() =>
                          favoriteAgent(agent.id, !agent.favorite)
                        )
                      }
                    />
                    <Button
                      onClick={() => navigate(`/space/bot/${agent.id}/chat`)}
                    >
                      聊天
                    </Button>
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
                            onClick: () => {
                              setError('');
                              setDeleteTarget(agent);
                            },
                          },
                        ],
                      }}
                    >
                      <Button
                        aria-label={`${agent.botName} 更多操作`}
                        icon={<EllipsisOutlined />}
                      />
                    </Dropdown>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!loading && !items.length && !error && (
            <Empty
              description={
                favorite
                  ? '暂无收藏的 Agent'
                  : '暂无 Agent，创建后即可选择已有模型进行调试'
              }
            />
          )}
        </Spin>
        <Pagination
          className={styles.pagination}
          current={page}
          pageSize={20}
          total={total}
          showSizeChanger={false}
          onChange={setPage}
        />
      </div>
      <Modal
        title="创建提示词 Agent"
        open={creating}
        okText="创建并配置"
        cancelText="取消"
        confirmLoading={busy}
        okButtonProps={{ disabled: !name.trim() }}
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
          {error && <Alert type="error" message={error} />}
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
        {error && <Alert type="error" message={error} />}
      </Modal>
    </main>
  );
}
