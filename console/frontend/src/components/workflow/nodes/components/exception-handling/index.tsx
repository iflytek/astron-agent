import React, { useCallback, useMemo } from 'react';
import { Tooltip, Switch } from 'antd';
import {
  FLowCollapse,
  FlowInputNumber,
  FlowSelect,
} from '@/components/workflow/ui';
import { cloneDeep } from 'lodash';
import {
  checkedNodeOutputData,
  generateOrUpdateObject,
} from '@/components/workflow/utils/reactflowUtils';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import JsonMonacoEditor from '@/components/monaco-editor/JsonMonacoEditor';
import { v4 as uuid } from 'uuid';
import { isJSON } from '@/utils';
import { useTranslation } from 'react-i18next';
import { useMemoizedFn } from 'ahooks';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { UseExceptionHandlingReturn } from '@/components/workflow/types';

import questionMark from '@/assets/imgs/common/questionmark.png';

const useExceptionHandling = ({
  id,
  data,
  currentNode,
}): UseExceptionHandlingReturn => {
  const { t } = useTranslation();
  // 使用国际化翻译的选项
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const currentStore = getCurrentStore();
  const setNode = currentStore(state => state.setNode);
  const setEdges = currentStore(state => state.setEdges);
  const edges = currentStore(state => state.edges);
  const removeNodeRef = currentStore(state => state.removeNodeRef);
  const retryTimesOptions = useMemo(
    () => [
      { label: t('workflow.exceptionHandling.retryOptions.noRetry'), value: 0 },
      {
        label: t('workflow.exceptionHandling.retryOptions.retry1Time'),
        value: 1,
      },
      {
        label: t('workflow.exceptionHandling.retryOptions.retry2Times'),
        value: 2,
      },
      {
        label: t('workflow.exceptionHandling.retryOptions.retry3Times'),
        value: 3,
      },
      {
        label: t('workflow.exceptionHandling.retryOptions.retry4Times'),
        value: 4,
      },
      {
        label: t('workflow.exceptionHandling.retryOptions.retry5Times'),
        value: 5,
      },
    ],
    [t]
  );

  const exceptionHandlingMethodOptions = useMemo(
    () => [
      {
        label: t(
          'workflow.exceptionHandling.exceptionMethods.interruptFlow.label'
        ),
        value: 0,
        description: t(
          'workflow.exceptionHandling.exceptionMethods.interruptFlow.description'
        ),
      },
      {
        label: t(
          'workflow.exceptionHandling.exceptionMethods.returnSetContent.label'
        ),
        value: 1,
        description: t(
          'workflow.exceptionHandling.exceptionMethods.returnSetContent.description'
        ),
      },
      {
        label: t(
          'workflow.exceptionHandling.exceptionMethods.executeExceptionFlow.label'
        ),
        value: 2,
        description: t(
          'workflow.exceptionHandling.exceptionMethods.executeExceptionFlow.description'
        ),
      },
    ],
    [t]
  );

  const handleChangeNodeParam = useCallback(
    (key, value, fn?) => {
      setNode(id, old => {
        if (old?.data?.retryConfig) {
          old.data.retryConfig[key] = value;
        } else {
          old.data.retryConfig = {
            [key]: value,
          };
        }
        fn && fn(old.data, value);
        return {
          ...cloneDeep(old),
        };
      });
      autoSaveCurrentFlow();
      canPublishSetNot();
    },
    [id, autoSaveCurrentFlow]
  );

  const showExceptionHandlingOutput = useMemo(() => {
    return (
      data?.retryConfig?.errorStrategy === 2 ||
      data?.retryConfig?.errorStrategy === 1
    );
  }, [data]);

  const exceptionHandlingOutput = useMemo(() => {
    return showExceptionHandlingOutput
      ? [
          {
            id: uuid(),
            name: 'errorCode',
            schema: {
              type: 'string',
              default: t('workflow.exceptionHandling.errorCode'),
            },
            nameErrMsg: '',
          },
          {
            id: uuid(),
            name: 'errorMessage',
            schema: {
              type: 'string',
              default: t('workflow.exceptionHandling.errorMessage'),
            },
            nameErrMsg: '',
          },
        ]
      : [];
  }, [showExceptionHandlingOutput, t]);

  const handleAddExceptionHandlingEdge = useCallback(data => {
    if (!data?.nodeParam?.exceptionHandlingEdge) {
      data.nodeParam.exceptionHandlingEdge = `fail_one_of::${uuid()}`;
    }
    if (!data?.nodeParam?.handlingEdge) {
      const handlingEdge = `normal_one_of::${uuid()}`;
      data.nodeParam.handlingEdge = handlingEdge;
      setEdges(edges => {
        return edges.map(edge => {
          if (edge?.source === id) {
            edge.sourceHandle = handlingEdge;
            edge.id = `reactflow__edge-${edge?.source}${handlingEdge}-${edge?.target}`;
          }
          return edge;
        });
      });
    }
  }, []);
  const handleCustomOutput = useMemoizedFn(data => {
    if (!checkedNodeOutputData(data?.outputs, currentNode)) {
      data.retryConfig.customOutput = JSON.stringify({ output: '' }, null, 2);
      data.nodeParam.setAnswerContentErrMsg = t(
        'workflow.exceptionHandling.validationMessages.outputVariableNameValidationFailed'
      );
    } else {
      data.retryConfig.customOutput = JSON.stringify(
        generateOrUpdateObject(
          data?.outputs,
          isJSON(data?.retryConfig.customOutput)
            ? JSON.parse(data?.retryConfig.customOutput)
            : null
        ),
        null,
        2
      );
      data.nodeParam.setAnswerContentErrMsg = '';
    }
  });

  const handleRemoveExceptionHandlingEdge = useCallback(() => {
    const edge = edges?.find(
      item => item?.sourceHandle === data?.nodeParam?.exceptionHandlingEdge
    );
    if (edge && data?.nodeParam?.exceptionHandlingEdge) {
      removeNodeRef(edge.source, edge.target);
      setEdges(edges =>
        edges?.filter(
          item => item?.sourceHandle !== data?.nodeParam?.exceptionHandlingEdge
        )
      );
    }
  }, [data?.nodeParam?.exceptionHandlingEdge, edges, removeNodeRef, setEdges]);

  return {
    showExceptionHandlingOutput,
    exceptionHandlingOutput,
    retryTimesOptions,
    exceptionHandlingMethodOptions,
    handleChangeNodeParam,
    handleAddExceptionHandlingEdge,
    handleRemoveExceptionHandlingEdge,
    handleCustomOutput,
  };
};

