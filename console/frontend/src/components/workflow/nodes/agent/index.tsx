import React, { memo, useEffect, useState } from 'react';
import { Alert, Button, Select, Spin } from 'antd';
import { listAgents, type AgentDefinition } from '@/services/agents';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import type { NodeComponentProps, NodeDataProps } from '../types';
import { FLowCollapse } from '@/components/workflow/ui';
import Inputs from '../components/inputs';
import Outputs from '../components/outputs';
import ExceptionHandling from '../components/exception-handling';

// Remove only the retired inline execution settings; branch handles and editor
// metadata belong to the workflow node and must survive Agent selection.
const inlineAgentFields = [
  'appId',
  'uid',
  'modelConfig',
  'instruction',
  'plugin',
  'enableChatHistoryV2',
  'maxLoopCount',
  'maxLoopCountErrMsg',
  'llmId',
  'llmSource',
  'llmIdErrMsg',
  'serviceId',
  'modelId',
  'model',
  'modelName',
  'modelEnabled',
  'domain',
  'url',
  'source',
  'apiKey',
  'apiSecret',
  'maxTokens',
  'extraParams',
  'prompt',
] as const;

export const Agent = memo(({ data }: NodeDataProps) => (
  <>
    <div className="text-right">Agent</div>
    <span>{data.nodeParam.agentName || '请选择 Agent'}</span>
  </>
));

export const AgentDetail = memo(({ id, data }: NodeComponentProps) => {
  const { handleChangeNodeParam } = useNodeCommon({ id, data });
  const disabled = useFlowsManager(state => state.canvasesDisabled);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    const fetchAll = async (): Promise<void> => {
      const items: AgentDefinition[] = [];
      let page = 1;
      while (true) {
        const result = await listAgents({ page, pageSize: 100 });
        items.push(...result.records);
        if (items.length >= result.total || !result.records.length) break;
        page += 1;
      }
      if (!ignore) setAgents(items);
    };
    void fetchAll()
      .catch(() => {
        if (!ignore) setError('Agent 列表加载失败，请重试');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return (): void => {
      ignore = true;
    };
  }, [reload]);
  const selected = agents.find(agent => agent.id === data.nodeParam.agentId);
  const unavailable =
    !loading &&
    !error &&
    data.nodeParam.agentId &&
    (!selected || !selected.publishedVersionId);
  return (
    <div className="p-[14px] flex flex-col gap-3">
      <FLowCollapse
        label="Agent"
        content={
          <div className="px-[18px] pb-4 flex flex-col gap-3">
            <p className="text-sm text-[#607089]">
              选择当前空间中的 Agent，使用它已发布的模型、提示词与工具。
            </p>
            <Select
              className="w-full"
              aria-label="选择 Agent"
              showSearch
              optionFilterProp="label"
              loading={loading}
              disabled={disabled}
              placeholder="选择已发布的 Agent"
              value={data.nodeParam.agentId}
              status={
                data.nodeParam.agentIdErrMsg || unavailable
                  ? 'error'
                  : undefined
              }
              notFoundContent={
                loading ? <Spin size="small" /> : '没有可选的 Agent'
              }
              options={agents.map(agent => ({
                value: agent.id,
                label: agent.publishedVersionId
                  ? agent.botName
                  : `${agent.botName}（尚未发布）`,
                disabled: !agent.publishedVersionId,
              }))}
              onChange={(agentId: number) =>
                handleChangeNodeParam(node => {
                  for (const field of inlineAgentFields) {
                    Reflect.deleteProperty(node.nodeParam, field);
                  }
                  node.nodeParam.agentId = agentId;
                  node.nodeParam.agentName = agents.find(
                    agent => agent.id === agentId
                  )?.botName;
                  node.nodeParam.agentIdErrMsg = '';
                }, undefined)
              }
            />
            {error && (
              <Alert
                type="error"
                message={error}
                action={
                  <Button
                    size="small"
                    onClick={() => setReload(value => value + 1)}
                  >
                    重试
                  </Button>
                }
              />
            )}
            {!loading && !error && !agents.length && (
              <p className="text-sm text-[#607089]">
                当前空间还没有 Agent，请先创建并发布一个 Agent。
              </p>
            )}
            {(data.nodeParam.agentIdErrMsg || unavailable) && (
              <p role="alert" className="text-sm text-red-600">
                {unavailable
                  ? '此 Agent 不可用，请重新选择'
                  : data.nodeParam.agentIdErrMsg}
              </p>
            )}
            {!data.nodeParam.agentId && !error && (
              <p className="text-sm text-[#607089]">
                请选择已发布的 Agent 后运行。
              </p>
            )}
            {selected && (
              <p className="text-sm text-[#607089]">
                {selected.botDesc ||
                  '每次新运行使用最新发布版本；重试和恢复保留原版本。'}
              </p>
            )}
          </div>
        }
      />
      <Inputs id={id} data={data} />
      <Outputs id={id} data={data} />
      <ExceptionHandling id={id} data={data} />
    </div>
  );
});
