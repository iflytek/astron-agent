import React, { memo } from 'react';
import {
  FlowSelect,
  FlowTemplateEditor,
  FLowCollapse,
} from '@/components/workflow/ui';
import { v4 as uuid } from 'uuid';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import Inputs from '@/components/workflow/nodes/components/inputs';
import Outputs from '@/components/workflow/nodes/components/outputs';
import ExceptionHandling from '@/components/workflow/nodes/components/exception-handling';
import { useTranslation } from 'react-i18next';
import {
  checkedNodeOutputData,
  generateOrUpdateObject,
} from '@/components/workflow/utils/reactflowUtils';
import { isJSON } from '@/utils';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { ModelSection } from '@/components/workflow/nodes/node-common';

import promptOptimizationIcon from '@/assets/imgs/workflow/prompt-optimization-icon.png';

const PromptSection = ({
  id,
  data,
  handleChangeNodeParam,
}): React.ReactElement => {
  const { t } = useTranslation();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const setPromptOptimizeModalInfo = useFlowsManager(
    state => state.setPromptOptimizeModalInfo
  );
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const delayCheckNode = currentStore(state => state.delayCheckNode);

  return (
    <FLowCollapse
      label={
        <div className="flex items-center justify-between">
          <h4 className="text-base font-medium">
            {t('workflow.nodes.largeModelNode.prompt')}
          </h4>
        </div>
      }
      content={
        <div className="rounded-md px-[18px] pb-3 pointer-events-auto">
          {/* System Prompt */}
          <div className="my-2 flex items-center justify-between">
            <span>{t('workflow.nodes.largeModelNode.systemPrompt')}</span>
            {!canvasesDisabled && data?.nodeParam?.systemTemplate?.trim() && (
              <img
                src={promptOptimizationIcon}
                className="w-[18px] h-[18px] cursor-pointer"
                alt=""
                onClick={e => {
                  e.stopPropagation();
                  setPromptOptimizeModalInfo({
                    open: true,
                    nodeId: id,
                    key: 'systemTemplate',
                  });
                }}
              />
            )}
          </div>
          <FlowTemplateEditor
            id={id}
            data={data}
            onBlur={() => delayCheckNode(id)}
            value={data?.nodeParam?.systemTemplate}
            onChange={value =>
              handleChangeNodeParam(
                (data, value) => (data.nodeParam.systemTemplate = value),
                value
              )
            }
            placeholder={t(
              'workflow.nodes.largeModelNode.systemPromptPlaceholder'
            )}
          />

          {/* User Prompt */}
          <div className="mb-2 mt-3 flex items-center justify-between">
            <span>{t('workflow.nodes.largeModelNode.userPrompt')}</span>
            {!canvasesDisabled && data?.nodeParam?.template?.trim() && (
              <img
                src={promptOptimizationIcon}
                className="w-[18px] h-[18px] cursor-pointer"
                alt=""
                onClick={e => {
                  e.stopPropagation();
                  setPromptOptimizeModalInfo({
                    open: true,
                    nodeId: id,
                    key: 'template',
                  });
                }}
              />
            )}
          </div>
          <FlowTemplateEditor
            id={id}
            data={data}
            onBlur={() => delayCheckNode(id)}
            value={data?.nodeParam?.template}
            onChange={value =>
              handleChangeNodeParam(
                (data, value) => (data.nodeParam.template = value),
                value
              )
            }
            placeholder={t(
              'workflow.nodes.largeModelNode.userPromptPlaceholder'
            )}
          />
          <p className="text-xs text-[#F74E43]">
            {data.nodeParam.templateErrMsg}
          </p>
        </div>
      }
    />
  );
};

