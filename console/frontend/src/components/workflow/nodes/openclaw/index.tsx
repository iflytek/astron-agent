import React, { memo } from 'react';
import {
  FlowInput,
  FlowInputNumber,
  FlowSelect,
  FlowTemplateEditor,
  FLowCollapse,
} from '@/components/workflow/ui';
import Inputs from '@/components/workflow/nodes/components/inputs';
import FixedOutputs from '@/components/workflow/nodes/components/fixed-outputs';
import ExceptionHandling from '@/components/workflow/nodes/components/exception-handling';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import {
  NodeCommonProps,
  NodeDataType,
} from '@/components/workflow/types/hooks';

type OpenClawTuningParams = {
  temperature?: number;
  max_steps?: number;
};

type OpenClawNodeParam = {
  mcpServerId?: string;
  mcpServerUrl?: string;
  toolName?: string;
  skillName?: string;
  executionMode?: string;
  preCondition?: string;
  postCondition?: string;
  tuningParams?: OpenClawTuningParams;
  mcpServerIdErrMsg?: string;
  mcpServerUrlErrMsg?: string;
  toolNameErrMsg?: string;
  skillNameErrMsg?: string;
};

const readString = (
  nodeParam: Record<string, unknown> | null | undefined,
  key: keyof OpenClawNodeParam
): string => {
  if (!nodeParam) return '';
  const value = nodeParam[key];
  return typeof value === 'string' ? value : '';
};

const readTuningParams = (
  nodeParam: Record<string, unknown> | null | undefined
): OpenClawTuningParams => {
  if (!nodeParam) return {};
  const value = nodeParam.tuningParams;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as OpenClawTuningParams;
};

const ensureTuningParams = (
  data: NodeDataType
): Record<string, unknown> => {
  const nodeParam = data.nodeParam || {};
  if (
    !nodeParam.tuningParams ||
    typeof nodeParam.tuningParams !== 'object' ||
    Array.isArray(nodeParam.tuningParams)
  ) {
    nodeParam.tuningParams = {};
  }
  data.nodeParam = nodeParam;
  return nodeParam.tuningParams as Record<string, unknown>;
};

const ConfigRow = ({
  label,
  required = false,
  children,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}): React.ReactElement => (
  <div className="flex flex-col gap-1">
    <div className="text-sm text-[#333]">
      {required && <span className="text-[#F74E43] mr-1">*</span>}
      {label}
    </div>
    {children}
    {error && <div className="text-[#F74E43] text-xs">{error}</div>}
  </div>
);

