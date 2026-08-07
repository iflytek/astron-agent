import React, { memo } from 'react';
import { Tooltip } from 'antd';
import { FlowSelect } from '@/components/workflow/ui';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import useUserStore from '@/store/user-store';
import { useTranslation } from 'react-i18next';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

function index({ id, data }): React.ReactElement {
  const { handleChangeNodeParam, nodeParam, models } = useNodeCommon({
    id,
    data,
  });
  const { t } = useTranslation();
  const user = useUserStore(state => state.user);
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const updateNodeRef = currentStore(state => state.updateNodeRef);

  return (
    <div className="rounded-md relative">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <FlowSelect
            value={
              nodeParam?.llmId ||
              models.find(model => model.serviceId === nodeParam?.serviceId)
                ?.llmId
            }
            onChange={value => {
              const currentModel = models.find(
                model => model.llmId === value || model.serviceId === value
              );
              handleChangeNodeParam((data, value) => {
                data.nodeParam.uid = user?.uid.toString();
                data.nodeParam.llmId = value.llmId;
                data.nodeParam.modelConfig.domain = value.domain;
                data.nodeParam.serviceId = value.serviceId;
                data.nodeParam.modelConfig.api = value.url;
                data.nodeParam.modelId = value.id;
                data.nodeParam.domain = value.domain;
                data.nodeParam.url = value.url;
                data.nodeParam.patchId = value.patchId;
                if (value.provider) {
                  data.nodeParam.source = value.provider;
                } else if (value.llmSource === 0) {
                  data.nodeParam.source = 'openai';
                } else {
                  Reflect.deleteProperty(data.nodeParam, 'source');
                }
                updateNodeRef(id);
              }, currentModel);
            }}
            dropdownRender={menu => (
              <div className="overscroll-contain">{menu}</div>
            )}
          >
            {models.map(model => (
              <FlowSelect.Option key={model.llmId} value={model.llmId}>
                <div className="w-full flex items-start justify-between overflow-hidden">
                  <div className="flex items-start gap-2 flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <img
                        src={model.icon}
                        className="w-[20px] h-[20px] flex-shrink-0"
                      />
                      <span className="text-xs">{model.name}</span>
                    </div>
                    <div className="text-sm flex items-center gap-2">
                      {model?.tag?.slice(0, 2).map((item, index) => (
                        <span
                          key={index}
                          className="rounded text-xss bg-[#ecefff] px-2 max-w-[80px] text-overflow"
                          title={item}
                        >
                          {item}
                        </span>
                      ))}
                      {model?.tag?.length > 2 && (
                        <Tooltip
                          title={
                            <div className="flex flex-wrap">
                              {model?.tag?.map((item, index) => (
                                <span
                                  key={index}
                                  className="rounded text-xss bg-[#ecefff] mb-1 mr-1 px-2 py-1"
                                  title={item}
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          }
                          overlayClassName="white-tooltip"
                        >
                          <span
                            className="rounded text-xss bg-[#ecefff] px-2 text-[333] text-sm"
                            onClick={event => event.stopPropagation()}
                          >
                            +{model?.tag?.length - 2}
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              </FlowSelect.Option>
            ))}
          </FlowSelect>
        </div>
      </div>
      {nodeParam?.llmIdErrMsg && (
        <p className="text-xs text-[#F74E43]">{nodeParam?.llmIdErrMsg}</p>
      )}
    </div>
  );
}

export default memo(index);
