import type { NodeComponentProps } from '@/components/workflow/nodes/types';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from 'antd';
import { FLowCollapse } from '@/components/workflow/ui';
import ChatHistory from '@/components/workflow/nodes/components/chat-history';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import {
  TypeSelector,
  ValueField,
  ErrorMessages,
} from '@/components/workflow/nodes/components/inputs';
import useFlowsManagerStore from '@/components/workflow/store/use-flows-manager';

export const EnabledChatHistory = ({
  id,
  data,
}: NodeComponentProps): React.ReactElement | null => {
  const { handleChangeNodeParam, nodeType, nodeParam } = useNodeCommon({
    id,
    data,
  });
  const { t } = useTranslation();
  const canvasesDisabled = useFlowsManagerStore(
    state => state.canvasesDisabled
  );
  if (!['decision-making', 'flow', 'spark-llm', 'agent'].includes(nodeType)) {
    return null;
  }
  return (
    <div
      className="workflow-history-toggle"
      onClick={event => event.stopPropagation()}
    >
      <span>{t('workflow.nodes.decisionMakingNode.chatHistory')}</span>
      <Switch
        size="small"
        aria-label="对话历史"
        disabled={canvasesDisabled}
        checked={Boolean(nodeParam?.enableChatHistoryV2?.isEnabled)}
        onChange={enabled =>
          handleChangeNodeParam((node, value) => {
            node.nodeParam.enableChatHistoryV2 = {
              isEnabled: value,
              rounds: node.nodeParam.enableChatHistoryV2?.rounds ?? 1,
            };
          }, enabled)
        }
      />
    </div>
  );
};

function index({
  id,
  data,
}: React.PropsWithChildren<NodeComponentProps>): React.ReactElement {
  const { inputs } = useNodeCommon({
    id,
    data,
  });
  const { t } = useTranslation();

  return (
    <FLowCollapse
      label={
        <div className="w-full flex items-center cursor-pointer gap-2">
          <div className="flex items-center justify-between text-base font-medium flex-1">
            <div>{t('workflow.nodes.decisionMakingNode.input')}</div>
            <EnabledChatHistory id={id} data={data} />
          </div>
        </div>
      }
      content={
        <div className="px-[18px] rounded-lg overflow-hidden">
          <div className="flex items-center gap-3 text-desc">
            <h4 className="w-1/4">
              {t('workflow.nodes.common.parameterName')}
            </h4>
            <h4 className="w-1/4">
              {t('workflow.nodes.common.parameterValue')}
            </h4>
            <h4 className="flex-1"></h4>
            <span className="w-5 h-5"></span>
          </div>
          {data?.nodeParam?.enableChatHistoryV2?.isEnabled && (
            <ChatHistory id={id} data={data} />
          )}
          <div className="flex flex-col gap-3 mt-4">
            {inputs.map(item => (
              <div key={item.id} className="flex flex-col gap-1">
                <div className="flex items-start gap-3 overflow-hidden">
                  <div className="flex flex-col w-1/4 flex-shrink-0 relative">
                    <span className="pl-[10px]">{item.name}</span>
                    <span className="text-[#F74E43] absolute left-0 top-0">
                      *
                    </span>
                  </div>
                  <div className="flex flex-col w-1/4 flex-shrink-0">
                    <TypeSelector id={id} data={data} item={item} />
                  </div>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <ValueField id={id} data={data} item={item} />
                  </div>
                </div>
                <ErrorMessages item={item} />
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}

export default memo(index);
