import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Alert, Button, Modal, Empty, Input, Skeleton, Tag } from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { getMcpServerList } from '@/services/plugin';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useFlowCommon } from '@/components/workflow/hooks/use-flow-common';
import type { McpServerTool } from '@/types/workflow-api';
import type { McpItem } from '@/components/workflow/types/modal/add-mcp';
import type { McpType } from '@/components/workflow/types/drawer/chat-debugger';
import MCPDetail from './mcp-detail';
import useSpaceStore from '@/store/space-store';
import { resourceFailure } from '@/pages/resource-management/resource-tools/resource-errors';
import '@/pages/resource-management/resource-tools/style.css';
type Server = McpServerTool & {
  connectionStatus?: string;
  connectionMessage?: string;
};
export default function AddMcp(): ReactElement {
  const spaceId = useSpaceStore(state => state.spaceId);
  const enterpriseId = useSpaceStore(state => state.enterpriseId);
  const info = useFlowsManager(state => state.mcpModalInfo);
  const setInfo = useFlowsManager(state => state.setMcpModalInfo);
  const { handleAddMcpNode, resetBeforeAndWillNode } = useFlowCommon();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState<McpItem | null>(null);
  const request = useRef(0);
  useEffect(() => {
    if (!info.open) return;
    const token = ++request.current;
    setLoading(true);
    setError('');
    setServers([]);
    setDetail(null);
    void getMcpServerList()
      .then(data => {
        if (token === request.current) setServers(data);
      })
      .catch((reason: unknown) => {
        if (token === request.current)
          setError(
            resourceFailure(reason, {
              title: 'MCP 服务读取失败',
              recovery:
                '请刷新服务列表；连接异常时请在 MCP 服务管理中检查配置与授权。',
            }).description
          );
      })
      .finally(() => {
        if (token === request.current) setLoading(false);
      });
    return () => {
      request.current += 1;
    };
  }, [info.open, revision, spaceId, enterpriseId]);
  const close = (): void => {
    setInfo({ open: false });
    resetBeforeAndWillNode();
  };
  const visible = servers.filter(server =>
    `${server.name} ${server.brief}`.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <Modal
      title="添加 MCP 工具"
      open={info.open}
      onCancel={close}
      width="min(1180px, calc(100vw - 48px))"
      rootClassName="workflow-tools-modal"
      footer={null}
      style={{ top: 32 }}
      destroyOnClose
    >
      {detail ? (
        <MCPDetail
          currentTool={detail}
          handleClearMCPToolDetail={() => setDetail(null)}
        />
      ) : (
        <>
          <p className="resource-tools-section-note">
            从当前空间已接入的服务中选择工具。连接和凭据由服务端管理。
          </p>
          <div className="resource-tools-toolbar">
            <Input
              prefix={<SearchOutlined />}
              allowClear
              aria-label="搜索 MCP 服务"
              placeholder="搜索服务名称"
              value={query}
              onChange={event => setQuery(event.target.value)}
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
                window.open('/resource/mcp', '_blank', 'noopener,noreferrer')
              }
            >
              管理 MCP 服务
            </Button>
          </div>
          {error && (
            <Alert
              type="error"
              showIcon
              message="MCP 服务读取失败"
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
          ) : !visible.length && !error ? (
            <Empty
              description={
                query
                  ? '没有匹配的服务'
                  : '当前空间还没有 MCP 连接，请先接入服务。'
              }
            />
          ) : (
            <div className="workflow-mcp-servers">
              {visible.map(server => (
                <section key={server.id}>
                  <header>
                    <div>
                      <h2>{server.name}</h2>
                      <p>{server.brief}</p>
                    </div>
                    <Tag>{server.tools?.length || 0} 个工具</Tag>
                  </header>
                  {server.connectionStatus === 'error' && (
                    <Alert
                      type="error"
                      showIcon
                      message="连接失败"
                      description={
                        server.connectionMessage || '请检查配置后刷新。'
                      }
                    />
                  )}
                  {(server.tools || []).map(tool => (
                    <div className="workflow-mcp-tool" key={tool.name}>
                      <div>
                        <h3>{tool.name}</h3>
                        <p>{tool.description}</p>
                      </div>
                      <div className="resource-tools-actions">
                        <Button
                          onClick={() =>
                            setDetail({
                              id: server.id,
                              name: server.name,
                              description: server.brief,
                              icon: '',
                              updateTime: server.create_time,
                              childName: tool.name,
                            })
                          }
                        >
                          测试
                        </Button>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            const required = tool.inputSchema?.required || [];
                            const args = Object.entries(
                              tool.inputSchema?.properties || {}
                            ).map(([name, property]) => ({
                              name,
                              type: property.type,
                              description: property.description,
                              required: required.includes(name),
                              enum: property.enum,
                            }));
                            handleAddMcpNode({
                              mcpId: server.id,
                              server_url: server.server_url,
                              name: tool.name,
                              description: tool.description,
                              args,
                            } as McpType);
                          }}
                        >
                          添加
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!server.tools?.length &&
                    server.connectionStatus !== 'error' && (
                      <p className="resource-tools-section-note">
                        此服务尚未提供工具。
                      </p>
                    )}
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