const RuntimeConfig = ({
  id,
  data,
}: NodeCommonProps): React.ReactElement => {
  const { handleChangeNodeParam, nodeParam, canvasesDisabled } = useNodeCommon({
    id,
    data,
  });
  const tuningParams = readTuningParams(nodeParam);

  return (
    <FLowCollapse
      label={<div className="text-base font-medium">OpenClaw 配置</div>}
      content={
        <div
          className="rounded-md px-[18px] pb-3 pointer-events-auto flex flex-col gap-3"
          style={{ pointerEvents: canvasesDisabled ? 'none' : 'auto' }}
        >
          <ConfigRow
            label="MCP 服务地址"
            required
            error={readString(nodeParam, 'mcpServerUrlErrMsg')}
          >
            <FlowInput
              value={readString(nodeParam, 'mcpServerUrl')}
              placeholder="https://example.com/mcp/sse"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChangeNodeParam(
                  (data, value) => {
                    data.nodeParam = data.nodeParam || {};
                    data.nodeParam.mcpServerUrl = value;
                  },
                  e.target.value
                )
              }
            />
          </ConfigRow>
          <ConfigRow
            label="MCP 服务 ID"
            error={readString(nodeParam, 'mcpServerIdErrMsg')}
          >
            <FlowInput
              value={readString(nodeParam, 'mcpServerId')}
              placeholder="可选；填写后优先使用已注册服务"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChangeNodeParam(
                  (data, value) => {
                    data.nodeParam = data.nodeParam || {};
                    data.nodeParam.mcpServerId = value;
                  },
                  e.target.value
                )
              }
            />
          </ConfigRow>
          <ConfigRow
            label="工具名"
            required
            error={readString(nodeParam, 'toolNameErrMsg')}
          >
            <FlowInput
              value={readString(nodeParam, 'toolName') || 'run_skill'}
              placeholder="run_skill"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChangeNodeParam(
                  (data, value) => {
                    data.nodeParam = data.nodeParam || {};
                    data.nodeParam.toolName = value;
                  },
                  e.target.value
                )
              }
            />
          </ConfigRow>
          <ConfigRow
            label="Skill 名称"
            required
            error={readString(nodeParam, 'skillNameErrMsg')}
          >
            <FlowInput
              value={readString(nodeParam, 'skillName')}
              placeholder="chatclaw-builder"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChangeNodeParam(
                  (data, value) => {
                    data.nodeParam = data.nodeParam || {};
                    data.nodeParam.skillName = value;
                  },
                  e.target.value
                )
              }
            />
          </ConfigRow>
          <ConfigRow label="执行模式">
            <FlowSelect
              value={readString(nodeParam, 'executionMode') || 'chatclaw'}
              onChange={(value: string) =>
                handleChangeNodeParam(
                  (data, value) => {
                    data.nodeParam = data.nodeParam || {};
                    data.nodeParam.executionMode = value;
                  },
                  value
                )
              }
              options={[
                { label: 'ChatClaw 应用构建', value: 'chatclaw' },
                { label: 'OpenClaw Skill 执行', value: 'skill' },
                { label: '可视化微调', value: 'fine_tune' },
              ]}
            />
          </ConfigRow>
          <div className="grid grid-cols-2 gap-3">
            <ConfigRow label="温度">
              <FlowInputNumber
                value={tuningParams.temperature}
                min={0}
                max={1}
                step={0.1}
                precision={2}
                controls={false}
                onChange={(value: number | null) =>
                  handleChangeNodeParam(
                    (data, value) => {
                      const params = ensureTuningParams(data);
                      params.temperature = value;
                    },
                    value
                  )
                }
              />
            </ConfigRow>
            <ConfigRow label="最大步骤">
              <FlowInputNumber
                value={tuningParams.max_steps}
                min={1}
                max={100}
                precision={0}
                controls={false}
                onChange={(value: number | null) =>
                  handleChangeNodeParam(
                    (data, value) => {
                      const params = ensureTuningParams(data);
                      params.max_steps = value;
                    },
                    value
                  )
                }
              />
            </ConfigRow>
          </div>
          <ConfigRow label="前置条件">
            <FlowTemplateEditor
              id={id}
              data={data}
              value={readString(nodeParam, 'preCondition')}
              placeholder="运行 Skill 前需要满足或补充的条件"
              onChange={(value: string) =>
                handleChangeNodeParam(
                  (data, value) => {
                    data.nodeParam = data.nodeParam || {};
                    data.nodeParam.preCondition = value;
                  },
                  value
                )
              }
            />
          </ConfigRow>
          <ConfigRow label="后置条件">
            <FlowTemplateEditor
              id={id}
              data={data}
              value={readString(nodeParam, 'postCondition')}
              placeholder="运行后对输出进行检查、整理或约束"
              onChange={(value: string) =>
                handleChangeNodeParam(
                  (data, value) => {
                    data.nodeParam = data.nodeParam || {};
                    data.nodeParam.postCondition = value;
                  },
                  value
                )
              }
            />
          </ConfigRow>
        </div>
      }
    />
  );
};

export const OpenClawDetail = memo(
  ({ id, data }: NodeCommonProps): React.ReactElement => (
    <div className="p-[14px] pb-[6px]">
      <div className="bg-[#fff] rounded-lg flex flex-col gap-2.5">
        <RuntimeConfig id={id} data={data} />
        <Inputs id={id} data={data} />
        <FixedOutputs id={id} data={data} />
        <ExceptionHandling id={id} data={data} />
      </div>
    </div>
  )
);