const ExceptionHandlingSwitch = ({
  id,
  data,
  handleChangeNodeParam,
  handleAddExceptionHandlingEdge,
  handleRemoveExceptionHandlingEdge,
  handleCustomOutput,
}): React.ReactElement => {
  const { t } = useTranslation();
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const updateNodeRef = currentStore(state => state.updateNodeRef);

  return (
    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2 justify-between w-full">
        <h4 className="text-base font-medium">
          {t('workflow.exceptionHandling.title')}
        </h4>
        <Tooltip
          title={t('workflow.exceptionHandling.tooltip')}
          overlayClassName="black-tooltip"
        >
          <img src={questionMark} width={12} alt="" />
        </Tooltip>
      </div>
      <Switch
        className="list-switch config-switch"
        checked={data?.retryConfig?.shouldRetry}
        onChange={value => {
          handleChangeNodeParam('shouldRetry', value, oldData => {
            if (value) {
              handleAddExceptionHandlingEdge(data);
            }
            if (!value && data?.retryConfig?.errorStrategy === 2) {
              handleRemoveExceptionHandlingEdge();
            }
            if (!value) {
              Reflect.deleteProperty(oldData?.retryConfig, 'customOutput');
            }
            if (value && oldData?.retryConfig?.errorStrategy === 1) {
              handleCustomOutput(oldData);
            }
            updateNodeRef(id);
          });
        }}
      />
    </div>
  );
};

const ExceptionHandlingForm = ({
  id,
  data,
  currentNode,
  retryTimesOptions,
  exceptionHandlingMethodOptions,
  handleChangeNodeParam,
  handleRemoveExceptionHandlingEdge,
  handleCustomOutput,
}): React.ReactElement => {
  const { t } = useTranslation();
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const updateNodeRef = currentStore(state => state.updateNodeRef);
  return (
    <>
      <div className="flex items-start gap-3 text-desc px-[18px] mb-4">
        <div className="w-1/4 flex items-center gap-1">
          <h4>{t('workflow.exceptionHandling.timeout')}</h4>
          <Tooltip
            title={t('workflow.exceptionHandling.timeoutTooltip')}
            overlayClassName="black-tooltip"
          >
            <img src={questionMark} width={12} alt="" />
          </Tooltip>
        </div>
        <h4 className="w-1/4">{t('workflow.exceptionHandling.retryTimes')}</h4>
        <h4 className="flex-1">
          {t('workflow.exceptionHandling.exceptionHandlingMethod')}
        </h4>
      </div>
      <div className="flex items-start gap-3 text-desc px-[18px] mb-4">
        <div className="w-1/4 flex items-center gap-1 relative">
          <FlowInputNumber
            value={
              data?.retryConfig?.timeout === undefined
                ? 60
                : data?.retryConfig?.timeout
            }
            onChange={value => handleChangeNodeParam('timeout', value)}
            onBlur={() => {
              if (data?.retryConfig?.timeout === null) {
                handleChangeNodeParam('timeout', 60);
              }
            }}
            min={0.1}
            max={120}
            step={0.1}
            className="nodrag w-full "
            controls={false}
          />
          <div className="absolute right-2 top-1 text-desc z-50">s</div>
        </div>
        <h4 className="w-1/4">
          <FlowSelect
            value={data?.retryConfig?.maxRetries || 0}
            onChange={value => handleChangeNodeParam('maxRetries', value)}
            options={retryTimesOptions}
          />
        </h4>
        <div className="flex-1">
          <FlowSelect
            value={data?.retryConfig?.errorStrategy || 0}
            onChange={value =>
              handleChangeNodeParam('errorStrategy', value, (data, value) => {
                if (value === 1 || value === 0) {
                  handleRemoveExceptionHandlingEdge();
                }
                if (value === 0 || value === 2) {
                  Reflect.deleteProperty(data?.retryConfig, 'customOutput');
                }
                if (value === 1) {
                  handleCustomOutput(data);
                }
                updateNodeRef(id);
              })
            }
          >
            {exceptionHandlingMethodOptions?.map(item => (
              <FlowSelect.Option key={item.value} value={item.value}>
                <Tooltip
                  title={item.description}
                  overlayClassName="black-tooltip"
                  placement="left"
                >
                  {item.label}
                </Tooltip>
              </FlowSelect.Option>
            ))}
          </FlowSelect>
        </div>
      </div>
    </>
  );
};

