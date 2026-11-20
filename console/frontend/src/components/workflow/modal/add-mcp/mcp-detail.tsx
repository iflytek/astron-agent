import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Alert, Button, Input, Select, Skeleton } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { getServerToolDetailAPI, debugServerToolAPI } from '@/services/plugin';
import type { McpItem } from '@/components/workflow/types/modal/add-mcp';
import {
  mcpCallFailure,
  mcpDiscoveryFailure,
  resourceFailure,
} from '@/pages/resource-management/resource-tools/resource-errors';
import {
  mcpTools,
  mcpResultFailed,
  parseArguments,
  pretty,
  schemaExample,
  type McpTool,
} from '@/pages/resource-management/resource-tools/mcp-tools';
import '@/pages/resource-management/resource-tools/style.css';
import { SchemaFields } from '@/pages/resource-management/resource-tools/schema-fields';
type Detail = {
  name?: string;
  description?: string;
  brief?: string;
  connectionStatus?: string;
  connectionMessage?: string;
  tools: McpTool[];
};
export function MCPDetail({
  currentTool,
}: {
  currentTool: McpItem;
}): ReactElement {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  const [revision, setRevision] = useState(0);
  const [toolName, setToolName] = useState('');
  const [input, setInput] = useState('{}');
  const [result, setResult] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const debugFormRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const token = ++request.current;
    setLoading(true);
    setError('');
    setDetail(null);
    setResult('');
    setFailed(false);
    setBusy(false);
    void getServerToolDetailAPI(currentTool.id || '')
      .then(value => {
        if (token !== request.current) return;
        const data = value as unknown as Detail;
        const tools = mcpTools(data);
        const selected =
          tools.find(tool => tool.name === currentTool.childName) || tools[0];
        setDetail({ ...data, tools });
        setToolName(selected?.name || '');
        setInput(
          pretty(schemaExample(selected?.inputSchema || { type: 'object' }))
        );
      })
      .catch((reason: unknown) => {
        if (token === request.current) {
          const problem = resourceFailure(reason, mcpDiscoveryFailure);
          setErrorTitle(problem.title);
          setError(problem.description);
        }
      })
      .finally(() => {
        if (token === request.current) setLoading(false);
      });
    return () => {
      request.current += 1;
    };
  }, [currentTool.id, currentTool.childName, revision]);
  const tools = useMemo(
    () =>
      currentTool.childName
        ? detail?.tools.filter(tool => tool.name === currentTool.childName) ||
          []
        : detail?.tools || [],
    [detail, currentTool.childName]
  );
  const tool = tools.find(item => item.name === toolName);
  const debug = async (): Promise<void> => {
    if (
      busy ||
      !tool ||
      !currentTool.id ||
      !debugFormRef.current?.reportValidity()
    )
      return;
    const token = request.current;
    setBusy(true);
    setError('');
    setResult('');
    setFailed(false);
    try {
      const args = parseArguments(input);
      const value = await debugServerToolAPI({
        mcpServerId: currentTool.id,
        toolName: tool.name,
        toolArgs: args,
      });
      if (token === request.current) {
        setResult(pretty(value));
        setFailed(mcpResultFailed(value));
      }
    } catch (reason) {
      if (token === request.current) {
        const problem = resourceFailure(reason, mcpCallFailure);
        setErrorTitle(problem.title);
        setError(problem.description);
      }
    } finally {
      if (token === request.current) setBusy(false);
    }
  };
  const refresh = (
    <Button
      icon={<ReloadOutlined />}
      disabled={busy}
      onClick={() => setRevision(value => value + 1)}
    >
      重新发现
    </Button>
  );
  return (
    <section className="workflow-mcp-detail">
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <div className="workflow-mcp-heading">
            <div>
              <h2>{detail?.name || currentTool.name}</h2>
              <p>
                {detail?.description ||
                  detail?.brief ||
                  currentTool.description}
              </p>
            </div>
            {refresh}
          </div>
          {error && (
            <Alert
              type="error"
              showIcon
              message={errorTitle}
              description={error}
              action={!detail ? refresh : undefined}
            />
          )}
          {detail?.connectionStatus === 'error' && (
            <Alert
              type="error"
              showIcon
              message="MCP 连接失败"
              description={
                detail.connectionMessage || '请检查服务配置并重新发现。'
              }
            />
          )}
          {!!tools.length && (
            <>
              <label>
                工具
                <Select
                  value={toolName}
                  disabled={busy}
                  options={tools.map(item => ({
                    value: item.name,
                    label: item.name,
                  }))}
                  onChange={name => {
                    const next = tools.find(item => item.name === name);
                    setToolName(name);
                    setInput(
                      pretty(
                        schemaExample(next?.inputSchema || { type: 'object' })
                      )
                    );
                    setResult('');
                    setError('');
                  }}
                />
              </label>
              <p>{tool?.description}</p>
              <details className="resource-tools-schema">
                <summary>查看输入参数定义</summary>
                <pre>{pretty(tool?.inputSchema || {})}</pre>
              </details>
              <form
                ref={debugFormRef}
                onSubmit={event => event.preventDefault()}
              >
                <SchemaFields
                  key={`${currentTool.id}:${tool?.name ?? ''}`}
                  schema={tool?.inputSchema || { type: 'object' }}
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
              <Button
                type="primary"
                loading={busy}
                onClick={() => void debug()}
              >
                运行测试
              </Button>
            </>
          )}
          {detail && !tools.length && detail.connectionStatus !== 'error' && (
            <p>此服务没有可测试的工具。</p>
          )}
          {result && (
            <section className="resource-tools-result">
              <h3>调用结果</h3>
              {failed && (
                <Alert type="error" showIcon message="工具返回调用失败" />
              )}
              <pre tabIndex={0}>{result}</pre>
            </section>
          )}
        </>
      )}
    </section>
  );
}
export default function MCPDetailWrapper({
  currentTool,
  handleClearMCPToolDetail,
}: {
  currentTool: McpItem;
  handleClearMCPToolDetail: () => void;
}): ReactElement {
  return (
    <div className="workflow-mcp-detail-wrapper">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={handleClearMCPToolDetail}
      >
        返回服务列表
      </Button>
      <MCPDetail currentTool={currentTool} />
    </div>
  );
}
