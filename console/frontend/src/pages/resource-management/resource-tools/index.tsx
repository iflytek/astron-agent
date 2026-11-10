import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Alert, Button, Dropdown, Empty, Input, Skeleton, Tag } from 'antd';
import {
  DownOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import http from '@/utils/http';
import useSpaceStore from '@/store/space-store';
import './style.css';

type JsonObject = Record<string, unknown>;
type Resource = {
  id: number;
  name: string;
  description?: string;
  content?: string;
  schema?: JsonObject;
  temporaryData?: JsonObject;
  version?: string;
  isPublic?: boolean;
  status?: number;
  parameters?: JsonObject;
  configured?: boolean;
};
type Catalog = { id: string; name: string; brief: string; server: string };
const initialSchema = {
  openapi: '3.0.3',
  info: { title: 'HTTP Tool', version: '1.0.0' },
  servers: [{ url: 'https://example.com' }],
  paths: {
    '/api': {
      get: {
        operationId: 'query',
        responses: {
          '200': {
            description: 'Success',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
  },
};
const pretty = (value: unknown): string => JSON.stringify(value, null, 2);

export default function ResourceTools({
  mode = 'tools',
  market = false,
}: {
  mode?: 'tools' | 'mcp';
  market?: boolean;
}): ReactElement {
  const spaceId = useSpaceStore(state => state.spaceId);
  const enterpriseId = useSpaceStore(state => state.enterpriseId);
  const [items, setItems] = useState<Resource[]>([]);
  const [catalog, setCatalog] = useState<Catalog[]>([]);
  const [query, setQuery] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [schema, setSchema] = useState(pretty(initialSchema));
  const [version, setVersion] = useState('V1.0');
  const [serverUrl, setServerUrl] = useState('');
  const [parameters, setParameters] = useState('{}');
  const [debugName, setDebugName] = useState('');
  const [debugInput, setDebugInput] = useState(
    mode === 'tools' ? '{"query": {}}' : '{}'
  );
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scopeEpoch = useRef(0);
  const detailRef = useRef<HTMLElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const base = `/resources/${mode}`;

  useEffect(() => {
    scopeEpoch.current += 1;
    setSelected(null);
    setEditing(false);
    setResult('');
    setError('');
    setDebugInput(mode === 'tools' ? '{"query": {}}' : '{}');
    return () => {
      scopeEpoch.current += 1;
    };
  }, [mode, market, spaceId, enterpriseId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setListError('');
    setItems([]);
    void http
      .get<never, { records: Resource[]; total: number }>(base, {
        params: { name: query, market, page, pageSize: 20 },
      })
      .then(data => {
        if (active) {
          setItems(data.records);
          setTotal(data.total);
        }
      })
      .catch((err: Error) => {
        if (active) setListError(err.message || '资源列表加载失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [base, market, query, page, revision, spaceId, enterpriseId]);

  useEffect(() => {
    let active = true;
    setCatalog([]);
    setCatalogError('');
    if (mode === 'mcp') {
      void http
        .get<never, Catalog[]>('/resources/mcp/catalog')
        .then(data => {
          if (active) setCatalog(data);
        })
        .catch((err: Error) => {
          if (active) setCatalogError(err.message || '内置目录加载失败');
        });
    }
    return () => {
      active = false;
    };
  }, [mode, revision, spaceId, enterpriseId]);

  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ block: 'nearest' });
      errorRef.current?.focus();
    }
  }, [error]);

  const run = async (action: () => Promise<void>): Promise<void> => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? 'JSON 格式无效，请检查后重试。'
          : err instanceof Error
            ? err.message
            : '操作失败，请重试'
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const canReplaceEditor = (): boolean =>
    !editing || window.confirm('放弃当前编辑，打开其他资源？');
  const focusEditor = (): void => {
    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      detailRef.current?.focus();
    });
  };
  const edit = (row: Resource | null): boolean => {
    if (busyRef.current || !canReplaceEditor()) return false;
    setError('');
    setSelected(row);
    setEditing(true);
    setName(row?.name || '');
    setDescription(row?.description || row?.content || '');
    const draft = row?.temporaryData;
    setSchema(pretty(draft?.schema || row?.schema || initialSchema));
    setVersion(row?.version || 'V1.0');
    setServerUrl('');
    setParameters(pretty(row?.parameters || {}));
    setResult('');
    focusEditor();
    return true;
  };
  const select = (row: Resource): void => {
    if (!canReplaceEditor()) return;
    const epoch = scopeEpoch.current;
    void run(async () => {
      const current = await http.get<never, Resource>(`${base}/${row.id}`);
      if (epoch !== scopeEpoch.current) return;
      setSelected(current);
      setEditing(false);
      setResult(pretty(current));
      focusEditor();
    });
  };
  const save = (draft: boolean): void => {
    if (!formRef.current?.reportValidity()) return;
    void run(async () => {
      const payload =
        mode === 'tools'
          ? { name, description, schema: JSON.parse(schema), version, draft }
          : {
              name,
              description,
              serverUrl,
              parameters: JSON.parse(parameters),
            };
      if (selected) await http.put(`${base}/${selected.id}`, payload);
      else await http.post(base, payload);
      setEditing(false);
      setSelected(null);
      setResult(draft ? '草稿已保存。' : '资源已保存。');
      setRevision(value => value + 1);
    });
  };
  const remove = (row: Resource): void => {
    if (!window.confirm(`删除“${row.name || row.id}”？`)) return;
    void run(async () => {
      await http.delete(`${base}/${row.id}`);
      if (selected?.id === row.id) {
        setSelected(null);
        setEditing(false);
        setResult('');
      }
      if (items.length === 1 && page > 1) setPage(value => value - 1);
      setRevision(value => value + 1);
    });
  };
  const exportTool = (): void => {
    if (!selected) return;
    const blob = new Blob(
      [
        pretty({
          name: selected.name,
          description: selected.description,
          schema: selected.schema,
          version: selected.version,
        }),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selected.name}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="resource-tools">
      <header>
        <div>
          <h1>
            {mode === 'mcp' ? 'MCP 服务' : market ? '工具市场' : '工具管理'}
          </h1>
          <p>
            {mode === 'mcp'
              ? '管理 MCP 连接，查看工具并验证调用。'
              : '管理 HTTP 工具、版本和调用参数。'}
          </p>
        </div>
        {!market && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={busy}
            onClick={() => edit(null)}
          >
            新建{mode === 'mcp' ? '服务' : '工具'}
          </Button>
        )}
      </header>
      <div className="resource-tools-toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          aria-label="搜索资源"
          placeholder="搜索名称"
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
        {mode === 'tools' && !market && (
          <div>
            <Button
              icon={<UploadOutlined />}
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              导入 JSON
            </Button>
            <input
              ref={fileRef}
              hidden
              type="file"
              accept="application/json,.json"
              onChange={event => {
                const file = event.target.files?.[0];
                if (!file) return;
                event.target.value = '';
                if (!canReplaceEditor()) return;
                void run(async () => {
                  const imported = JSON.parse(await file.text()) as Resource;
                  setSelected(null);
                  setEditing(true);
                  setServerUrl('');
                  setResult('');
                  focusEditor();
                  setName(imported.name || '');
                  setDescription(imported.description || '');
                  setSchema(pretty(imported.schema || imported));
                  setVersion(imported.version || 'V1.0');
                });
              }}
            />
          </div>
        )}
      </div>
      {listError && (
        <Alert
          type="error"
          showIcon
          message="无法加载资源"
          description={listError}
          action={
            <Button onClick={() => setRevision(value => value + 1)}>
              重试
            </Button>
          }
        />
      )}
      {catalogError && (
        <Alert
          type="error"
          showIcon
          message="无法加载内置 MCP 目录"
          description={catalogError}
          action={
            <Button onClick={() => setRevision(value => value + 1)}>
              重试
            </Button>
          }
        />
      )}
      <div className="resource-tools-layout">
        <section aria-label="资源列表" aria-busy={loading}>
          {loading && (
            <div className="resource-tools-loading">
              <Skeleton active />
              <Skeleton active />
            </div>
          )}
          {!loading && !listError && items.length === 0 && (
            <Empty
              description={
                query ? '没有匹配的资源，请调整搜索词。' : '当前范围暂无资源。'
              }
            >
              {query ? (
                <Button
                  onClick={() => {
                    setQuery('');
                    setPage(1);
                  }}
                >
                  清除搜索
                </Button>
              ) : (
                !market && (
                  <Button
                    type="primary"
                    disabled={busy}
                    onClick={() => edit(null)}
                  >
                    新建{mode === 'mcp' ? '服务' : '工具'}
                  </Button>
                )
              )}
            </Empty>
          )}
          {!loading &&
            items.map(row => (
              <article
                key={row.id}
                className={
                  selected?.id === row.id ? 'resource-tools-selected' : ''
                }
              >
                <h2>
                  <Button
                    type="link"
                    disabled={busy}
                    title={row.name}
                    onClick={() => select(row)}
                  >
                    {row.name || `MCP ${row.id}`}
                  </Button>
                </h2>
                <p>{row.description || row.content}</p>
                <div className="resource-tools-meta">
                  {row.version && <Tag>{row.version}</Tag>}
                  {row.status === 0 && <Tag>草稿</Tag>}
                </div>
                <div className="resource-tools-actions">
                  {!market && (
                    <>
                      <Button disabled={busy} onClick={() => edit(row)}>
                        编辑
                      </Button>
                      <Button
                        danger
                        disabled={busy}
                        onClick={() => remove(row)}
                      >
                        删除
                      </Button>
                    </>
                  )}
                  {mode === 'tools' && (
                    <>
                      <Dropdown
                        disabled={busy}
                        trigger={['click']}
                        menu={{
                          items: [
                            { key: 'add', label: '加入收藏' },
                            { key: 'remove', label: '移出收藏' },
                          ],
                          onClick: ({ key }) => {
                            void run(async () => {
                              await http.post(`${base}/${row.id}/favorite`, {
                                favorite: key === 'add',
                              });
                              setResult(
                                key === 'add' ? '已收藏' : '已取消收藏'
                              );
                            });
                          },
                        }}
                      >
                        <Button disabled={busy}>
                          收藏管理 <DownOutlined />
                        </Button>
                      </Dropdown>
                      {!market && (
                        <Button
                          disabled={busy}
                          onClick={() => {
                            void run(async () => {
                              await http.post(`${base}/${row.id}/publish`, {
                                public: !row.isPublic,
                              });
                              setRevision(value => value + 1);
                            });
                          }}
                        >
                          {row.isPublic ? '移出市场' : '加入市场'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </article>
            ))}
          <div className="resource-tools-actions">
            <Button
              disabled={loading || page === 1}
              onClick={() => setPage(value => value - 1)}
            >
              上一页
            </Button>
            <span>
              {page} / {Math.max(1, Math.ceil(total / 20))}
            </span>
            <Button
              disabled={loading || page * 20 >= total}
              onClick={() => setPage(value => value + 1)}
            >
              下一页
            </Button>
          </div>
        </section>
        <section
          ref={detailRef}
          tabIndex={-1}
          aria-label="资源详情与配置"
          className="resource-tools-editor"
        >
          {error && (
            <div ref={errorRef} tabIndex={-1}>
              <Alert
                type="error"
                showIcon
                message="操作未完成"
                description={error}
              />
            </div>
          )}
          {editing ? (
            <form
              ref={formRef}
              onSubmit={event => {
                event.preventDefault();
                save(false);
              }}
            >
              <h2>
                {selected
                  ? `编辑 ${selected.name}`
                  : `新建${mode === 'mcp' ? '服务' : '工具'}`}
              </h2>
              <label>
                名称
                <Input
                  disabled={busy}
                  required
                  maxLength={mode === 'tools' ? 64 : 255}
                  value={name}
                  onChange={event => setName(event.target.value)}
                />
              </label>
              <label>
                说明
                <Input.TextArea
                  disabled={busy}
                  required
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                />
              </label>
              {mode === 'tools' ? (
                <>
                  <label>
                    版本
                    <Input
                      disabled={busy}
                      required
                      value={version}
                      onChange={event => setVersion(event.target.value)}
                    />
                  </label>
                  <label>
                    OpenAPI 3 文档
                    <Input.TextArea
                      disabled={busy}
                      className="resource-tools-code"
                      required
                      spellCheck={false}
                      value={schema}
                      onChange={event => setSchema(event.target.value)}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    服务 URL
                    <Input
                      disabled={busy}
                      type="url"
                      required={!selected}
                      placeholder={
                        selected ? '留空保留已保存连接' : 'https://…/mcp'
                      }
                      value={serverUrl}
                      onChange={event => setServerUrl(event.target.value)}
                    />
                  </label>
                  <label>
                    环境参数
                    <Input.TextArea
                      disabled={busy}
                      spellCheck={false}
                      value={parameters}
                      onChange={event => setParameters(event.target.value)}
                    />
                  </label>
                  <p>
                    环境参数通过已配置的 MCP 托管服务发放，保存前验证实际连接。
                  </p>
                </>
              )}
              <div className="resource-tools-actions">
                <Button loading={busy} type="primary" htmlType="submit">
                  {busy ? '处理中…' : '验证并保存'}
                </Button>
                {mode === 'tools' && (
                  <Button
                    disabled={busy}
                    htmlType="button"
                    onClick={() => save(true)}
                  >
                    保存草稿
                  </Button>
                )}
                <Button
                  disabled={busy}
                  htmlType="button"
                  onClick={() => {
                    if (canReplaceEditor()) {
                      setEditing(false);
                      setError('');
                    }
                  }}
                >
                  取消
                </Button>
              </div>
            </form>
          ) : selected ? (
            <div>
              <h2>{selected.name}</h2>
              {mode === 'mcp' && (
                <label>
                  工具名称
                  <Input
                    disabled={busy}
                    value={debugName}
                    onChange={event => setDebugName(event.target.value)}
                  />
                </label>
              )}
              <label>
                {mode === 'tools'
                  ? '请求参数（path/query/header/body）'
                  : '工具参数'}
                <Input.TextArea
                  disabled={busy}
                  className="resource-tools-code"
                  value={debugInput}
                  spellCheck={false}
                  onChange={event => setDebugInput(event.target.value)}
                />
              </label>
              <div className="resource-tools-actions">
                <Button
                  disabled={busy}
                  onClick={() => {
                    void run(async () => {
                      const payload =
                        mode === 'tools'
                          ? JSON.parse(debugInput)
                          : {
                              name: debugName,
                              arguments: JSON.parse(debugInput),
                            };
                      setResult(
                        pretty(
                          await http.post(
                            `${base}/${selected.id}/debug`,
                            payload
                          )
                        )
                      );
                    });
                  }}
                >
                  运行调试
                </Button>
                {mode === 'tools' && (
                  <>
                    <Button onClick={exportTool}>导出</Button>
                    <Button
                      disabled={busy}
                      onClick={() => {
                        void run(async () => {
                          setResult(
                            pretty(
                              await http.get(`${base}/${selected.id}/versions`)
                            )
                          );
                        });
                      }}
                    >
                      查看版本
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="选择资源查看详情，或新建资源。"
            />
          )}
          {result && (
            <div className="resource-tools-result">
              <h3>操作结果</h3>
              <pre tabIndex={0}>{result}</pre>
            </div>
          )}
        </section>
      </div>
      {mode === 'mcp' && catalog.length > 0 && (
        <section>
          <h2>内置 MCP 目录</h2>
          <div className="resource-tools-catalog">
            {catalog.map(item => (
              <article key={item.id}>
                <h3>{item.name}</h3>
                <p>{item.brief}</p>
                <Button
                  disabled={busy}
                  onClick={() => {
                    if (!edit(null)) return;
                    setName(item.name);
                    setDescription(item.brief);
                    setServerUrl(item.server);
                  }}
                >
                  添加连接
                </Button>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