const ExceptionHandlingCustomOutput = ({
  data,
  handleChangeNodeParam,
}): React.ReactElement | null => {
  const { t } = useTranslation();
  if (data?.retryConfig?.errorStrategy !== 1) return null;
  return (
    <div className="px-[18px]">
      <h4 className="text-sm font-medium my-2">
        {t('workflow.exceptionHandling.setAnswerContent')}
      </h4>
      <div>
        <JsonMonacoEditor
          value={data?.retryConfig?.customOutput}
          onChange={value =>
            handleChangeNodeParam('customOutput', value, data => {
              if (!data?.retryConfig?.customOutput) {
                data.nodeParam.setAnswerContentErrMsg = t(
                  'workflow.exceptionHandling.validationMessages.valueCannotBeEmpty'
                );
              } else if (!isJSON(data?.retryConfig?.customOutput)) {
                data.nodeParam.setAnswerContentErrMsg = t(
                  'workflow.exceptionHandling.validationMessages.invalidJsonFormat'
                );
              } else {
                data.nodeParam.setAnswerContentErrMsg = '';
              }
            })
          }
          height="180px"
          className="nodrag"
        />
      </div>
      <div className="text-xs text-[#F74E43]">
        {data?.nodeParam?.setAnswerContentErrMsg}
      </div>
    </div>
  );
};

const ExceptionHandlingOutputPreview = ({
  showExceptionHandlingOutput,
  exceptionHandlingOutput,
}): React.ReactElement | null => {
  const { t } = useTranslation();
  if (!showExceptionHandlingOutput) return null;
  return (
    <div className="flex flex-col px-[18px]">
      <h4 className="text-sm font-medium my-2">
        {t('workflow.exceptionHandling.errorInfo')}
      </h4>
      {exceptionHandlingOutput?.map(item => (
        <div key={item?.id} className="flex items-start gap-2">
          <span>{item?.name}</span>
          <div className="bg-[#F0F0F0] px-2.5 py-0.5 rounded text-xs">
            String
          </div>
        </div>
      ))}
    </div>
  );
};

function index({ id, data }): React.ReactElement {
  const { currentNode } = useNodeCommon({
    id,
    data,
  });
  const {
    showExceptionHandlingOutput,
    retryTimesOptions,
    exceptionHandlingOutput,
    exceptionHandlingMethodOptions,
    handleChangeNodeParam,
    handleAddExceptionHandlingEdge,
    handleRemoveExceptionHandlingEdge,
    handleCustomOutput,
  } = useExceptionHandling({ id, data, currentNode });

  return (
    <FLowCollapse
      label={
        <ExceptionHandlingSwitch
          id={id}
          data={data}
          handleChangeNodeParam={handleChangeNodeParam}
          handleAddExceptionHandlingEdge={handleAddExceptionHandlingEdge}
          handleRemoveExceptionHandlingEdge={handleRemoveExceptionHandlingEdge}
          handleCustomOutput={handleCustomOutput}
        />
      }
      content={
        <>
          {data?.retryConfig?.shouldRetry ? (
            <div className="rounded-md">
              <ExceptionHandlingForm
                id={id}
                data={data}
                currentNode={currentNode}
                retryTimesOptions={retryTimesOptions}
                exceptionHandlingMethodOptions={exceptionHandlingMethodOptions}
                handleChangeNodeParam={handleChangeNodeParam}
                handleRemoveExceptionHandlingEdge={
                  handleRemoveExceptionHandlingEdge
                }
                handleCustomOutput={handleCustomOutput}
              />
              <ExceptionHandlingCustomOutput
                data={data}
                handleChangeNodeParam={handleChangeNodeParam}
              />
              <ExceptionHandlingOutputPreview
                showExceptionHandlingOutput={showExceptionHandlingOutput}
                exceptionHandlingOutput={exceptionHandlingOutput}
              />
            </div>
          ) : null}
        </>
      }
    />
  );
}

export default index;
