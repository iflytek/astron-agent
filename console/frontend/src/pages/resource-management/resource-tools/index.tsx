import { useEffect, useState, type ReactElement } from 'react';
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
    mode === 'tools' ? '{"query": {}, "body": {}}' : '{}'
  );
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const base = `/resources/${mode}`;

  useEffect(() => {
    let active = true;
    setSelected(null);
    setEditing(false);
    setError('');
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
        if (active) setError(err.message);
      });
    if (mode === 'mcp') {
      void http
        .get<never, Catalog[]>('/resources/mcp/catalog')
        .then(data => {
          if (active) setCatalog(data);
        })
        .catch((err: Error) => {
          if (active) setError(err.message);
        });
    }
    return () => {
      active = false;
    };
  }, [base, mode, market, query, page, revision, spaceId, enterpriseId]);

  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };
  const edit = (row: Resource | null): void => {
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
  };
  const select = (row: Resource): void => {
    void run(async () => {
      const current = await http.get<never, Resource>(`${base}/${row.id}`);
      setSelected(current);
      setEditing(false);
      setResult(pretty(current));
    });
  };
  const save = (draft: boolean): void => {
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
      setRevision(value => value + 1);
    });
  };
  const remove = (row: Resource): void => {
    if (!window.confirm(`删除“${row.name || row.id}”？`)) return;
    void run(async () => {
      await http.delete(`${base}/${row.id}`);
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
          <button onClick={() => edit(null)}>
            新建{mode === 'mcp' ? '服务' : '工具'}
          </button>
        )}
      </header>
      <div className="resource-tools-toolbar">
        <input
          aria-label="搜索资源"
          placeholder="搜索名称"
          value={query}
          onChange={event => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        <button onClick={() => setRevision(value => value + 1)}>刷新</button>
        {mode === 'tools' && !market && (
          <label className="resource-tools-import">
            导入 JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={event => {
                const file = event.target.files?.[0];
                if (!file) return;
                void run(async () => {
                  const imported = JSON.parse(await file.text()) as Resource;
                  edit(null);
                  setName(imported.name || '');
                  setDescription(imported.description || '');
                  setSchema(pretty(imported.schema || imported));
                  setVersion(imported.version || 'V1.0');
                });
              }}
            />
          </label>
        )}
      </div>
      {error && (
        <p role="alert" className="resource-tools-error">
          {error}
        </p>
      )}
      <div className="resource-tools-layout">
        <section>
          {items.length === 0 && <p>当前范围暂无资源。</p>}
          {items.map(row => (
            <article key={row.id}>
              <h2>
                <button onClick={() => select(row)}>
                  {row.name || `MCP ${row.id}`}
                </button>
              </h2>
              <p>{row.description || row.content}</p>
              <small>
                {row.version}
                {row.status === 0 ? ' · 草稿' : ''}
              </small>
              <div className="resource-tools-actions">
                {!market && (
                  <>
                    <button disabled={busy} onClick={() => edit(row)}>
                      编辑
                    </button>
                    <button disabled={busy} onClick={() => remove(row)}>
                      删除
                    </button>
                  </>
                )}
                {mode === 'tools' && (
                  <>
                    <button
                      disabled={busy}
                      onClick={() => {
                        void run(async () => {
                          await http.post(`${base}/${row.id}/favorite`, {
                            favorite: true,
                          });
                          setResult('已收藏');
                        });
                      }}
                    >
                      收藏
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        void run(async () => {
                          await http.post(`${base}/${row.id}/favorite`, {
                            favorite: false,
                          });
                          setResult('已取消收藏');
                        });
                      }}
                    >
                      取消收藏
                    </button>
                    {!market && (
                      <button
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
                      </button>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
          <div className="resource-tools-actions">
            <button
              disabled={page === 1}
              onClick={() => setPage(value => value - 1)}
            >
              上一页
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil(total / 20))}
            </span>
            <button
              disabled={page * 20 >= total}
              onClick={() => setPage(value => value + 1)}
            >
              下一页
            </button>
          </div>
        </section>
        <section className="resource-tools-editor">
          {editing ? (
            <form
              onSubmit={event => {
                event.preventDefault();
                save(false);
              }}
            >
              <h2>{selected ? '编辑' : '新建'}</h2>
              <label>
                名称
                <input
                  required
                  maxLength={mode === 'tools' ? 64 : 255}
                  value={name}
                  onChange={event => setName(event.target.value)}
                />
              </label>
              <label>
                说明
                <textarea
                  required
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                />
              </label>
              {mode === 'tools' ? (
                <>
                  <label>
                    版本
                    <input
                      required
                      value={version}
                      onChange={event => setVersion(event.target.value)}
                    />
                  </label>
                  <label>
                    OpenAPI 3 文档
                    <textarea
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
                    <input
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
                    <textarea
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
                <button disabled={busy} type="submit">
                  {busy ? '处理中…' : '验证并保存'}
                </button>
                {mode === 'tools' && (
                  <button
                    disabled={busy}
                    type="button"
                    onClick={() => save(true)}
                  >
                    保存草稿
                  </button>
                )}
                <button type="button" onClick={() => setEditing(false)}>
                  取消
                </button>
              </div>
            </form>
          ) : selected ? (
            <div>
              <h2>{selected.name}</h2>
              {mode === 'mcp' && (
                <label>
                  工具名称
                  <input
                    value={debugName}
                    onChange={event => setDebugName(event.target.value)}
                  />
                </label>
              )}
              <label>
                {mode === 'tools'
                  ? '请求参数（path/query/header/body）'
                  : '工具参数'}
                <textarea
                  className="resource-tools-code"
                  value={debugInput}
                  spellCheck={false}
                  onChange={event => setDebugInput(event.target.value)}
                />
              </label>
              <div className="resource-tools-actions">
                <button
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
                </button>
                {mode === 'tools' && (
                  <>
                    <button onClick={exportTool}>导出</button>
                    <button
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
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p>选择资源查看详情，或新建资源。</p>
          )}
          {result && <pre>{result}</pre>}
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
                <button
                  onClick={() => {
                    edit(null);
                    setName(item.name);
                    setDescription(item.brief);
                    setServerUrl(item.server);
                  }}
                >
                  添加连接
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
