import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  Alert,
  Button,
  Modal,
  Empty,
  Input,
  Pagination,
  Skeleton,
  Tabs,
  Tag,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { listTools, listToolSquare } from '@/services/plugin';
import type { ToolItem } from '@/types/resource';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useFlowCommon } from '@/components/workflow/hooks/use-flow-common';
import {
  parseArguments,
  pretty,
} from '@/pages/resource-management/resource-tools/mcp-tools';
import http from '@/utils/http';
import useSpaceStore from '@/store/space-store';
import { httpTestTemplate } from '@/pages/resource-management/resource-tools/http-test-template';
import {
  httpCallFailure,
  resourceFailure,
} from '@/pages/resource-management/resource-tools/resource-errors';
import '@/pages/resource-management/resource-tools/style.css';
import { SchemaFields } from '@/pages/resource-management/resource-tools/schema-fields';
import { httpInputSchema } from '@/pages/resource-management/resource-tools/schema-form-model';

function toolParameters(value: string): string {
  try {
    return pretty(JSON.parse(value || '{}'));
  } catch {
    return '参数定义格式无效，请在工具管理中修复并发布新版本。';
  }
}

export default function AddPlugin(): ReactElement {
  const spaceId = useSpaceStore(state => state.spaceId);
  const enterpriseId = useSpaceStore(state => state.enterpriseId);
  const info = useFlowsManager(state => state.toolModalInfo);
  const setInfo = useFlowsManager(state => state.setToolModalInfo);
  const { handleAddToolNode, resetBeforeAndWillNode } = useFlowCommon();
  const [tab, setTab] = useState('mine');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<ToolItem | null>(null);
  const [input, setInput] = useState(() => httpTestTemplate().input);
  const [inputHint, setInputHint] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const debugFormRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!info.open) return;
    const token = ++request.current;
    setLoading(true);
    setBusy(false);
    setError('');
    setItems([]);
    setSelected(null);
    setResult('');
    const promise =
      tab === 'mine'
        ? listTools({ content: query, status: 1, pageNo: page, pageSize: 20 })
        : listToolSquare({ page, pageSize: 20, orderFlag: 0, content: query });
    void promise
      .then(data => {
        if (token === request.current) {
          setItems(data.pageData || data.records || []);
          setTotal(data.totalCount ?? data.total);
        }
      })
      .catch((reason: Error) => {
        if (token === request.current)
          setError(reason.message || '工具列表读取失败。');
      })
      .finally(() => {
        if (token === request.current) setLoading(false);
      });
    return () => {
      request.current += 1;
    };
  }, [info.open, tab, query, page, revision, spaceId, enterpriseId]);
  const close = (): void => {
    setInfo({ open: false });
    resetBeforeAndWillNode();
  };
  const debug = async (): Promise<void> => {
    if (!selected || busy || !debugFormRef.current?.reportValidity()) return;
    const token = request.current;
    setBusy(true);
    setError('');
    setResult('');
    try {
      const payload = parseArguments(input);
      const data = await http.post(
        `/resources/tools/${selected.id}/debug`,
        payload,
        { timeout: 300000 }
      );
      if (token === request.current) setResult(pretty(data));
    } catch (reason) {
      if (token === request.current)
        setError(resourceFailure(reason, httpCallFailure).description);
    } finally {
      if (token === request.current) setBusy(false);
    }
  };
  return (
    <Modal
      title="添加工具"
      open={info.open}
      onCancel={close}
      width="min(1180px, calc(100vw - 48px))"
      rootClassName="workflow-tools-modal"
      footer={null}
      style={{ top: 32 }}
      destroyOnClose
    >
      {selected ? (
        <section className="workflow-mcp-detail">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            disabled={busy}
            onClick={() => {
              setSelected(null);
              setResult('');
              setError('');
            }}
          >
            返回工具列表
          </Button>
          <div className="workflow-mcp-heading">
            <div>
              <h2>{selected.name}</h2>
              <p>{selected.description}</p>
              <Tag>{selected.version}</Tag>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={busy}
              onClick={() => handleAddToolNode(selected)}
            >
              添加到工作流
            </Button>
          </div>
          <details className="resource-tools-schema">
            <summary>查看输入与输出参数</summary>
            <pre>{toolParameters(selected.webSchema)}</pre>
          </details>
          {error && (
            <Alert
              type="error"
              showIcon
              message={httpCallFailure.title}
              description={error}
            />
          )}
          <form ref={debugFormRef} onSubmit={event => event.preventDefault()}>
            <SchemaFields
              key={`${spaceId}:${selected.id}:${selected.version}`}
              schema={httpInputSchema(selected)}
              value={input}
              onChange={setInput}
              disabled={busy}
            />
            <details className="resource-tools-schema">
              <summary>高级参数</summary>
              <label>
                参数原文
                <Input.TextArea
                  className="resource-tools-code"
                  disabled={busy}
                  value={input}
                  onChange={event => setInput(event.target.value)}
                />
              </label>
            </details>
          </form>
          <p className="resource-tools-section-note">
            {inputHint.replace(
              '修改后的 JSON 将按原样提交',
              '修改后按当前填写内容提交'
            )}
          </p>
          <Button type="primary" loading={busy} onClick={() => void debug()}>
            运行测试
          </Button>
          {result && (
            <section className="resource-tools-result">
              <h3>调用结果</h3>
              <pre tabIndex={0}>{result}</pre>
            </section>
          )}
        </section>
      ) : (
        <>
          <p className="resource-tools-section-note">
            使用已发布的 HTTP 工具。内置能力先添加到当前空间，再刷新此目录。
          </p>
          <Tabs
            activeKey={tab}
            items={[
              { key: 'mine', label: '当前空间' },
              { key: 'market', label: '工具市场' },
            ]}
            onChange={value => {
              setTab(value);
              setPage(1);
            }}
          />
          <div className="resource-tools-toolbar">
            <Input
              prefix={<SearchOutlined />}
              allowClear
              aria-label="搜索工具"
              placeholder="搜索工具名称"
              value={query}
              onChange={event => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => setRevision(value => value + 1)}
            >
              刷新
            </Button>
            <Button
              onClick={() =>
                window.open('/resource/plugin', '_blank', 'noopener,noreferrer')
              }
            >
              管理与添加内置工具
            </Button>
          </div>
          {error && (
            <Alert
              type="error"
              showIcon
              message="工具列表读取失败"
              description={error}
              action={
                <Button onClick={() => setRevision(value => value + 1)}>
                  重试
                </Button>
              }
            />
          )}
          {loading ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : !items.length && !error ? (
            <Empty
              description={
                query
                  ? '没有匹配的工具'
                  : '暂无已发布工具，请创建工具或从内置目录添加。'
              }
            />
          ) : (
            <div className="workflow-mcp-servers">
              {items.map(item => (
                <div className="workflow-mcp-tool" key={item.id}>
                  <div>
                    <h3>
                      {item.name} <Tag>{item.version}</Tag>
                    </h3>
                    <p>{item.description}</p>
                  </div>
                  <div className="resource-tools-actions">
                    <Button
                      onClick={() => {
                        setSelected(item);
                        setError('');
                        setResult('');
                        const template = httpTestTemplate(item);
                        setInput(template.input);
                        setInputHint(template.hint);
                      }}
                    >
                      参数与测试
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => handleAddToolNode(item)}
                    >
                      添加
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {total > 20 && (
            <Pagination
              current={page}
              pageSize={20}
              total={total}
              showSizeChanger={false}
              onChange={setPage}
            />
          )}
        </>
      )}
    </Modal>
  );
}
