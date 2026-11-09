import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  message,
} from 'antd';
import http, { downloadFileWithHeaders } from '@/utils/http';
import {
  listFlows,
  createFlowAPI,
  deleteFlowAPI,
  copyFlowAPI,
  workflowImport,
} from '@/services/flow';
import VirtualConfig, {
  type FormValues,
} from '@/components/virtual-config-modal';
import { createTalkAgent } from '@/services/spark-common';
import type { FlowType } from '@/components/workflow/types';
import { getFixedUrl } from '@/components/workflow/utils';
import {
  EllipsisOutlined,
  PlusOutlined,
  UploadOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import useSpaceStore from '@/store/space-store';
import workflowIcon from '@/assets/imgs/workflow/flow-icon.png';
import styles from '@/pages/agents/catalog.module.scss';
import { formatCatalogUpdatedAt } from '@/pages/agents/catalog-utils';

interface Template {
  id: string;
  templateId: string;
  title: string;
  subtitle?: string;
  deletable?: boolean;
}

export default function WorkflowList(): ReactElement {
  const navigate = useNavigate();
  const { spaceId, enterpriseId } = useSpaceStore();
  const importInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FlowType[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateError, setTemplateError] = useState('');
  const [templateRevision, setTemplateRevision] = useState(0);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingVirtual, setCreatingVirtual] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<FlowType | null>(null);
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    setItems([]);
    void listFlows({ page, pageSize: 20, search })
      .then(data => {
        if (!ignore) {
          const lastPage = Math.max(1, Math.ceil(data.totalCount / 20));
          if (page > lastPage) {
            setPage(lastPage);
            return;
          }
          setItems(data.pageData);
          setTotal(data.totalCount);
          setError('');
        }
      })
      .catch(() => {
        if (!ignore) setError('无法读取工作流，请重试。');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return (): void => {
      ignore = true;
    };
  }, [spaceId, enterpriseId, page, search, revision]);
  useEffect(() => {
    let ignore = false;
    setTemplateLoading(true);
    setTemplateError('');
    setTemplates([]);
    void http
      .post<unknown, Template[]>('/workflow/bot/templateList', {})
      .then(data => {
        if (!ignore) setTemplates(data);
      })
      .catch(() => {
        if (!ignore) setTemplateError('无法读取工作流模板，请重试。');
      })
      .finally(() => {
        if (!ignore) setTemplateLoading(false);
      });
    return (): void => {
      ignore = true;
    };
  }, [spaceId, enterpriseId, revision, templateRevision]);
  const action = async (task: () => Promise<unknown>): Promise<void> => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      await task();
      setRevision(value => value + 1);
    } catch {
      message.error('操作失败，请检查提示后重试。');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const createVirtualWorkflow = async (values: FormValues): Promise<void> => {
    const flow = await createTalkAgent(values);
    setCreatingVirtual(false);
    navigate(`/work_flow/${flow.maasId}/arrange?botId=${flow.botId}`);
  };
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1>工作流</h1>
            <p>编排任务与资源，在画布中构建和调试执行流程。</p>
          </div>
          <div className={`${styles.actions} ${styles.workflowHeaderActions}`}>
            <Button onClick={() => navigate('/management/release')}>
              发布管理
            </Button>
            <Button onClick={() => setCreatingVirtual(true)}>
              新建语音 / 虚拟人
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreating(true)}
            >
              新建工作流
            </Button>
          </div>
        </header>
        <nav className={styles.tabs} aria-label="应用类型">
          <Link to="/space/agent">Agent</Link>
          <Link
            to="/space/workflows"
            aria-current="page"
            className={styles.activeTab}
          >
            工作流
          </Link>
        </nav>
        <div className={styles.toolbar}>
          <div className={`${styles.actions} ${styles.searchActions}`}>
            <Input.Search
              className={styles.search}
              aria-label="搜索工作流"
              placeholder="搜索工作流名称"
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
              allowClear
            />
            <Button
              aria-label="刷新工作流"
              title="刷新工作流"
              icon={<ReloadOutlined />}
              disabled={loading}
              onClick={() => setRevision(value => value + 1)}
            />
          </div>
          <div className={styles.actions}>
            {!loading && !error && (
              <span className={styles.count}>{total} 个工作流</span>
            )}
            <Button
              icon={<UploadOutlined />}
              disabled={busy}
              onClick={() => importInput.current?.click()}
            >
              导入工作流
            </Button>
            <input
              ref={importInput}
              type="file"
              accept=".yaml,.yml,.json"
              hidden
              disabled={busy}
              onChange={event => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                const data = new FormData();
                data.append('file', file);
                void action(async () => {
                  await workflowImport(data);
                  message.success('工作流已导入，请在画布检查资源依赖。');
                });
              }}
            />
            <Button onClick={() => navigate('/resource/automation')}>
              定时自动化
            </Button>
          </div>
        </div>
        {error && (
          <Alert
            className={styles.notice}
            type="error"
            showIcon
            message={error}
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
        <Spin spinning={loading} tip="正在读取工作流…">
          <div className={styles.grid} aria-busy={loading}>
            {items.map(flow => (
              <article className={styles.card} key={flow.id}>
                <div className={styles.cardTop}>
                  <Link
                    className={styles.cardBody}
                    to={`/work_flow/${flow.id}/arrange`}
                  >
                    <Image
                      preview={false}
                      width={36}
                      height={36}
                      wrapperStyle={{ flexShrink: 0 }}
                      className={styles.avatar}
                      src={flow.avatarIcon || workflowIcon}
                      fallback={workflowIcon}
                      alt=""
                    />
                    <div className={styles.details}>
                      <h2 title={flow.name}>{flow.name}</h2>
                      <span className={styles.tag}>工作流</span>
                    </div>
                  </Link>
                </div>
                <p className={styles.description} title={flow.description}>
                  {flow.description || '尚未填写描述，可在画布中完善任务用途。'}
                </p>
                <div className={styles.resources}>
                  <span className={styles.resourceChip}>
                    <ApartmentOutlined /> 可视化编排
                  </span>
                </div>
                <div className={styles.footer}>
                  <div className={styles.cardMeta}>
                    <span className={styles.updated}>
                      {formatCatalogUpdatedAt(
                        flow.updateTime || flow.updated_at
                      ) || '工作流'}
                    </span>
                    <div className={styles.cardMenus}>
                      <Dropdown
                        trigger={['click']}
                        disabled={busy}
                        menu={{
                          items: [
                            {
                              key: 'statistics',
                              label: '运行统计',
                              onClick: () =>
                                navigate(`/work_flow/${flow.id}/overview`),
                            },
                            {
                              key: 'copy',
                              label: '复制',
                              onClick: () =>
                                void action(() => copyFlowAPI(flow.id || '')),
                            },
                            {
                              key: 'export',
                              label: '导出',
                              onClick: () =>
                                void action(async () =>
                                  downloadFileWithHeaders(
                                    getFixedUrl(`/workflow/export/${flow.id}`),
                                    `${flow.name}.yml`
                                  )
                                ),
                            },
                            {
                              key: 'template',
                              label: '保存为模板',
                              onClick: () =>
                                void action(async () => {
                                  await http.post(
                                    '/workflow/bot/exportTemplate',
                                    {
                                      workflowId: flow.id,
                                    }
                                  );
                                  message.success('模板已保存');
                                }),
                            },
                            { type: 'divider' },
                            {
                              key: 'delete',
                              label: '删除',
                              danger: true,
                              onClick: () => setDeleteTarget(flow),
                            },
                          ],
                        }}
                      >
                        <Button
                          aria-label={`${flow.name} 更多操作`}
                          icon={<EllipsisOutlined />}
                        />
                      </Dropdown>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <Button
                      type="text"
                      onClick={() => navigate(`/work_flow/${flow.id}/arrange`)}
                    >
                      打开画布
                    </Button>
                    <Button
                      type="link"
                      disabled={busy}
                      onClick={() =>
                        void action(async () => {
                          await http.post('/publish/workflows/bind', {
                            workflowId: flow.id,
                          });
                          navigate('/management/release');
                        })
                      }
                    >
                      发布与分享 <ArrowRightOutlined />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {loading && (
            <div
              className={styles.state}
              role="status"
              aria-label="正在读取工作流"
            />
          )}
          {!loading && !items.length && !error && (
            <div className={styles.state}>
              <Empty
                description={
                  search
                    ? '未找到匹配的工作流'
                    : '还没有工作流，创建一个开始编排任务'
                }
              >
                {search ? (
                  <Button
                    onClick={() => {
                      setSearch('');
                      setSearchInput('');
                      setPage(1);
                    }}
                  >
                    清除搜索
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreating(true)}
                  >
                    新建工作流
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
            total={total}
            pageSize={20}
            showSizeChanger={false}
            onChange={setPage}
          />
        )}
        <h2 className={styles.sectionTitle}>从模板开始</h2>
        {templateError && (
          <Alert
            className={styles.notice}
            type="warning"
            showIcon
            message={templateError}
            action={
              <Button
                size="small"
                onClick={() => setTemplateRevision(value => value + 1)}
              >
                重试模板
              </Button>
            }
          />
        )}
        <Spin spinning={templateLoading} tip="正在读取模板…">
          <div className={styles.grid} aria-busy={templateLoading}>
            {templates.map(template => (
              <article className={styles.card} key={template.id}>
                <div className={styles.cardBody}>
                  <img className={styles.avatar} src={workflowIcon} alt="" />
                  <div className={styles.details}>
                    <h3 title={template.title}>{template.title}</h3>
                    <span className={styles.tag}>工作流模板</span>
                  </div>
                </div>
                <p className={styles.description} title={template.subtitle}>
                  {template.subtitle ||
                    '使用此模板创建工作流，再按需求调整节点与资源。'}
                </p>
                <div className={styles.footer}>
                  <span className={styles.updated}>创建后可自由编辑</span>
                  <div className={styles.cardActions}>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void action(async () => {
                          const flow = await http.post<unknown, FlowType>(
                            '/workflow/bot/createFromTemplate',
                            { templateId: template.templateId || template.id }
                          );
                          navigate(`/work_flow/${flow.id}/arrange`);
                        })
                      }
                    >
                      从模板创建
                    </Button>
                    {template.deletable && (
                      <Button
                        danger
                        disabled={busy}
                        onClick={() =>
                          Modal.confirm({
                            title: '删除工作流模板',
                            content: `删除“${template.title}”？`,
                            okText: '删除',
                            cancelText: '取消',
                            okButtonProps: { danger: true },
                            onOk: () =>
                              action(() =>
                                http.delete(
                                  `/workflow/bot/template/${template.id}`
                                )
                              ),
                          })
                        }
                      >
                        删除模板
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {templateLoading && (
            <div
              className={styles.state}
              role="status"
              aria-label="正在读取模板"
            />
          )}
          {!templateLoading && !templateError && !templates.length && (
            <Empty
              description="暂无工作流模板，可将已有工作流保存为模板"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Spin>
      </div>
      {creatingVirtual && (
        <VirtualConfig
          visible={creatingVirtual}
          onSubmit={createVirtualWorkflow}
          onCancel={() => setCreatingVirtual(false)}
        />
      )}
      <Modal
        title="新建工作流"
        open={creating}
        confirmLoading={busy}
        okText="创建并打开画布"
        cancelText="取消"
        okButtonProps={{ disabled: !name.trim() }}
        closable={!busy}
        keyboard={!busy}
        maskClosable={!busy}
        onCancel={() => {
          if (!busy) setCreating(false);
        }}
        onOk={() =>
          void action(async () => {
            if (!name.trim()) {
              message.error('请输入名称');
              return;
            }
            const flow = (await createFlowAPI({
              name: name.trim(),
              description,
            })) as FlowType;
            setCreating(false);
            navigate(`/work_flow/${flow.id}/arrange`);
          })
        }
      >
        <div className={styles.form}>
          <label>
            名称
            <Input
              aria-label="工作流名称"
              value={name}
              maxLength={255}
              onChange={event => setName(event.target.value)}
            />
          </label>
          <label>
            描述
            <Input.TextArea
              aria-label="工作流描述"
              value={description}
              maxLength={512}
              onChange={event => setDescription(event.target.value)}
            />
          </label>
        </div>
      </Modal>
      <Modal
        title="删除工作流"
        open={!!deleteTarget}
        confirmLoading={busy}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        cancelButtonProps={{ disabled: busy }}
        closable={!busy}
        keyboard={!busy}
        maskClosable={!busy}
        onCancel={() => {
          if (!busy) setDeleteTarget(null);
        }}
        onOk={() =>
          void action(async () => {
            if (deleteTarget?.id) await deleteFlowAPI(Number(deleteTarget.id));
            setDeleteTarget(null);
          })
        }
      >
        删除工作流“{deleteTarget?.name}”？删除后无法继续编辑此工作流。
      </Modal>
    </main>
  );
}
