import React, { memo, useMemo } from 'react';
import { Button, Checkbox, Input, InputNumber } from 'antd';
import { cloneDeep } from 'lodash';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';

import {
  FLowCollapse,
  FlowCascader,
  FlowSelect,
} from '@/components/workflow/ui';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { NodeCommonProps } from '@/components/workflow/types/hooks';
import {
  createVariableAggregationInput,
  filterVariableAggregationReferences,
  getVariableAggregationDefaultFallbackValue,
  isVariableAggregationTypeCompatible,
  normalizeVariableAggregationInputs,
} from '@/components/workflow/utils/variable-aggregation';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';

const OUTPUT_TYPE_OPTIONS = [
  { label: 'String', value: 'string' },
  { label: 'Integer', value: 'integer' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Object', value: 'object' },
  { label: 'Array<String>', value: 'array-string' },
  { label: 'Array<Integer>', value: 'array-integer' },
  { label: 'Array<Number>', value: 'array-number' },
  { label: 'Array<Boolean>', value: 'array-boolean' },
  { label: 'Array<Object>', value: 'array-object' },
];

interface FallbackInputProps {
  outputType: string;
  fallbackValue: any;
  updateFallbackValue: (value: any) => void;
  disabled: boolean;
}

function FallbackInput({
  outputType,
  fallbackValue,
  updateFallbackValue,
  disabled,
}: FallbackInputProps): React.ReactElement {
  if (outputType === 'boolean') {
    return (
      <FlowSelect
        disabled={disabled}
        value={fallbackValue}
        options={[
          { label: 'true', value: true },
          { label: 'false', value: false },
        ]}
        onChange={(value: any) => updateFallbackValue(value)}
      />
    );
  }

  if (outputType === 'integer') {
    return (
      <InputNumber
        disabled={disabled}
        controls={false}
        className="w-full"
        precision={0}
        value={fallbackValue}
        onChange={value => updateFallbackValue(value ?? 0)}
      />
    );
  }

  if (outputType === 'number') {
    return (
      <InputNumber
        disabled={disabled}
        controls={false}
        className="w-full"
        value={fallbackValue}
        onChange={value => updateFallbackValue(value ?? 0)}
      />
    );
  }

  if (
    [
      'object',
      'array-string',
      'array-integer',
      'array-number',
      'array-boolean',
      'array-object',
    ].includes(outputType)
  ) {
    return (
      <Input.TextArea
        disabled={disabled}
        autoSize={{ minRows: 3, maxRows: 8 }}
        value={fallbackValue}
        onChange={event => updateFallbackValue(event.target.value)}
      />
    );
  }

  return (
    <Input
      disabled={disabled}
      value={fallbackValue}
      onChange={event => updateFallbackValue(event.target.value)}
    />
  );
}

export const VariableAggregationDetail = memo(
  ({ id, data }: NodeCommonProps): React.ReactElement => {
    const { t } = useTranslation();
    const {
      inputs = [],
      outputs = [],
      references = [],
      nodeParam = {},
      canvasesDisabled,
    } = useNodeCommon({ id, data }) as any;
    const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
    const currentStore = getCurrentStore();
    const setNode = currentStore((state: any) => state.setNode);
    const takeSnapshot = currentStore((state: any) => state.takeSnapshot);
    const checkNode = currentStore((state: any) => state.checkNode);
    const updateNodeRef = currentStore((state: any) => state.updateNodeRef);
    const autoSaveCurrentFlow = useFlowsManager(
      state => state.autoSaveCurrentFlow
    );
    const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);

    const output = outputs[0];
    const outputType = output?.schema?.type || 'string';
    const compatibleReferences = useMemo(
      () =>
        filterVariableAggregationReferences(references as any[], outputType),
      [references, outputType]
    );

    const persistNodeChange = useMemoizedFn(() => {
      autoSaveCurrentFlow();
      canPublishSetNot();
      updateNodeRef(id);
      checkNode(id);
    });

    const updateNode = useMemoizedFn(
      (callback: (old: any) => void, takeHistory = false) => {
        if (takeHistory) {
          takeSnapshot();
        }
        setNode(id, (old: any) => {
          callback(old);
          return cloneDeep(old);
        });
        persistNodeChange();
      }
    );

    const updateOutputName = useMemoizedFn((value: string) => {
      updateNode((old: any) => {
        old.data.outputs[0].name = value;
      });
    });

    const updateOutputType = useMemoizedFn((value: string) => {
      updateNode((old: any) => {
        const previousType = old.data.outputs[0]?.schema?.type;
        old.data.outputs[0].schema.type = value;
        old.data.inputs = normalizeVariableAggregationInputs(
          old.data.inputs.map((input: any) => {
            const hasCompatibleReference = isVariableAggregationTypeCompatible(
              input?.schema?.type,
              value
            );
            if (hasCompatibleReference) {
              return {
                ...input,
                schema: {
                  ...input.schema,
                  type: value,
                },
              };
            }
            return {
              ...input,
              schema: {
                type: value,
                value: {
                  type: 'ref',
                  content: {},
                  contentErrMsg: '',
                },
              },
            };
          }),
          value
        );
        if (previousType !== value) {
          old.data.nodeParam.fallbackValue =
            getVariableAggregationDefaultFallbackValue(value);
        }
      });
    });

    const updateCandidateReference = useMemoizedFn(
      (inputId: string, node: any) => {
        updateNode((old: any) => {
          const currentInput = old.data.inputs.find(
            (input: any) => input.id === inputId
          );
          if (!currentInput) {
            return;
          }
          currentInput.schema.type = node.type;
          currentInput.fileType = node.fileType;
          currentInput.schema.value.content = {
            id: node.id,
            nodeId: node.originId,
            name: node.value,
          };
          currentInput.schema.value.contentErrMsg = '';
        });
      }
    );

    const addCandidate = useMemoizedFn(() => {
      updateNode((old: any) => {
        const nextInputs = [
          ...old.data.inputs,
          createVariableAggregationInput(
            old.data.inputs.length + 1,
            outputType
          ),
        ];
        old.data.inputs = normalizeVariableAggregationInputs(
          nextInputs,
          outputType
        );
      }, true);
    });

    const moveCandidate = useMemoizedFn((index: number, offset: number) => {
      updateNode((old: any) => {
        const nextIndex = index + offset;
        if (
          nextIndex < 0 ||
          nextIndex >= old.data.inputs.length ||
          index === nextIndex
        ) {
          return;
        }
        const nextInputs = [...old.data.inputs];
        const [targetInput] = nextInputs.splice(index, 1);
        nextInputs.splice(nextIndex, 0, targetInput);
        old.data.inputs = normalizeVariableAggregationInputs(
          nextInputs,
          outputType
        );
      }, true);
    });

    const removeCandidate = useMemoizedFn((inputId: string) => {
      updateNode((old: any) => {
        old.data.inputs = normalizeVariableAggregationInputs(
          old.data.inputs.filter((input: any) => input.id !== inputId),
          outputType
        );
      }, true);
    });

    const updateFallbackEnabled = useMemoizedFn((checked: boolean) => {
      updateNode((old: any) => {
        old.data.nodeParam.fallbackEnabled = checked;
        if (checked && old.data.nodeParam.fallbackValue === undefined) {
          old.data.nodeParam.fallbackValue =
            getVariableAggregationDefaultFallbackValue(outputType);
        }
      });
    });

    const updateFallbackValue = useMemoizedFn((value: any) => {
      updateNode((old: any) => {
        old.data.nodeParam.fallbackValue = value;
      });
    });

    return (
      <div id={id}>
        <div className="p-[14px] pb-[6px]">
          <div className="bg-[#fff] rounded-lg flex flex-col gap-2.5">
            <FLowCollapse
              label={
                <div className="text-base font-medium">
                  {t('workflow.nodes.variableAggregationNode.output')}
                </div>
              }
              content={
                <div className="px-[18px] flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-desc">
                    <h4 className="flex-1">
                      {t('workflow.nodes.common.variableName')}
                    </h4>
                    <h4 className="w-1/3">
                      {t('workflow.nodes.common.variableType')}
                    </h4>
                  </div>
                  <div className="flex items-start gap-3">
                    <Input
                      disabled={canvasesDisabled}
                      value={output?.name}
                      onChange={event => updateOutputName(event.target.value)}
                    />
                    <div className="w-1/3">
                      <FlowSelect
                        disabled={canvasesDisabled}
                        value={outputType}
                        options={OUTPUT_TYPE_OPTIONS}
                        onChange={updateOutputType}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-[#F74E43]">
                    {String(output?.nameErrMsg || '')}
                  </div>
                </div>
              }
            />

            <FLowCollapse
              label={
                <div className="text-base font-medium">
                  {t('workflow.nodes.variableAggregationNode.candidates')}
                </div>
              }
              content={
                <div className="px-[18px] flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-desc">
                    <h4 className="flex-1">
                      {t('workflow.nodes.variableAggregationNode.priority')}
                    </h4>
                    <h4 className="flex-[2]">
                      {t('workflow.nodes.common.referenceVariable')}
                    </h4>
                    <span className="w-[120px]" />
                  </div>
                  {inputs.map((input: any, index: number) => {
                    const cascaderValue = input?.schema?.value?.content?.nodeId
                      ? [
                          input?.schema?.value?.content?.nodeId,
                          input?.schema?.value?.content?.name,
                        ]
                      : [];

                    return (
                      <div key={input.id} className="flex flex-col gap-1">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 pt-1 text-sm text-[#6A7385]">
                            {t(
                              'workflow.nodes.variableAggregationNode.candidateLabel',
                              {
                                index: index + 1,
                              }
                            )}
                          </div>
                          <div className="flex-[2]">
                            <FlowCascader
                              value={cascaderValue}
                              options={compatibleReferences}
                              handleTreeSelect={(node: any) =>
                                updateCandidateReference(input.id, node)
                              }
                            />
                          </div>
                          <div className="w-[120px] flex items-center justify-end gap-1">
                            <Button
                              size="small"
                              disabled={canvasesDisabled || index === 0}
                              onClick={() => moveCandidate(index, -1)}
                            >
                              {t(
                                'workflow.nodes.variableAggregationNode.moveUp'
                              )}
                            </Button>
                            <Button
                              size="small"
                              disabled={
                                canvasesDisabled || index === inputs.length - 1
                              }
                              onClick={() => moveCandidate(index, 1)}
                            >
                              {t(
                                'workflow.nodes.variableAggregationNode.moveDown'
                              )}
                            </Button>
                            <img
                              src={remove}
                              className="w-[16px] h-[17px] mt-1"
                              style={{
                                cursor:
                                  canvasesDisabled || inputs.length <= 1
                                    ? 'not-allowed'
                                    : 'pointer',
                                opacity:
                                  canvasesDisabled || inputs.length <= 1
                                    ? 0.5
                                    : 1,
                              }}
                              onClick={() =>
                                !canvasesDisabled &&
                                inputs.length > 1 &&
                                removeCandidate(input.id)
                              }
                              alt=""
                            />
                          </div>
                        </div>
                        <div className="text-xs text-[#F74E43]">
                          {String(input?.schema?.value?.contentErrMsg || '')}
                        </div>
                      </div>
                    );
                  })}
                  {!canvasesDisabled && (
                    <div
                      className="text-[#6356EA] text-xs font-medium inline-flex items-center cursor-pointer gap-1.5"
                      onClick={addCandidate}
                    >
                      <img src={inputAddIcon} className="w-3 h-3" alt="" />
                      <span>{t('workflow.nodes.common.add')}</span>
                    </div>
                  )}
                </div>
              }
            />

            <FLowCollapse
              label={
                <div className="text-base font-medium">
                  {t('workflow.nodes.variableAggregationNode.fallback')}
                </div>
              }
              content={
                <div className="px-[18px] flex flex-col gap-3">
                  <Checkbox
                    disabled={canvasesDisabled}
                    checked={Boolean(nodeParam?.fallbackEnabled)}
                    onChange={event =>
                      updateFallbackEnabled(event.target.checked)
                    }
                  >
                    {t('workflow.nodes.variableAggregationNode.enableFallback')}
                  </Checkbox>
                  {nodeParam?.fallbackEnabled && (
                    <>
                      <FallbackInput
                        outputType={outputType}
                        fallbackValue={nodeParam?.fallbackValue}
                        updateFallbackValue={updateFallbackValue}
                        disabled={canvasesDisabled}
                      />
                      <div className="text-xs text-[#F74E43]">
                        {String(nodeParam?.fallbackValueErrMsg || '')}
                      </div>
                    </>
                  )}
                </div>
              }
            />
          </div>
        </div>
      </div>
    );
  }
);