const MultimediaSection = ({
  id,
  data,
  handleChangeNodeParam,
}): React.ReactElement => {
  const { t } = useTranslation();
  const { inputs, handleChangeInputParam, handleAddInputLine, allowAddInput } =
    useNodeCommon({ id, data });
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);

  return (
    <FLowCollapse
      label={
        <div className="flex items-center justify-between">
          <h4 className="text-base font-medium">
            {t('workflow.nodes.largeModelNode.multimedia')}
          </h4>
        </div>
      }
      content={
        <div className="rounded-md px-[18px] pb-3 pointer-events-auto">
          <div className="flex flex-col gap-1">
            {/* Add multimedia input button */}
            {!canvasesDisabled && allowAddInput && (
              <button
                className="text-[#6356EA] text-xs font-medium mt-2 inline-flex items-center cursor-pointer gap-1.5"
                onClick={() => handleAddInputLine()}
              >
                <span>
                  + {t('workflow.nodes.largeModelNode.addMultimediaInput')}
                </span>
              </button>
            )}

            {/* Render all inputs as multimedia inputs */}
            {inputs.map(input => (
              <div key={input.id} className="flex flex-col gap-1">
                <div className="flex items-start gap-3 overflow-hidden">
                  <div className="flex flex-col flex-shrink-0 w-1/3">
                    <input
                      className="border rounded p-1 w-full"
                      value={input?.name || ''}
                      onChange={e =>
                        handleChangeInputParam(
                          input.id,
                          (data, val) => (data.name = val),
                          e.target.value
                        )
                      }
                      placeholder={t(
                        'workflow.nodes.largeModelNode.multimediaNamePlaceholder'
                      )}
                      disabled={canvasesDisabled}
                    />
                  </div>
                  <div className="flex flex-col flex-shrink-0 w-1/4">
                    {canvasesDisabled ? (
                      <span>
                        {input?.schema?.value?.type === 'literal'
                          ? t('workflow.nodes.common.input')
                          : t('workflow.nodes.common.reference')}
                      </span>
                    ) : (
                      <select
                        className="border rounded p-1 w-full"
                        value={input?.schema?.value?.type || 'literal'}
                        onChange={e =>
                          handleChangeInputParam(
                            input.id,
                            (data, val) => {
                              data.schema.value.type = val;
                              if (val === 'literal') {
                                data.schema.value.content = '';
                              } else {
                                data.schema.value.content = {};
                              }
                            },
                            e.target.value
                          )
                        }
                      >
                        <option value="literal">
                          {t('workflow.nodes.common.input')}
                        </option>
                        <option value="ref">
                          {t('workflow.nodes.common.reference')}
                        </option>
                      </select>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    {input?.schema?.value?.type === 'literal' ? (
                      <input
                        className="border rounded p-1 w-full"
                        value={input?.schema?.value?.content || ''}
                        onChange={e =>
                          handleChangeInputParam(
                            input.id,
                            (data, val) => (data.schema.value.content = val),
                            e.target.value
                          )
                        }
                        placeholder={t(
                          'workflow.nodes.largeModelNode.multimediaInputPlaceholder'
                        )}
                        disabled={canvasesDisabled}
                      />
                    ) : (
                      <div>
                        <input
                          className="border rounded p-1 w-full"
                          value={
                            typeof input?.schema?.value?.content === 'object'
                              ? JSON.stringify(input?.schema?.value?.content)
                              : input?.schema?.value?.content || ''
                          }
                          onChange={e =>
                            handleChangeInputParam(
                              input.id,
                              (data, val) => (data.schema.value.content = val),
                              e.target.value
                            )
                          }
                          placeholder={t(
                            'workflow.nodes.largeModelNode.multimediaRefPlaceholder'
                          )}
                          disabled={canvasesDisabled}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {inputs.length === 0 && (
              <div className="text-sm text-gray-500 italic">
                {t('workflow.nodes.largeModelNode.noMultimediaInput')}
              </div>
            )}
          </div>
        </div>
      }
    />
  );
};

const OutputSection = ({
  id,
  data,
  handleChangeNodeParam,
}): React.ReactElement => {
  const { currentNode, isThinkModel } = useNodeCommon({ id, data });
  const { t } = useTranslation();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const updateNodeRef = currentStore(state => state.updateNodeRef);
  return (
    <Outputs id={id} data={data}>
      <div className="flex-1 flex items-center justify-between">
        <div className="text-base font-medium">{t('common.output')}</div>
        <div
          className="w-[180px] flex items-center gap-2"
          onClick={e => e.stopPropagation()}
          style={{
            pointerEvents: canvasesDisabled ? 'none' : 'auto',
          }}
        >
          <span>{t('workflow.nodes.largeModelNode.outputFormat')}</span>
          <div className="flex-1">
            <FlowSelect
              value={data?.nodeParam?.respFormat}
              options={[
                {
                  label: 'text',
                  value: 0,
                },
                {
                  label: 'json',
                  value: 2,
                },
              ]}
              onChange={value =>
                handleChangeNodeParam((data, value) => {
                  data.nodeParam.respFormat = value;
                  if (data.nodeParam.respFormat === 0) {
                    data.outputs = isThinkModel
                      ? [
                          {
                            id: uuid(),
                            customParameterType: 'deepseekr1',
                            name: 'REASONING_CONTENT',
                            nameErrMsg: '',
                            schema: {
                              default: t(
                                'workflow.nodes.largeModelNode.modelThinkingProcess'
                              ),
                              type: 'string',
                            },
                          },
                          {
                            id: uuid(),
                            name: 'output',
                            schema: {
                              type: 'string',
                              default: '',
                            },
                          },
                        ]
                      : [
                          {
                            id: uuid(),
                            name: 'output',
                            schema: {
                              type: 'string',
                              default: '',
                            },
                          },
                        ];
                    updateNodeRef(id);
                  } else {
                    data.outputs = [
                      {
                        id: uuid(),
                        name: 'output',
                        schema: {
                          type: 'string',
                          default: '',
                        },
                      },
                    ];
                  }
                  if (!checkedNodeOutputData(data?.outputs, currentNode)) {
                    const customOutput = JSON.stringify(
                      { output: '' },
                      null,
                      2
                    );
                    if (data?.retryConfig) {
                      data.retryConfig.customOutput = customOutput;
                    } else {
                      data.retryConfig = {
                        customOutput,
                      };
                    }
                    data.nodeParam.setAnswerContentErrMsg =
                      '输出中变量名校验不通过,自动生成JSON失败';
                  } else {
                    const customOutput = JSON.stringify(
                      generateOrUpdateObject(
                        data?.outputs,
                        isJSON(data?.retryConfig?.customOutput)
                          ? JSON.parse(data?.retryConfig?.customOutput)
                          : null
                      ),
                      null,
                      2
                    );
                    if (data?.retryConfig) {
                      data.retryConfig.customOutput = customOutput;
                    } else {
                      data.retryConfig = {
                        customOutput,
                      };
                    }
                    data.nodeParam.setAnswerContentErrMsg = '';
                  }
                }, value)
              }
            />
          </div>
        </div>
      </div>
    </Outputs>
  );
};

export const LargeModelDetail = memo(({ id, data }): React.ReactElement => {
  const { handleChangeNodeParam } = useNodeCommon({
    id,
    data,
  });

  // Check if any selected model has multimodal capability
  const models = data?.nodeParam?.model || [];
  const selectedModel = models.find(model => model?.checked);
  const hasMultimodalCapability = selectedModel?.multiMode === true;

  return (
    <div className="p-[14px] pb-[6px]">
      <div className="bg-[#fff] rounded-lg w-full flex flex-col gap-2.5">
        <ModelSection id={id} data={data} />
        <Inputs id={id} data={data} />
        <PromptSection
          id={id}
          data={data}
          handleChangeNodeParam={handleChangeNodeParam}
        />
        {hasMultimodalCapability && (
          <MultimediaSection
            id={id}
            data={data}
            handleChangeNodeParam={handleChangeNodeParam}
          />
        )}
        <OutputSection
          id={id}
          data={data}
          handleChangeNodeParam={handleChangeNodeParam}
        />
        <ExceptionHandling id={id} data={data} />
      </div>
    </div>
  );
});
