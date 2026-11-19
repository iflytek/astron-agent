import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  Alert,
  Button,
  Drawer,
  Dropdown,
  Empty,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Tabs,
  Tag,
} from 'antd';
import {
  ApiOutlined,
  AppstoreOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StarFilled,
  StarOutlined,
  ToolOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import http from '@/utils/http';
import useSpaceStore from '@/store/space-store';
import {
  mcpResultFailed,
  mcpTools,
  parseArguments,
  pretty,
  schemaExample,
  type JsonObject,
} from './mcp-tools';
import './style.css';

type Resource = {
  id: number;
  name: string;
  description?: string;
  content?: string;
  schema?: JsonObject;
  temporaryData?: {
    name?: string;
    description?: string;
    schema?: JsonObject;
    version?: string;
  };
  version?: string;
  isPublic?: boolean;
  favorite?: boolean;
  status?: number;
  parameters?: JsonObject;
  configured?: boolean;
  connectionStatus?: string;
  connectionMessage?: string;
  tools?: { servers?: { tools?: import('./mcp-tools').McpTool[] }[] };
};
type Catalog = {
  id: string;
  name: string;
  brief?: string;
  description?: string;
  server?: string;
  version?: string;
  available?: boolean;
  configurationHint?: string;
  installed?: boolean;
};
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
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState(false);
  const [directory, setDirectory] = useState('connected');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [open, setOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('test');
  const [editing, setEditing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [schema, setSchema] = useState(pretty(initialSchema));
  const [version, setVersion] = useState('V1.0');
  const [serverUrl, setServerUrl] = useState('');
  const [parameters, setParameters] = useState('{}');
  const [debugName, setDebugName] = useState('');
  const [debugInput, setDebugInput] = useState('{}');
  const [result, setResult] = useState('');
  const [resultFailed, setResultFailed] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const epoch = useRef(0);
  const detailRequest = useRef(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const base = `/resources/${mode}`;
  const noun = mode === 'mcp' ? '服务' : '工具';

  useEffect(() => {
    epoch.current += 1;
    detailRequest.current += 1;
    busyRef.current = false;
    setBusy(false);
    setOpen(false);
    setSelected(null);
    setEditing(false);
    setResult('');
    setError('');
    setNotice('');
    setDeleteTarget(null);
    setPage(1);
    setQuery('');
    setFavorites(false);
    setDirectory('connected');
    return () => {
      epoch.current += 1;
      detailRequest.current += 1;
    };
  }, [mode, market, spaceId, enterpriseId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setListError('');
    setItems([]);
    void http
      .get<never, { records: Resource[]; total: number }>(base, {
        params: { name: query, market, favorites, page, pageSize: 20 },
      })
      .then(data => {
        if (active) {
          setItems(data.records);
          setTotal(data.total);
        }
      })
      .catch((reason: Error) => {
        if (active) setListError(reason.message || '资源列表加载失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [base, market, favorites, query, page, revision, spaceId, enterpriseId]);

  useEffect(() => {
    let active = true;
    setCatalog([]);
    setCatalogError('');
    if (market) return;
    setCatalogLoading(true);
    void http
      .get<never, Catalog[]>(`${base}/catalog`)
      .then(data => {
        if (active) setCatalog(data);
      })
      .catch((reason: Error) => {
        if (active) setCatalogError(reason.message || '内置目录加载失败');
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, [base, market, revision, spaceId, enterpriseId]);

  const run = async (
    action: (current: () => boolean) => Promise<void>
  ): Promise<void> => {
    if (busyRef.current) return;
    const scope = epoch.current;
    const request = detailRequest.current;
    const current = (): boolean =>
      scope === epoch.current && request === detailRequest.current;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action(current);
    } catch (reason) {
      if (current())
        setError(
          reason instanceof SyntaxError
            ? 'JSON 格式无效，请检查后重试。'
            : reason instanceof Error
              ? reason.message
              : '操作失败，请重试。'
        );
    } finally {
      if (scope === epoch.current) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  };
  const mayLeave = (): boolean =>
    !editing || window.confirm('放弃尚未保存的配置？');
  const close = (): void => {
    if (busy || !mayLeave()) return;
    detailRequest.current += 1;
    setOpen(false);
    setEditing(false);
    setError('');
  };
  const prepare = (row: Resource | null): void => {
    setSelected(row);
    setName(row?.temporaryData?.name || row?.name || '');
    setDescription(
      row?.temporaryData?.description || row?.description || row?.content || ''
    );
    setSchema(
      pretty(row?.temporaryData?.schema || row?.schema || initialSchema)
    );
    setVersion(row?.temporaryData?.version || row?.version || 'V1.0');
    setServerUrl('');
    setParameters(pretty(row?.parameters || {}));
    const tools = mcpTools(row);
    setDebugName(tools[0]?.name || '');
    setDebugInput(
      mode === 'mcp'
        ? pretty(schemaExample(tools[0]?.inputSchema || { type: 'object' }))
        : '{\n  "path": {},\n  "query": {},\n  "header": {},\n  "body": {}\n}'
    );
    setResult('');
    setResultFailed(false);
    setError('');
  };
  const create = (): boolean => {
    if (busy || !mayLeave()) return false;
    detailRequest.current += 1;
    prepare(null);
    setOpen(true);
    setEditing(true);
    setDrawerTab('config');
    return true;
  };
  const load = async (row: Resource, config = false): Promise<void> => {
    if (busy || !mayLeave()) return;
    detailRequest.current += 1;
    setOpen(true);
    setDetailLoading(true);
    setEditing(false);
    prepare(row);
    setDrawerTab(config ? 'config' : 'test');
    await run(async current => {
      try {
        const detail = await http.get<never, Resource>(`${base}/${row.id}`);
        if (!current()) return;
        prepare(detail);
        setEditing(false);
      } finally {
        if (current()) setDetailLoading(false);
      }
    });
  };
  const save = (draft: boolean): void => {
    if (!formRef.current?.reportValidity()) return;
    void run(async current => {
      const payload =
        mode === 'tools'
          ? {
              name,
              description,
              schema: parseArguments(schema),
              version,
              draft,
            }
          : {
              name,
              description,
              serverUrl,
              parameters: parseArguments(parameters),
            };
      const saved = selected
        ? await http.put<never, Resource>(`${base}/${selected.id}`, payload)
        : await http.post<never, Resource>(base, payload);
      if (!current()) return;
      const detail =
        mode === 'mcp'
          ? await http.get<never, Resource>(`${base}/${saved.id}`)
          : saved;
      if (!current()) return;
      prepare(detail);
      setEditing(false);
      setNotice(
        draft
          ? '草稿已保存，发布后可用于 Agent 和工作流。'
          : '配置已保存。可在测试中验证实际调用。'
      );
      setRevision(value => value + 1);
    });
  };
  const remove = (): void => {
    if (!deleteTarget) return;
    const row = deleteTarget;
    void run(async current => {
      await http.delete(`${base}/${row.id}`);
      if (!current()) return;
      setDeleteTarget(null);
      setNotice(`已删除“${row.name}”。`);
      if (selected?.id === row.id) {
        setOpen(false);
        setSelected(null);
        setEditing(false);
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
  const importTool = (file: File): void => {
    if (busy || !mayLeave()) return;
    detailRequest.current += 1;
    void run(async current => {
      const imported = JSON.parse(await file.text()) as Resource;
      if (!current()) return;
      prepare(null);
      setName(imported.name || '');
      setDescription(imported.description || '');
      setSchema(pretty(imported.schema || imported));
      setVersion(imported.version || 'V1.0');
      setOpen(true);
      setEditing(true);
      setDrawerTab('config');
    });
  };
  const availableTools = mcpTools(selected);
  const activeTool = availableTools.find(tool => tool.name === debugName);
  const filteredCatalog = catalog.filter(item =>
    `${item.name} ${item.brief || item.description || ''}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );
  const isCatalog = directory === 'catalog' && !market;
  const refresh = (
    <Button
      icon={<ReloadOutlined />}
      loading={loading || catalogLoading}
      onClick={() => setRevision(value => value + 1)}
    >
      刷新
    </Button>
  );

  return (
    <main className="resource-tools">
      <header className="resource-tools-header">
        <div>
          <h1>
            {mode === 'mcp' ? 'MCP 服务' : market ? '工具市场' : '工具管理'}
          </h1>
          <p>
            {mode === 'mcp'
              ? '连接外部服务，让 Agent 与工作流使用同一组能力。'
              : '管理可复用的 HTTP 工具，接入 Agent 与工作流。'}
          </p>
        </div>
        {!market && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={busy}
            onClick={create}
          >
            新建{noun}
          </Button>
        )}
      </header>
      {!market && (
        <Tabs
          activeKey={directory}
          onChange={value => {
            setDirectory(value);
            setQuery('');
            setPage(1);
          }}
          items={[
            {
              key: 'connected',
              label: mode === 'mcp' ? '已接入服务' : '我的工具',
            },
            { key: 'catalog', label: '内置目录' },
          ]}
        />
      )}
      <div className="resource-tools-toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          aria-label="搜索资源"
          placeholder={isCatalog ? '搜索内置能力' : `搜索${noun}名称`}
          value={query}
          onChange={event => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        {!isCatalog && mode === 'tools' && (
          <Button
            icon={favorites ? <StarFilled /> : <StarOutlined />}
            aria-pressed={favorites}
            onClick={() => {
              setFavorites(value => !value);
              setPage(1);
            }}
          >
            收藏
          </Button>
        )}
        <span className="resource-tools-toolbar-spacer" />
        {refresh}
        {mode === 'tools' && !market && !isCatalog && (
          <>
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
                event.target.value = '';
                if (file) importTool(file);
              }}
            />
          </>
        )}
      </div>
      {notice && (
        <Alert
          type="success"
          showIcon
          message={notice}
          closable
          onClose={() => setNotice('')}
        />
      )}
      {error && !open && (
        <Alert type="error" showIcon message="操作未完成" description={error} />
      )}
      {(isCatalog ? catalogError : listError) && (
        <Alert
          type="error"
          showIcon
          message={isCatalog ? '内置目录暂时无法读取' : '资源列表加载失败'}
          description={isCatalog ? catalogError : listError}
          action={refresh}
        />
      )}
      {(isCatalog ? catalogLoading : loading) ? (
        <div className="resource-tools-grid" aria-label="正在加载资源">
          {[0, 1, 2].map(key => (
            <div className="resource-tools-skeleton" key={key}>
              <Skeleton active />
            </div>
          ))}
        </div>
      ) : isCatalog ? (
        <>
          <p className="resource-tools-section-note">
            {mode === 'mcp'
              ? '选择能力并配置连接，保存后可在 Agent 和工作流中使用。'
              : '添加到当前空间后，即可在 Agent 和工作流中选择。实际调用取决于平台配置与厂商授权。'}
          </p>
          {!catalogError && !filteredCatalog.length && (
            <Empty
              description={query ? '没有匹配的内置能力' : '暂无内置能力'}
            />
          )}
          <div className="resource-tools-grid">
            {filteredCatalog.map(item => (
              <article className="resource-tool-card" key={item.id}>
                <div className="resource-tool-identity">
                  <span className="resource-tool-icon">
                    <AppstoreOutlined />
                  </span>
                  <h2>{item.name}</h2>
                </div>
                <p className="resource-tool-description">
                  {item.brief || item.description || '暂无说明'}
                </p>
                <div className="resource-tools-meta">
                  <Tag>内置{mode === 'mcp' ? ' MCP' : '工具'}</Tag>
                  {item.version && <Tag>{item.version}</Tag>}
                  {mode === 'tools' && item.available === false && (
                    <Tag color="warning">待平台配置</Tag>
                  )}
                  {item.installed && <Tag>已添加</Tag>}
                </div>
                {item.configurationHint && (
                  <p className="resource-tool-hint">{item.configurationHint}</p>
                )}
                <footer>
                  <Button
                    type="link"
                    disabled={busy || item.installed}
                    onClick={() => {
                      if (mode === 'mcp') {
                        if (create()) {
                          setName(item.name);
                          setDescription(item.brief || '');
                          setServerUrl(item.server || '');
                        }
                      } else
                        void run(async current => {
                          await http.post(
                            `${base}/catalog/${encodeURIComponent(item.id)}/install`,
                            {}
                          );
                          if (current()) {
                            setNotice(`已将“${item.name}”添加到当前空间。`);
                            setRevision(value => value + 1);
                          }
                        });
                    }}
                  >
                    {item.installed
                      ? '已添加到空间'
                      : mode === 'mcp'
                        ? '配置连接'
                        : '添加到空间'}
                    <PlusOutlined />
                  </Button>
                </footer>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="resource-tools-directory-heading">
            <span>
              {market
                ? '可用工具'
                : mode === 'mcp'
                  ? '当前空间的连接'
                  : '当前空间的工具'}
            </span>
            <span>{total} 项</span>
          </div>
          {!listError && !items.length && (
            <Empty
              description={
                query || favorites
                  ? '没有匹配的资源，请调整筛选。'
                  : `还没有接入${noun}，创建一个或从内置目录添加。`
              }
            >
              {query || favorites ? (
                <Button
                  onClick={() => {
                    setQuery('');
                    setFavorites(false);
                    setPage(1);
                  }}
                >
                  清除筛选
                </Button>
              ) : (
                !market && (
                  <Button onClick={() => setDirectory('catalog')}>
                    浏览内置目录
                  </Button>
                )
              )}
            </Empty>
          )}
          <div className="resource-tools-grid">
            {items.map(row => (
              <article className="resource-tool-card" key={row.id}>
                <div className="resource-tool-identity">
                  <span className="resource-tool-icon">
                    {mode === 'mcp' ? <ApiOutlined /> : <ToolOutlined />}
                  </span>
                  <h2>
                    <button onClick={() => void load(row)} disabled={busy}>
                      {row.name || `${noun} ${row.id}`}
                    </button>
                  </h2>
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: [
                        ...(!market
                          ? [{ key: 'edit', label: '编辑配置' }]
                          : []),
                        ...(mode === 'tools'
                          ? [
                              {
                                key: 'favorite',
                                label: row.favorite ? '取消收藏' : '加入收藏',
                              },
                            ]
                          : []),
                        ...(!market && mode === 'tools'
                          ? [
                              {
                                key: 'publish',
                                label: row.isPublic ? '移出市场' : '加入市场',
                              },
                            ]
                          : []),
                        ...(!market
                          ? [{ key: 'delete', label: '删除', danger: true }]
                          : []),
                      ],
                      onClick: ({ key }) => {
                        if (key === 'edit') void load(row, true);
                        if (key === 'delete') {
                          setError('');
                          setDeleteTarget(row);
                        }
                        if (key === 'favorite' || key === 'publish')
                          void run(async current => {
                            await http.post(
                              `${base}/${row.id}/${key === 'favorite' ? 'favorite' : 'publish'}`,
                              key === 'favorite'
                                ? { favorite: !row.favorite }
                                : { public: !row.isPublic }
                            );
                            if (current()) setRevision(value => value + 1);
                          });
                      },
                    }}
                    disabled={busy}
                  >
                    <Button
                      type="text"
                      icon={<MoreOutlined />}
                      aria-label={`更多操作：${row.name}`}
                    />
                  </Dropdown>
                </div>
                <p className="resource-tool-description">
                  {row.description || row.content || '暂无说明'}
                </p>
                <div className="resource-tools-meta">
                  <Tag>{mode === 'mcp' ? 'MCP' : 'HTTP'}</Tag>
                  {row.version && <Tag>{row.version}</Tag>}
                  {row.status === 0 && <Tag color="warning">草稿</Tag>}
                  {row.isPublic && <Tag>已入市场</Tag>}
                  {row.favorite && <StarFilled aria-label="已收藏" />}
                  {mode === 'mcp' && (
                    <Tag>{row.configured ? '已配置连接' : '待配置'}</Tag>
                  )}
                </div>
                <footer>
                  {!market && (
                    <Button
                      type="text"
                      disabled={busy}
                      onClick={() => void load(row, true)}
                    >
                      配置
                    </Button>
                  )}
                  <Button
                    type="link"
                    disabled={busy}
                    onClick={() => void load(row)}
                  >
                    {row.status === 0
                      ? '查看草稿'
                      : mode === 'mcp'
                        ? '查看工具与测试'
                        : '查看与测试'}
                  </Button>
                </footer>
              </article>
            ))}
          </div>
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
      <Drawer
        title={selected?.name || `新建${noun}`}
        open={open}
        width="min(740px, 100vw)"
        rootClassName="resource-tools-drawer"
        onClose={close}
        maskClosable={!busy}
        keyboard={!busy}
        destroyOnClose
      >
        {error && (
          <Alert
            type="error"
            showIcon
            message="操作未完成"
            description={error}
          />
        )}
        {notice && <Alert type="success" showIcon message={notice} />}
        {detailLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <>
            <Tabs
              activeKey={drawerTab}
              onChange={value => {
                if (busy || (value !== drawerTab && !mayLeave())) return;
                if (editing) prepare(selected);
                setDrawerTab(value);
                setEditing(false);
                setError('');
              }}
              items={[
                ...(!market ? [{ key: 'config', label: '配置' }] : []),
                ...(selected ? [{ key: 'test', label: '工具与测试' }] : []),
              ]}
            />
            {drawerTab === 'config' && (
              <form
                ref={formRef}
                onSubmit={event => {
                  event.preventDefault();
                  save(false);
                }}
              >
                <div className="resource-tools-form-intro">
                  <h2>
                    {selected
                      ? '资源配置'
                      : mode === 'mcp'
                        ? '接入 MCP 服务'
                        : '创建 HTTP 工具'}
                  </h2>
                  <p>
                    {mode === 'mcp'
                      ? '保存时发现服务工具，连接地址与凭据由服务端保管。'
                      : '使用 OpenAPI 3 文档定义请求。发布后可被 Agent 和工作流引用。'}
                  </p>
                </div>
                <label>
                  名称
                  <Input
                    disabled={busy}
                    required
                    maxLength={mode === 'tools' ? 64 : 255}
                    value={name}
                    onChange={event => {
                      setName(event.target.value);
                      setEditing(true);
                    }}
                  />
                </label>
                <label>
                  说明
                  <Input.TextArea
                    disabled={busy}
                    required={mode === 'tools'}
                    maxLength={mode === 'tools' ? 255 : 10000}
                    autoSize={{ minRows: 2, maxRows: 5 }}
                    value={description}
                    onChange={event => {
                      setDescription(event.target.value);
                      setEditing(true);
                    }}
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
                        onChange={event => {
                          setVersion(event.target.value);
                          setEditing(true);
                        }}
                      />
                    </label>
                    <label>
                      OpenAPI 3 文档
                      <Input.TextArea
                        disabled={busy}
                        className="resource-tools-code"
                        rows={12}
                        required
                        spellCheck={false}
                        value={schema}
                        onChange={event => {
                          setSchema(event.target.value);
                          setEditing(true);
                        }}
                      />
                    </label>
                    <p className="resource-tool-hint">
                      如需鉴权，在文档的 securitySchemes
                      中配置。已有凭据显示为掩码，保持掩码即可保留。
                    </p>
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
                          selected
                            ? '已保存，留空保留当前连接'
                            : 'https://…/mcp 或 https://…/sse'
                        }
                        value={serverUrl}
                        onChange={event => {
                          setServerUrl(event.target.value);
                          setEditing(true);
                        }}
                      />
                    </label>
                    <label>
                      环境参数（JSON）
                      <Input.TextArea
                        disabled={busy}
                        className="resource-tools-code resource-tools-code-short"
                        rows={7}
                        spellCheck={false}
                        value={parameters}
                        onChange={event => {
                          setParameters(event.target.value);
                          setEditing(true);
                        }}
                      />
                    </label>
                    <p className="resource-tool-hint">
                      使用托管 MCP
                      服务时填写文本键值参数。已有凭据显示为掩码，保留掩码即可保持原值。
                    </p>
                  </>
                )}
                <div className="resource-tools-save">
                  <Button type="primary" htmlType="submit" loading={busy}>
                    {mode === 'mcp' ? '验证并保存' : '发布工具'}
                  </Button>
                  {mode === 'tools' && (
                    <Button disabled={busy} onClick={() => save(true)}>
                      保存草稿
                    </Button>
                  )}
                  <Button disabled={busy} onClick={close}>
                    关闭
                  </Button>
                </div>
              </form>
            )}
            {drawerTab === 'test' && selected && (
              <>
                <div className="resource-tools-form-intro">
                  <p>{selected.description || selected.content}</p>
                  <div className="resource-tools-meta">
                    {selected.version && <Tag>{selected.version}</Tag>}
                    <Tag>
                      {mode === 'mcp'
                        ? `${availableTools.length} 个工具`
                        : 'HTTP 工具'}
                    </Tag>
                  </div>
                </div>
                {selected.status === 0 ? (
                  <Alert
                    type="info"
                    showIcon
                    message="此工具尚未发布"
                    description="发布工具后可进行测试，并在 Agent 和工作流中调用。"
                  />
                ) : (
                  <>
                    {mode === 'mcp' && (
                      <>
                        {selected.connectionStatus === 'error' && (
                          <Alert
                            type="error"
                            showIcon
                            message="MCP 连接失败"
                            description={
                              selected.connectionMessage ||
                              '请检查连接配置后重试。'
                            }
                            action={
                              <Button
                                disabled={busy}
                                onClick={() => void load(selected)}
                              >
                                重新发现
                              </Button>
                            }
                          />
                        )}
                        <label>
                          选择工具
                          <Select
                            showSearch
                            optionFilterProp="label"
                            aria-label="选择 MCP 工具"
                            placeholder="选择一个工具"
                            value={debugName || undefined}
                            disabled={busy || !availableTools.length}
                            options={availableTools.map(tool => ({
                              value: tool.name,
                              label: tool.name,
                            }))}
                            onChange={value => {
                              const tool = availableTools.find(
                                item => item.name === value
                              );
                              setDebugName(value);
                              setDebugInput(
                                pretty(
                                  schemaExample(
                                    tool?.inputSchema || { type: 'object' }
                                  )
                                )
                              );
                              setResult('');
                              setError('');
                            }}
                          />
                        </label>
                        {activeTool && (
                          <>
                            <p>{activeTool.description}</p>
                            <details className="resource-tools-schema">
                              <summary>查看输入参数定义</summary>
                              <pre>{pretty(activeTool.inputSchema || {})}</pre>
                            </details>
                          </>
                        )}
                        {!availableTools.length &&
                          selected.connectionStatus !== 'error' && (
                            <Empty description="此服务尚未提供工具" />
                          )}
                      </>
                    )}
                    {(mode === 'tools' || !!activeTool) && (
                      <>
                        <label>
                          {mode === 'tools'
                            ? '请求参数（path / query / header / body）'
                            : '工具参数（JSON）'}
                          <Input.TextArea
                            disabled={busy}
                            className="resource-tools-code"
                            rows={12}
                            value={debugInput}
                            spellCheck={false}
                            onChange={event =>
                              setDebugInput(event.target.value)
                            }
                          />
                        </label>
                        <div className="resource-tools-actions">
                          <Button
                            type="primary"
                            loading={busy}
                            onClick={() =>
                              void run(async current => {
                                const args = parseArguments(debugInput);
                                const value = await http.post(
                                  `${base}/${selected.id}/debug`,
                                  mode === 'tools'
                                    ? args
                                    : { name: debugName, arguments: args },
                                  { timeout: 300000 }
                                );
                                if (current()) {
                                  setResult(pretty(value));
                                  setResultFailed(
                                    mode === 'mcp' && mcpResultFailed(value)
                                  );
                                }
                              })
                            }
                          >
                            运行测试
                          </Button>
                          {mode === 'tools' && (
                            <>
                              <Button disabled={busy} onClick={exportTool}>
                                导出 JSON
                              </Button>
                              <Button
                                disabled={busy}
                                onClick={() =>
                                  void run(async current => {
                                    const data = await http.get(
                                      `${base}/${selected.id}/versions`
                                    );
                                    if (current()) {
                                      setResult(pretty(data));
                                      setResultFailed(false);
                                    }
                                  })
                                }
                              >
                                版本记录
                              </Button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
                {result && (
                  <section className="resource-tools-result">
                    <h3>调用结果</h3>
                    {resultFailed && (
                      <Alert
                        type="error"
                        showIcon
                        message="工具返回调用失败"
                        description="请查看返回内容并检查参数或服务状态。"
                      />
                    )}
                    <pre tabIndex={0}>{result}</pre>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </Drawer>
      <Modal
        title="删除资源"
        open={!!deleteTarget}
        onCancel={() => {
          if (!busy) setDeleteTarget(null);
        }}
        onOk={remove}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: busy }}
        cancelButtonProps={{ disabled: busy }}
      >
        <p>
          删除“{deleteTarget?.name}”？已被 Agent
          或工作流引用的资源需要先解除关联。
        </p>
        {error && <Alert type="error" showIcon message={error} />}
      </Modal>
    </main>
  );
}
