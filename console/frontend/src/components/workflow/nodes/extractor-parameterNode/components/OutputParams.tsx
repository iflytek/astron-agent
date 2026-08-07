import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlowNodeInput, FlowSelect } from '@/components/workflow/ui';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';

function index({ id, data }): React.ReactElement {
  const {
    handleChangeOutputParam,
    handleAddOutputLine,
    handleRemoveOutputLine,
    renderTypeInput,
    handleCustomOutputGenerate,
    outputs,
  } = useNodeCommon({
    id,
    data,
  });
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const { t } = useTranslation();

  return (
    <div className="rounded-md px-[18px]">
      <div className="flex items-start gap-3 text-desc">
        <h4 className="w-1/4">{t('workflow.nodes.common.variableName')}</h4>
        <h4 className="w-1/4">{t('workflow.nodes.common.variableType')}</h4>
        <h4 className="flex-1">{t('workflow.nodes.common.description')}</h4>
        {outputs.length > 1 && <span className="w-5 h-5"></span>}
      </div>
      <div className="flex flex-col gap-3">
        {outputs.map(item => (
          <div key={item.id} className="flex flex-col gap-1">
            <div className="flex items-start gap-3">
              <div className="flex flex-col w-1/4 flex-shrink-0">
                <FlowNodeInput
                  nodeId={id}
                  maxLength={30}
                  className="w-full"
                  value={item.name}
                  onChange={value =>
                    handleChangeOutputParam(
                      item?.id,
                      (data, value) => (data.name = value),
                      value
                    )
                  }
                  onBlur={() => handleCustomOutputGenerate()}
                />
              </div>
              <div className="flex flex-col w-1/4">
                <FlowSelect
                  value={item?.schema?.type}
                  options={[
                    {
                      label: 'String',
                      value: 'string',
                    },
                    {
                      label: 'Integer',
                      value: 'integer',
                    },
                    {
                      label: 'Boolean',
                      value: 'boolean',
                    },
                    {
                      label: 'Number',
                      value: 'number',
                    },
                    {
                      label: 'Array<String>',
                      value: 'array-string',
                    },
                    {
                      label: 'Array<Integer>',
                      value: 'array-integer',
                    },
                    {
                      label: 'Array<Boolean>',
                      value: 'array-boolean',
                    },
                    {
                      label: 'Array<Number>',
                      value: 'array-number',
                    },
                  ]}
                  onChange={value =>
                    handleChangeOutputParam(
                      item?.id,
                      (data, value) => {
                        data.schema.type = value;
                      },
                      value
                    )
                  }
                />
              </div>
              <div className="flex flex-col flex-1 h-full">
                {renderTypeInput(item)}
              </div>
              {!canvasesDisabled && outputs.length > 1 && (
                <img
                  src={remove}
                  className="w-[16px] h-[17px] cursor-pointer mt-1.5"
                  onClick={() => handleRemoveOutputLine(item.id)}
                  alt=""
                />
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-[#F74E43]">
              <div className="flex flex-col w-1/4">{item?.nameErrMsg}</div>
              <div className="flex flex-col w-1/4"></div>
              <div className="flex flex-col flex-1">
                {item?.schema?.descriptionErrMsg}
              </div>
            </div>
          </div>
        ))}
      </div>
      {!canvasesDisabled && (
        <div
          className="text-[#6356EA] text-xs font-medium mt-1 inline-flex items-center cursor-pointer gap-1.5"
          onClick={() => handleAddOutputLine()}
        >
          <img src={inputAddIcon} className="w-3 h-3" alt="" />
          <span>{t('workflow.nodes.common.add')}</span>
        </div>
      )}
    </div>
  );
}

export default index;
