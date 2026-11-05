import { useEffect, useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Modal, Pagination, message } from 'antd';
import http, { downloadFileWithHeaders } from '@/utils/http';
import {
  listFlows,
  createFlowAPI,
  deleteFlowAPI,
  copyFlowAPI,
  workflowImport,
} from '@/services/flow';
import type { FlowType } from '@/components/workflow/types';
import { getFixedUrl } from '@/components/workflow/utils';
import '@/pages/agents/style.css';

interface Template {
  id: string;
  templateId: string;
  title: string;
  subtitle?: string;
  deletable?: boolean;
}

export default function WorkflowList(): ReactElement {
  const navigate = useNavigate();
  const [items, setItems] = useState<FlowType[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<FlowType | null>(null);
  useEffect(() => {
    let ignore = false;
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
      });
    return () => {
      ignore = true;
    };
  }, [page, search, revision]);
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
  }, [revision]);
  const action = async (task: () => Promise<unknown>): Promise<void> => {
    setBusy(true);
    try {
      await task();
      setRevision(value => value + 1);
    } catch {
      message.error('操作失败，请检查提示后重试。');
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="agents-page">
      <header className="agents-header">
        <div>
          <h1>工作流</h1>
          <p>管理画布、版本与运行，复用已发布的独立 Agent。</p>
        </div>
        <Link to="/management/release">发布管理</Link>
        <Button type="primary" onClick={() => setCreating(true)}>
          新建工作流
        </Button>
      </header>
      <div className="agents-toolbar">
        <Input.Search
          aria-label="搜索工作流"
          placeholder="搜索工作流"
          onSearch={value => {
            setSearch(value);
            setPage(1);
          }}
          allowClear
        />
        <label className="button">
          导入工作流
          <input
            type="file"
            accept=".yaml,.yml,.json"
            className="hidden"
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
        </label>
        <Link className="button" to="/resource/automation">
          定时自动化
        </Link>
      </div>
      {error && (
        <p role="alert" className="agents-error">
          {error}
          <Button onClick={() => setRevision(value => value + 1)}>重试</Button>
        </p>
      )}
      <div className="agents-grid">
        {items.map(flow => (
          <article className="agents-card" key={flow.id}>
            <h2>{flow.name}</h2>
            <p>{flow.description || '尚未填写描述'}</p>
            <div className="agents-actions">
              <Link className="button" to={`/work_flow/${flow.id}/arrange`}>
                打开画布
              </Link>
              <Link className="button" to={`/work_flow/${flow.id}/overview`}>
                运行统计
              </Link>
              <Button
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await copyFlowAPI(flow.id || '');
                  })
                }
              >
                复制
              </Button>
              <Button
                onClick={() =>
                  void downloadFileWithHeaders(
                    getFixedUrl(`/workflow/export/${flow.id}`),
                    `${flow.name}.yml`
                  )
                }
              >
                导出
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await http.post('/workflow/bot/exportTemplate', {
                      workflowId: flow.id,
                    });
                    message.success('模板已保存');
                  })
                }
              >
                保存为模板
              </Button>
              <Button danger onClick={() => setDeleteTarget(flow)}>
                删除
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
            </div>
          </article>
        ))}
      </div>
      {!items.length && !error && (
        <p className="agents-empty">没有工作流，可以新建或从模板创建。</p>
      )}
      <Pagination
        current={page}
        total={total}
        pageSize={20}
        showSizeChanger={false}
        onChange={setPage}
      />
      <h2 className="mt-8 mb-4 text-xl font-semibold">工作流模板</h2>
      <div className="agents-grid">
        {templates.map(template => (
          <article className="agents-card" key={template.id}>
            <h3>{template.title}</h3>
            <p>{template.subtitle}</p>
            <div className="agents-actions">
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
                    void action(() =>
                      http.delete(`/workflow/bot/template/${template.id}`)
                    )
                  }
                >
                  删除模板
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
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
