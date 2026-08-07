import React, { memo } from 'react';
import { Switch } from 'antd';
import { useTranslation } from 'react-i18next';
import Inputs from '@/components/workflow/nodes/components/inputs';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import {
  FlowSelect,
  FLowCollapse,
  FlowTemplateEditor,
} from '@/components/workflow/ui';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

export const EndDetail = memo(props => {
  const { id, data } = props;
  const { handleChangeNodeParam, nodeParam, isEndNode } = useNodeCommon({
    id,
    data,
  });
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const delayCheckNode = currentStore(state => state.delayCheckNode);

  return (
    <div id={id}>
      <div className="p-[14px] pb-[6px]">
        <div className="bg-[#fff] rounded-lg flex flex-col gap-[18px]">
          {isEndNode && (
            <FLowCollapse
              label={
                <div className="flex items-center justify-between text-base font-medium">
                  {t('workflow.nodes.endNode.answerMode')}
                </div>
              }
              content={
                <div className="px-[14px]">
                  <FlowSelect
                    placeholder={t('workflow.nodes.endNode.selectPlaceholder')}
                    value={nodeParam?.outputMode}
                    options={[
                      {
                        label: t('workflow.nodes.endNode.returnParams'),
                        value: 0,
                      },
                      {
                        label: t('workflow.nodes.endNode.returnFormat'),
                        value: 1,
                      },
                    ]}
                    onChange={value =>
                      handleChangeNodeParam(
                        (data, value) => (data.nodeParam.outputMode = value),
                        value
                      )
                    }
                  />
                </div>
              }
            />
          )}
          <Inputs id={id} data={data} />
          {nodeParam?.outputMode === 1 && (
            <FLowCollapse
              label={
                <div className="flex items-center justify-between text-base font-medium">
                  <div>{t('workflow.nodes.endNode.thinkingContent')}</div>
                </div>
              }
              content={
                <div className="px-[14px]">
                  <FlowTemplateEditor
                    id={id}
                    data={data}
                    value={nodeParam?.reasoningTemplate}
                    onChange={value =>
                      handleChangeNodeParam(
                        (data, value) =>
                          (data.nodeParam.reasoningTemplate = value),
                        value
                      )
                    }
                    placeholder={t(
                      'workflow.nodes.endNode.templatePlaceholder'
                    )}
                  />
                </div>
              }
            />
          )}
          {nodeParam?.outputMode === 1 && (
            <FLowCollapse
              label={
                <div className="flex items-center justify-between text-base font-medium">
                  <div>{t('workflow.nodes.endNode.answerContent')}</div>
                  <div
                    className="flex items-center gap-2"
                    style={{
                      pointerEvents: canvasesDisabled ? 'none' : 'auto',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div>{t('workflow.nodes.endNode.streamOutput')}</div>
                    <Switch
                      className="list-switch"
                      checked={nodeParam?.streamOutput}
                      onChange={value =>
                        handleChangeNodeParam(
                          (data, value) =>
                            (data.nodeParam.streamOutput = value),
                          value
                        )
                      }
                    />
                  </div>
                </div>
              }
              content={
                <div className="px-[14px]">
                  <FlowTemplateEditor
                    id={id}
                    data={data}
                    onBlur={() => delayCheckNode(id)}
                    value={nodeParam?.template}
                    onChange={value =>
                      handleChangeNodeParam(
                        (data, value) => (data.nodeParam.template = value),
                        value
                      )
                    }
                    placeholder={t(
                      'workflow.nodes.endNode.templatePlaceholder'
                    )}
                  />
                  <p className="text-xs text-[#F74E43]">
                    {data.nodeParam.templateErrMsg}
                  </p>
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
});
