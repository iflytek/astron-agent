import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from 'antd';
import { FLowCollapse, FlowTemplateEditor } from '@/components/workflow/ui';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import Inputs from '@/components/workflow/nodes/components/inputs';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

export const MessageDetail = memo(props => {
  const { id, data } = props;
  const { handleChangeNodeParam, nodeParam } = useNodeCommon({ id, data });
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const delayCheckNode = currentStore(state => state.delayCheckNode);
  return (
    <div id={id}>
      <div className="p-[14px] pb-[6px]">
        <div className="bg-[#fff] rounded-lg flex flex-col gap-2.5">
          <Inputs id={id} data={data}>
            <div className="text-base font-medium">
              {t('workflow.nodes.common.input')}
            </div>
          </Inputs>
          <FLowCollapse
            label={
              <div className="flex items-center justify-between text-base font-medium">
                <div>{t('workflow.nodes.messageNode.answerContent')}</div>
                <div
                  className="flex items-center gap-2"
                  style={{
                    pointerEvents: canvasesDisabled ? 'none' : 'auto',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div>{t('workflow.nodes.messageNode.streamOutput')}</div>
                  <Switch
                    className="list-switch"
                    checked={nodeParam?.streamOutput}
                    onChange={value =>
                      handleChangeNodeParam((data, value) => {
                        data.nodeParam.streamOutput = value;
                      }, value)
                    }
                  />
                </div>
              </div>
            }
            content={
              <div className="px-[18px] pb-3 pointer-events-auto">
                <FlowTemplateEditor
                  id={id}
                  data={data}
                  onBlur={() => delayCheckNode(id)}
                  value={nodeParam?.template}
                  onChange={value =>
                    handleChangeNodeParam((data, value) => {
                      data.nodeParam.template = value;
                    }, value)
                  }
                  placeholder={t(
                    'workflow.nodes.messageNode.formatPlaceholder'
                  )}
                />
                <p className="text-xs text-[#F74E43]">
                  {data.nodeParam.templateErrMsg}
                </p>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
});
