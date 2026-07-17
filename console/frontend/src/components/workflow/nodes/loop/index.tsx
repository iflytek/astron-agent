import React, { memo, useEffect, useMemo } from 'react';
import { Button, Input, InputNumber, Select } from 'antd';
import { cloneDeep } from 'lodash';
import { v4 as uuid } from 'uuid';
import { useTranslation } from 'react-i18next';
import Inputs from '@/components/workflow/nodes/components/inputs';
import Outputs from '@/components/workflow/nodes/components/outputs';
import FLowContainer from '@/components/workflow/nodes/iterator/components/flow-container';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { FlowCascader, FLowCollapse } from '@/components/workflow/ui';
import { NodeCommonProps } from '@/components/workflow/types/hooks';
import { generateReferences } from '@/components/workflow/utils/reactflowUtils';

interface LoopConditionConfig {
  leftVarIndex?: string;
  rightVarIndex?: string;
  rightValue?: ValueConfig;
  compareOperator?: string;
}

interface ValueConfig {
  type: 'literal' | 'ref';
  content: any;
}

const typeOptions = [
  { label: 'String', value: 'string' },
  { label: 'Integer', value: 'integer' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Object', value: 'object' },
  { label: 'Array', value: 'array' },
];

const compareOptions = [
  { label: '==', value: 'eq' },
  { label: '!=', value: 'ne' },
  { label: '>', value: 'gt' },
  { label: '>=', value: 'ge' },
  { label: '<', value: 'lt' },
  { label: '<=', value: 'le' },
  { label: 'contains', value: 'contains' },
  { label: 'not contains', value: 'not_contains' },
  { label: 'empty', value: 'empty' },
  { label: 'not empty', value: 'not_empty' },
  { label: 'null', value: 'null' },
  { label: 'not null', value: 'not_null' },
];

const defaultValueByType = (type: string): unknown => {
  if (type === 'integer' || type === 'number') return 0;
  if (type === 'boolean') return false;
  if (type === 'array') return [];
  if (type === 'object') return {};
  return '';
};

const getValueConfig = (value: any, fallbackType = 'string'): ValueConfig => {
  if (value?.type === 'ref' || value?.type === 'literal') {
    return value;
  }
  return {
    type: 'literal',
    content:
      typeof value !== 'undefined' ? value : defaultValueByType(fallbackType),
  };
};

const getReferenceValue = (value: ValueConfig): string[] => {
  return value?.type === 'ref' && value?.content?.nodeId
    ? [value.content.nodeId, value.content.name]
    : [];
};

const buildRefValue = (node: any): ValueConfig => ({
  type: 'ref',
  content: {
    id: node.id,
    nodeId: node.originId,
    name: node.value,
  },
});

export const LoopDetail = memo(
  (props: NodeCommonProps & { selected?: boolean }): React.ReactElement => {
    const { id, data, selected } = props;
    const { t } = useTranslation();
    const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
    const currentStore = getCurrentStore();
    const nodes = currentStore(state => state.nodes);
    const edges = currentStore(state => state.edges);
    const setNode = currentStore(state => state.setNode);
    const setNodes = currentStore(state => state.setNodes);
    const setEdges = currentStore(state => state.setEdges);
    const autoSaveCurrentFlow = useFlowsManager(
      state => state.autoSaveCurrentFlow
    );
    const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);

    const nodeParam = useMemo(() => {
      return (data?.nodeParam as Record<string, any>) || {};
    }, [data]);

    const loopVariables = useMemo(() => {
      return (nodeParam?.loopVariables || []) as any[];
    }, [nodeParam?.loopVariables]);

    const references = useMemo(() => {
      return generateReferences(nodes, edges, id);
    }, [nodes, edges, id]);

    const termination = useMemo(() => {
      return (
        nodeParam?.termination || {
          logicalOperator: 'and',
          conditions: [],
        }
      );
    }, [nodeParam?.termination]);

    const syncLoopChildren = (nextVariables: any[]): void => {
      setNodes(oldNodes => {
        const nextNodes = cloneDeep(oldNodes);
        nextNodes.forEach(node => {
          if (node?.data?.parentId !== id) return;
          if (node?.nodeType === 'loop-node-start') {
            node.data.outputs = nextVariables.map(variable => ({
              id: variable.id,
              name: variable.name,
              schema: variable.schema,
            }));
          }
          if (node?.nodeType === 'loop-node-end') {
            node.data.inputs = nextVariables.map(variable => {
              const existingInput = node.data.inputs?.find(
                input =>
                  input?.id === variable.id || input?.name === variable.name
              );
              return {
                ...(existingInput || {}),
                id: variable.id,
                name: variable.name,
                schema: {
                  ...(existingInput?.schema || {}),
                  type: variable.schema?.type || 'string',
                  value: existingInput?.schema?.value || {
                    type: 'ref',
                    content: {},
                  },
                },
              };
            });
          }
        });
        return nextNodes;
      });
    };

    const updateNodeParam = (updater: (param: Record<string, any>) => void) => {
      setNode(id, old => {
        const next = cloneDeep(old);
        const param = next.data.nodeParam || (next.data.nodeParam = {});
        updater(param);
        return next;
      });
      autoSaveCurrentFlow();
      canPublishSetNot();
    };

    const updateLoopVariables = (nextVariables: any[]): void => {
      updateNodeParam(param => {
        param.loopVariables = nextVariables;
      });
      setNode(id, old => {
        const next = cloneDeep(old);
        next.data.outputs = nextVariables.map(variable => ({
          id: variable.id,
          name: variable.name,
          schema: variable.schema,
        }));
        return next;
      });
      syncLoopChildren(nextVariables);
    };

    useEffect(() => {
      const defaultVariable = {
        id: uuid(),
        name: 'loop_value',
        schema: { type: 'string' },
        value: { type: 'literal', content: '' },
      };
      const nextVariables = loopVariables.length
        ? loopVariables
        : [defaultVariable];
      updateNodeParam(param => {
        param.maxLoopCount = Math.min(
          100,
          Math.max(1, Number(param.maxLoopCount || 10))
        );
        param.loopVariables = nextVariables;
        param.termination = param.termination || {
          logicalOperator: 'and',
          conditions: [],
        };
      });
      syncLoopChildren(nextVariables);
    }, []);

    useEffect(() => {
      const childNodesId = nodes
        ?.filter(node => node?.data?.parentId === id)
        ?.map(node => node?.id);
      setEdges(oldEdges => {
        oldEdges.forEach(edge => {
          if (
            childNodesId?.includes(edge?.target) ||
            childNodesId?.includes(edge?.source)
          ) {
            edge.zIndex = selected ? 996 : 1;
          }
        });
        return cloneDeep(oldEdges);
      });
    }, [selected, nodes, id, setEdges]);

    const variableOptions = loopVariables.map(variable => ({
      label: variable.name,
      value: variable.id || variable.name,
    }));

    return (
      <div id={id}>
        <div className="p-[14px] pb-[6px]">
          <div className="bg-[#fff] py-4 rounded-lg flex flex-col gap-2.5">
            <Inputs id={id} data={data as any} />
            <FLowCollapse
              label={
                <div className="text-base font-medium">
                  {t('workflow.nodes.loopNode.variables')}
                </div>
              }
              content={
                <div className="rounded-md px-[18px] pb-3 pointer-events-auto flex flex-col gap-3">
                  {loopVariables.map((variable, index) => (
                    <div key={variable.id} className="flex items-center gap-2">
                      <Input
                        className="flow-input"
                        style={{ width: 120 }}
                        value={variable.name}
                        onChange={event => {
                          const nextVariables = cloneDeep(loopVariables);
                          nextVariables[index].name = event.target.value;
                          updateLoopVariables(nextVariables);
                        }}
                      />
                      <Select
                        className="flow-select w-[120px]"
                        value={variable.schema?.type || 'string'}
                        options={typeOptions}
                        onChange={value => {
                          const nextVariables = cloneDeep(loopVariables);
                          nextVariables[index].schema = { type: value };
                          nextVariables[index].value = {
                            type: 'literal',
                            content: defaultValueByType(value),
                          };
                          updateLoopVariables(nextVariables);
                        }}
                      />
                      <Select
                        className="flow-select w-[96px]"
                        value={
                          getValueConfig(
                            variable.value,
                            variable.schema?.type || 'string'
                          ).type
                        }
                        options={[
                          {
                            label: t('workflow.nodes.common.input'),
                            value: 'literal',
                          },
                          {
                            label: t('workflow.nodes.common.reference'),
                            value: 'ref',
                          },
                        ]}
                        onChange={value => {
                          const nextVariables = cloneDeep(loopVariables);
                          nextVariables[index].value =
                            value === 'literal'
                              ? {
                                  type: 'literal',
                                  content: defaultValueByType(
                                    nextVariables[index].schema?.type ||
                                      'string'
                                  ),
                                }
                              : {
                                  type: 'ref',
                                  content: {},
                                };
                          updateLoopVariables(nextVariables);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        {getValueConfig(
                          variable.value,
                          variable.schema?.type || 'string'
                        ).type === 'ref' ? (
                          <FlowCascader
                            value={getReferenceValue(
                              getValueConfig(
                                variable.value,
                                variable.schema?.type || 'string'
                              )
                            )}
                            options={references}
                            handleTreeSelect={node => {
                              const nextVariables = cloneDeep(loopVariables);
                              nextVariables[index].value = buildRefValue(node);
                              nextVariables[index].schema = {
                                type: node.type || 'string',
                              };
                              updateLoopVariables(nextVariables);
                            }}
                          />
                        ) : (
                          <Input
                            className="flow-input"
                            value={
                              getValueConfig(
                                variable.value,
                                variable.schema?.type || 'string'
                              ).content
                            }
                            onChange={event => {
                              const nextVariables = cloneDeep(loopVariables);
                              nextVariables[index].value = {
                                type: 'literal',
                                content: event.target.value,
                              };
                              updateLoopVariables(nextVariables);
                            }}
                          />
                        )}
                      </div>
                      <Button
                        disabled={loopVariables.length <= 1}
                        onClick={() => {
                          updateLoopVariables(
                            loopVariables.filter((_, idx) => idx !== index)
                          );
                        }}
                      >
                        {t('workflow.nodes.common.deleteNode')}
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={() => {
                      updateLoopVariables([
                        ...loopVariables,
                        {
                          id: uuid(),
                          name: `loop_value_${loopVariables.length + 1}`,
                          schema: { type: 'string' },
                          value: { type: 'literal', content: '' },
                        },
                      ]);
                    }}
                  >
                    {t('workflow.nodes.loopNode.addVariable')}
                  </Button>
                </div>
              }
            />
            <FLowCollapse
              label={
                <div className="text-base font-medium">
                  {t('workflow.nodes.loopNode.termination')}
                </div>
              }
              content={
                <div className="rounded-md px-[18px] pb-3 pointer-events-auto flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#85898D]">
                      {t('workflow.nodes.loopNode.maxLoopCount')}
                    </span>
                    <InputNumber
                      min={1}
                      max={100}
                      precision={0}
                      value={Number(nodeParam?.maxLoopCount || 10)}
                      onChange={value =>
                        updateNodeParam(param => {
                          param.maxLoopCount = Math.min(
                            100,
                            Math.max(1, Number(value || 10))
                          );
                        })
                      }
                    />
                    <Select
                      className="flow-select w-[100px]"
                      value={termination.logicalOperator || 'and'}
                      options={[
                        { label: 'AND', value: 'and' },
                        { label: 'OR', value: 'or' },
                      ]}
                      onChange={value =>
                        updateNodeParam(param => {
                          param.termination = {
                            ...(param.termination || {}),
                            logicalOperator: value,
                            conditions: param.termination?.conditions || [],
                          };
                        })
                      }
                    />
                  </div>
                  {(termination.conditions || []).map(
                    (condition: LoopConditionConfig, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <Select
                          className="flow-select w-[120px]"
                          value={condition.leftVarIndex}
                          options={variableOptions}
                          onChange={value =>
                            updateNodeParam(param => {
                              param.termination.conditions[index].leftVarIndex =
                                value;
                            })
                          }
                        />
                        <Select
                          className="flow-select w-[130px]"
                          value={condition.compareOperator}
                          options={compareOptions}
                          onChange={value =>
                            updateNodeParam(param => {
                              param.termination.conditions[
                                index
                              ].compareOperator = value;
                            })
                          }
                        />
                        <Select
                          className="flow-select w-[96px]"
                          value={
                            getValueConfig(condition.rightValue, 'string').type
                          }
                          options={[
                            {
                              label: t('workflow.nodes.common.input'),
                              value: 'literal',
                            },
                            {
                              label: t('workflow.nodes.common.reference'),
                              value: 'ref',
                            },
                          ]}
                          onChange={value =>
                            updateNodeParam(param => {
                              const nextValue =
                                value === 'literal'
                                  ? {
                                      type: 'literal',
                                      content: condition.rightVarIndex || '',
                                    }
                                  : {
                                      type: 'ref',
                                      content: {},
                                    };
                              param.termination.conditions[index].rightValue =
                                nextValue;
                              param.termination.conditions[
                                index
                              ].rightVarIndex =
                                value === 'literal' ? nextValue.content : '';
                            })
                          }
                        />
                        <div className="flex-1 min-w-0">
                          {getValueConfig(
                            condition.rightValue || condition.rightVarIndex,
                            'string'
                          ).type === 'ref' ? (
                            <FlowCascader
                              value={getReferenceValue(
                                getValueConfig(condition.rightValue, 'string')
                              )}
                              options={references}
                              handleTreeSelect={node =>
                                updateNodeParam(param => {
                                  const nextValue = buildRefValue(node);
                                  param.termination.conditions[
                                    index
                                  ].rightValue = nextValue;
                                  param.termination.conditions[
                                    index
                                  ].rightVarIndex = node.value;
                                })
                              }
                            />
                          ) : (
                            <Input
                              className="flow-input"
                              value={
                                getValueConfig(
                                  condition.rightValue ||
                                    condition.rightVarIndex,
                                  'string'
                                ).content
                              }
                              onChange={event =>
                                updateNodeParam(param => {
                                  param.termination.conditions[
                                    index
                                  ].rightValue = {
                                    type: 'literal',
                                    content: event.target.value,
                                  };
                                  param.termination.conditions[
                                    index
                                  ].rightVarIndex = event.target.value;
                                })
                              }
                            />
                          )}
                        </div>
                        <Button
                          onClick={() =>
                            updateNodeParam(param => {
                              param.termination.conditions =
                                param.termination.conditions.filter(
                                  (_: LoopConditionConfig, idx: number) =>
                                    idx !== index
                                );
                            })
                          }
                        >
                          {t('workflow.nodes.common.deleteNode')}
                        </Button>
                      </div>
                    )
                  )}
                  <Button
                    onClick={() =>
                      updateNodeParam(param => {
                        param.termination = param.termination || {
                          logicalOperator: 'and',
                          conditions: [],
                        };
                        param.termination.conditions = [
                          ...(param.termination.conditions || []),
                          {
                            leftVarIndex:
                              loopVariables?.[0]?.id ||
                              loopVariables?.[0]?.name,
                            rightVarIndex: '',
                            rightValue: {
                              type: 'literal',
                              content: '',
                            },
                            compareOperator: 'eq',
                          },
                        ];
                      })
                    }
                  >
                    {t('workflow.nodes.loopNode.addCondition')}
                  </Button>
                </div>
              }
            />
            <Outputs id={id} data={data as any}>
              <div className="text-base font-medium">
                {t('workflow.nodes.loopNode.output')}
              </div>
            </Outputs>
          </div>
        </div>
      </div>
    );
  }
);

export const Loop = memo(
  ({ id }: { id: string; data?: any }): React.ReactElement => {
    return (
      <>
        <span className="text-xs text-[#333]">子节点</span>
        <FLowContainer id={id} />
      </>
    );
  }
);

export const LoopExitDetail = memo((props: NodeCommonProps) => {
  const { id, data } = props;
  return (
    <div id={id} className="p-[14px] pb-[6px]">
      <Inputs id={id} data={data} />
    </div>
  );
});
