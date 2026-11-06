import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Dropdown,
  Empty,
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
} from '@ant-design/icons';
import useSpaceStore from '@/store/space-store';
import workflowIcon from '@/assets/imgs/workflow/flow-icon.png';
import styles from '@/pages/agents/catalog.module.scss';

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
    setItems([]);
    void listFlows({ page, pageSize: 20, search })
      .then(data => {
        if (!ignore) {
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
    return () => {
      ignore = true;
    };
  }, [spaceId, enterpriseId, page, search, revision]);
  useEffect(() => {
    let ignore = false;
    void http
      .post<unknown, Template[]>('/workflow/bot/templateList', {})
      .then(data => {
        if (!ignore) setTemplates(data);
      })
      .catch(() => {
        if (!ignore) setError('无法读取工作流模板，请重试。');
      });
    return () => {
      ignore = true;
    };
  }, [spaceId, enterpriseId, revision]);
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
          <h1>工作流</h1>
          <div className={styles.actions}>
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
        <div className={styles.toolbar}>
          <span className={styles.count}>{total} 个工作流</span>
          <div className={styles.actions}>
            <Input.Search
              className={styles.search}
              aria-label="搜索工作流"
              placeholder="搜索工作流"
              onSearch={value => {
                setSearch(value);
                setPage(1);
              }}
              allowClear
            />
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
        <Spin spinning={loading}>
          <div className={styles.grid}>
            {items.map(flow => (
              <article className={styles.card} key={flow.id}>
                <Link
                  className={styles.cardBody}
                  to={`/work_flow/${flow.id}/arrange`}
                >
                  <img
                    className={styles.avatar}
                    src={flow.avatarIcon || workflowIcon}
                    alt=""
                  />
                  <div className={styles.details}>
                    <h2 title={flow.name}>{flow.name}</h2>
                    <p title={flow.description}>
                      {flow.description || '尚未填写描述'}
                    </p>
                  </div>
                </Link>
                <div className={styles.footer}>
                  <span className={styles.tag}>工作流</span>
                  <div className={styles.actions}>
                    <Button
                      onClick={() => navigate(`/work_flow/${flow.id}/arrange`)}
                    >
                      打开画布
                    </Button>
                    <Button
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
                      发布与分享
                    </Button>
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
                                  { workflowId: flow.id }
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
              </article>
            ))}
          </div>
          {!loading && !items.length && !error && (
            <Empty description="没有工作流，可以新建或从模板创建" />
          )}
        </Spin>
        <Pagination
          className={styles.pagination}
          current={page}
          total={total}
          pageSize={20}
          showSizeChanger={false}
          onChange={setPage}
        />
        <h2 className={styles.sectionTitle}>工作流模板</h2>
        <div className={styles.grid}>
          {templates.map(template => (
            <article className={styles.card} key={template.id}>
              <div className={styles.cardBody}>
                <img className={styles.avatar} src={workflowIcon} alt="" />
                <div className={styles.details}>
                  <h3 title={template.title}>{template.title}</h3>
                  <p title={template.subtitle}>{template.subtitle}</p>
                </div>
              </div>
              <div className={styles.footer}>
                <span className={styles.tag}>模板</span>
                <div className={styles.actions}>
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
        onCancel={() => setCreating(false)}
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
        onCancel={() => setDeleteTarget(null)}
        onOk={() =>
          void action(async () => {
            if (deleteTarget?.id) await deleteFlowAPI(Number(deleteTarget.id));
            setDeleteTarget(null);
          })
        }
      >
        删除“{deleteTarget?.name}”？历史数据将保留。
      </Modal>
    </main>
  );
}
