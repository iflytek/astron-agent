import React, { memo, useEffect, useMemo } from 'react';
import Inputs from '@/components/workflow/nodes/components/inputs';
import Outputs from '@/components/workflow/nodes/components/outputs';
import FLowContainer from './components/flow-container';
import { useTranslation } from 'react-i18next';
import { cloneDeep } from 'lodash';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useMemoizedFn } from 'ahooks';
import { Select, Slider, InputNumber, message } from 'antd';
import { FLowCollapse } from '@/components/workflow/ui';

export const IteratorDetail = memo(
  (props: {
    id: string;
    data?: Record<string, unknown>;
    selected?: boolean;
  }): React.ReactElement => {
    const { id, data, selected } = props;

    const { t } = useTranslation();
    const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
    const currentStore = getCurrentStore();
    const autoSaveCurrentFlow = useFlowsManager(
      state => state.autoSaveCurrentFlow
    );
    const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
    const nodes = currentStore(state => state.nodes);
    const setEdges = currentStore(state => state.setEdges);
    const setNode = currentStore(state => state.setNode);

    const hasQuestionAnswerChildNode = useMemo(() => {
      return (
        nodes?.some(
          node =>
            node?.data?.parentId === id && node?.nodeType === 'question-answer'
        ) ?? false
      );
    }, [nodes, id]);

    const nodeParam = useMemo(() => {
      return (data?.nodeParam as Record<string, unknown>) || {};
    }, [data]);

    const ensureDefaultRunConfig = useMemoizedFn(() => {
      setNode(id, old => {
        const next = cloneDeep(old);
        const param =
          (next.data.nodeParam as Record<string, unknown>) ||
          (next.data.nodeParam = {});
        let changed = false;

        if (!param.runMode) {
          param.runMode = 'serial';
          changed = true;
        }

        const isParallel = param.runMode === 'parallel';
        if (param.isParallel !== isParallel) {
          param.isParallel = isParallel;
          changed = true;
        }

        if (!param.errorStrategy) {
          param.errorStrategy =
            (param as { errorResponseMethod?: string })?.errorResponseMethod ||
            'fail_fast';
          changed = true;
        }

        if (isParallel) {
          if (
            param.maxConcurrency === undefined ||
            param.maxConcurrency === null
          ) {
            param.maxConcurrency = 2;
            changed = true;
          }
        } else if ('maxConcurrency' in param) {
          delete param.maxConcurrency;
          changed = true;
        }

        if ('errorResponseMethod' in param) {
          delete (param as { errorResponseMethod?: string })
            .errorResponseMethod;
          changed = true;
        }

        if (!param.key) {
          const firstInputName = (next.data as { inputs?: { name?: string }[] })
            ?.inputs?.[0]?.name;
          if (firstInputName) {
            param.key = firstInputName;
            changed = true;
          }
        }

        return changed ? next : old;
      });
    });

    const handleChangeNodeParam = useMemoizedFn(
      (key: string, value: unknown) => {
        if (
          key === 'runMode' &&
          value === 'parallel' &&
          hasQuestionAnswerChildNode
        ) {
          message.warning(
            t('workflow.nodes.iteratorNode.cannotSwitchToParallelWithQa')
          );
          return;
        }
        setNode(id, old => {
          const next = cloneDeep(old);
          const param =
            (next.data.nodeParam as Record<string, unknown>) ||
            (next.data.nodeParam = {});

          if (key === 'runMode') {
            const runMode = value as string;
            const isParallel = runMode === 'parallel';

            param.runMode = runMode;
            param.isParallel = isParallel;

            if (isParallel) {
              param.maxConcurrency = param.maxConcurrency ?? 2;
            } else {
              delete param.maxConcurrency;
            }

            delete (param as { errorResponseMethod?: string })
              .errorResponseMethod;
          } else if (key === 'errorStrategy') {
            param.errorStrategy = value;
            delete (param as { errorResponseMethod?: string })
              .errorResponseMethod;
          } else if (key === 'maxConcurrency') {
            param.maxConcurrency = value;
          } else {
            param[key] = value;
          }

          return next;
        });
        autoSaveCurrentFlow();
        canPublishSetNot();
      }
    );

    useEffect(() => {
      ensureDefaultRunConfig();
    }, [ensureDefaultRunConfig]);

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
            if (selected) {
              edge.zIndex = 996;
            } else {
              edge.zIndex = 1;
            }
          }
        });
        return cloneDeep(oldEdges);
      });
    }, [selected, nodes, id, setEdges]);

    return (
      <div id={id}>
        <div className="p-[14px] pb-[6px]">
          <div className="bg-[#fff] py-4 rounded-lg flex flex-col gap-2.5">
            <Inputs id={id} data={data as any} />
            <FLowCollapse
              label={
                <div className="text-base font-medium">
                  {t('workflow.nodes.iteratorNode.runConfigTitle')}
                </div>
              }
              content={
                <div className="rounded-md px-[18px] pb-3 pointer-events-auto flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Select
                      className="flow-select mt-2"
                      value={(nodeParam?.runMode as string) || 'serial'}
                      options={[
                        {
                          label: t('workflow.nodes.iteratorNode.serialMode'),
                          value: 'serial',
                        },
                        {
                          label: t('workflow.nodes.iteratorNode.parallelMode'),
                          value: 'parallel',
                          disabled: hasQuestionAnswerChildNode,
                        },
                      ]}
                      onChange={value =>
                        handleChangeNodeParam('runMode', value)
                      }
                    />
                  </div>
                  {nodeParam?.runMode === 'parallel' && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[12px] leading-[20px] font-normal text-[#85898D]">
                        {t('workflow.nodes.iteratorNode.maxConcurrencyLabel')}
                      </span>
                      <div className="flex items-center gap-3">
                        <Slider
                          className="flex-1 config-slider"
                          min={2}
                          max={10}
                          step={1}
                          value={Math.min(
                            10,
                            Math.max(
                              2,
                              (nodeParam?.maxConcurrency as number) ?? 2
                            )
                          )}
                          onChange={value =>
                            handleChangeNodeParam('maxConcurrency', value)
                          }
                        />
                        <InputNumber
                          className="flow-input-number w-[72px]"
                          min={2}
                          max={10}
                          controls
                          precision={0}
                          value={Math.min(
                            10,
                            Math.max(
                              2,
                              (nodeParam?.maxConcurrency as number) ?? 2
                            )
                          )}
                          onKeyDown={e => e.stopPropagation()}
                          onChange={value =>
                            handleChangeNodeParam(
                              'maxConcurrency',
                              typeof value === 'number' ? value : 2
                            )
                          }
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <span className="text-[12px] leading-[20px] font-normal text-[#85898D]">
                      {t('workflow.nodes.iteratorNode.errorHandlingLabel')}
                    </span>
                    <Select
                      className="flow-select"
                      value={
                        (nodeParam?.errorStrategy as string) || 'fail_fast'
                      }
                      options={[
                        {
                          label: t(
                            'workflow.nodes.iteratorNode.errorHandlingOptions.failFast'
                          ),
                          value: 'fail_fast',
                        },
                        {
                          label: t(
                            'workflow.nodes.iteratorNode.errorHandlingOptions.continue'
                          ),
                          value: 'continue',
                        },
                        {
                          label: t(
                            'workflow.nodes.iteratorNode.errorHandlingOptions.ignoreErrorOutput'
                          ),
                          value: 'ignore_error_output',
                        },
                      ]}
                      onChange={value =>
                        handleChangeNodeParam('errorStrategy', value)
                      }
                    />
                  </div>
                </div>
              }
            />
            <Outputs id={id} data={data as any}>
              <div className="text-base font-medium">
                {t('workflow.nodes.iteratorNode.output')}
              </div>
            </Outputs>
          </div>
        </div>
      </div>
    );
  }
);

export const Iterator = memo(({ id }: { id: string }): React.ReactElement => {
  return (
    <>
      <span className="text-xs text-[#333]">子节点</span>
      <FLowContainer id={id} />
    </>
  );
});
