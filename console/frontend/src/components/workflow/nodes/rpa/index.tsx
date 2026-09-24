import React, { memo } from 'react';
import { Switch } from 'antd';
import FixedOutputs from '../components/fixed-outputs';
import ExceptionHandling from '../components/exception-handling';
import SingleInput from '../components/single-input';
import { NodeCommonProps } from '../../types';
import {
  FlowInput,
  FlowSelect,
  FlowTextArea,
  FLowCollapse,
} from '@/components/workflow/ui';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

const readString = (
  nodeParam: Record<string, unknown> | null | undefined,
  key: string
): string => {
  const value = nodeParam?.[key];
  return typeof value === 'string' ? value : '';
};

const readStringList = (
  nodeParam: Record<string, unknown> | null | undefined,
  key: string
): string => {
  const value = nodeParam?.[key];
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return '';
};

const ControlRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <div className="text-sm text-[#333]">{label}</div>
    {children}
  </div>
);

const OpenClawControlConfig = memo(({ id, data }: NodeCommonProps) => {
  const { handleChangeNodeParam, nodeParam, canvasesDisabled } = useNodeCommon({
    id,
    data,
  });

  const setNodeParamValue = (
    key: string,
    value: unknown,
    formatter?: (value: unknown) => unknown
  ) => {
    handleChangeNodeParam(
      (data, value) => {
        data.nodeParam = data.nodeParam || {};
        data.nodeParam[key] = formatter ? formatter(value) : value;
      },
      value
    );
  };

  return (
    <FLowCollapse
      label={<div className="text-base font-medium">OpenClaw 安全触发</div>}
      content={
        <div
          className="rounded-md px-[18px] pb-3 pointer-events-auto flex flex-col gap-3"
          style={{ pointerEvents: canvasesDisabled ? 'none' : 'auto' }}
        >
          <ControlRow label="触发来源">
            <FlowSelect
              value={readString(nodeParam, 'triggerSource')}
              placeholder="默认关闭"
              options={[
                { label: '默认 RPA 调用', value: '' },
                { label: 'OpenClaw 安全触发', value: 'openclaw' },
              ]}
              onChange={(value: string) =>
                setNodeParamValue('triggerSource', value)
              }
            />
          </ControlRow>
          <ControlRow label="固定场景">
            <FlowInput
              value={readString(nodeParam, 'scenario')}
              placeholder="financial_reimbursement"
              onChange={e => setNodeParamValue('scenario', e.target.value)}
            />
            {readString(nodeParam, 'scenarioErrMsg') && (
              <p className="text-xs text-[#F74E43]">
                {readString(nodeParam, 'scenarioErrMsg')}
              </p>
            )}
          </ControlRow>
          <ControlRow label="允许场景白名单">
            <FlowTextArea
              value={readStringList(nodeParam, 'allowedScenarios')}
              placeholder="多个场景用英文逗号分隔"
              onChange={e =>
                setNodeParamValue(
                  'allowedScenarios',
                  e.target.value,
                  value =>
                    String(value)
                      .split(',')
                      .map(item => item.trim())
                      .filter(Boolean)
                )
              }
            />
          </ControlRow>
          <div className="grid grid-cols-2 gap-3">
            <ControlRow label="校验触发签名">
              <Switch
                checked={Boolean(nodeParam?.triggerAuthRequired)}
                onChange={checked =>
                  setNodeParamValue('triggerAuthRequired', checked)
                }
              />
            </ControlRow>
            <ControlRow label="需要人工审批">
              <Switch
                checked={Boolean(nodeParam?.approvalRequired)}
                onChange={checked =>
                  setNodeParamValue('approvalRequired', checked)
                }
              />
            </ControlRow>
          </div>
          <ControlRow label="签名密钥环境变量">
            <FlowInput
              value={
                readString(nodeParam, 'triggerSecretEnv') ||
                'OPENCLAW_RPA_TRIGGER_SECRET'
              }
              placeholder="OPENCLAW_RPA_TRIGGER_SECRET"
              onChange={e =>
                setNodeParamValue('triggerSecretEnv', e.target.value)
              }
            />
            {readString(nodeParam, 'triggerSecretEnvErrMsg') && (
              <p className="text-xs text-[#F74E43]">
                {readString(nodeParam, 'triggerSecretEnvErrMsg')}
              </p>
            )}
          </ControlRow>
          <ControlRow label="签名输入变量">
            <FlowInput
              value={
                readString(nodeParam, 'triggerSignatureInput') ||
                'trigger_signature'
              }
              placeholder="trigger_signature"
              onChange={e =>
                setNodeParamValue('triggerSignatureInput', e.target.value)
              }
            />
            {readString(nodeParam, 'triggerSignatureInputErrMsg') && (
              <p className="text-xs text-[#F74E43]">
                {readString(nodeParam, 'triggerSignatureInputErrMsg')}
              </p>
            )}
          </ControlRow>
          <div className="grid grid-cols-2 gap-3">
            <ControlRow label="审批状态">
              <FlowSelect
                value={readString(nodeParam, 'approvalStatus')}
                placeholder="pending"
                options={[
                  { label: '待审批', value: 'pending' },
                  { label: '已批准', value: 'approved' },
                  { label: '已拒绝', value: 'rejected' },
                ]}
                onChange={(value: string) =>
                  setNodeParamValue('approvalStatus', value)
                }
              />
            </ControlRow>
            <ControlRow label="审批人">
              <FlowInput
                value={readString(nodeParam, 'approver')}
                placeholder="finance-lead"
                onChange={e => setNodeParamValue('approver', e.target.value)}
              />
            </ControlRow>
          </div>
          <ControlRow label="风险等级">
            <FlowSelect
              value={readString(nodeParam, 'riskLevel') || 'high'}
              options={[
                { label: '高风险', value: 'high' },
                { label: '中风险', value: 'medium' },
                { label: '低风险', value: 'low' },
              ]}
              onChange={(value: string) => setNodeParamValue('riskLevel', value)}
            />
          </ControlRow>
        </div>
      }
    />
  );
});

export const RpaDetail = memo((props: NodeCommonProps) => {
  const { id, data } = props;

  return (
    <div className="p-[14px] pb-[6px]">
      <OpenClawControlConfig id={id} data={data} />
      <SingleInput id={id} data={data} />
      <FixedOutputs id={id} data={data} />
      <ExceptionHandling id={id} data={data} />
    </div>
  );
});
