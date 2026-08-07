import React, { useCallback } from 'react';
import { FLowTree } from '@/components/workflow/ui';
import { InputNumber, Tooltip } from 'antd';
import { renderType } from '@/components/workflow/utils/reactflowUtils';
import { cloneDeep } from 'lodash';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useTranslation } from 'react-i18next';

import arrowUp from '@/assets/imgs/chat/arrow_up.png';
import arrowDown from '@/assets/imgs/chat/arrow_down.png';
import questionMark from '@/assets/imgs/common/questionmark.png';

function index({ id, data }): React.ReactElement {
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const setNode = currentStore(state => state.setNode);

  const handleChangeNodeParam = useCallback(
    value => {
      setNode(id, old => {
        if (old?.data?.nodeParam?.enableChatHistoryV2) {
          old.data.nodeParam.enableChatHistoryV2.rounds = value;
        } else {
          old.data.nodeParam = {
            ...old.data.nodeParam,
            enableChatHistoryV2: { isEnabled: false, rounds: value },
          };
        }
        return {
          ...cloneDeep(old),
        };
      });
      autoSaveCurrentFlow();
      canPublishSetNot();
    },
    [id, autoSaveCurrentFlow]
  );

  const titleRender = useCallback(nodeData => {
    return (
      <div className="flex items-center gap-2">
        <span>{nodeData.label}</span>
        <div className="bg-[#F0F0F0] px-2.5 py-0.5 rounded text-xs">
          {renderType(nodeData)}
        </div>
      </div>
    );
  }, []);

  const treeData = [
    {
      key: '1',
      label: 'history',
      schema: {
        type: 'array-object',
      },
      children: [
        {
          key: '2',
          label: 'role',
          type: 'string',
        },
        {
          key: '3',
          label: 'content_type',
          type: 'string',
        },
        {
          key: '4',
          label: 'content',
          type: 'string',
        },
      ],
    },
  ];

  return (
    <div
      className="w-full flex items-start mt-4 gap-3"
      onClick={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()}
    >
      <div className="w-1/3">
        <FLowTree
          className="flow-output-tree"
          titleRender={titleRender}
          treeData={treeData}
        />
      </div>
      <div className="flex-1 flex items-center gap-1">
        <span className="text-xs">{t('common.conversationRounds')}</span>
        <Tooltip
          title={t('common.conversationRoundsDescription')}
          overlayClassName="black-tooltip"
        >
          <img src={questionMark} width={16} className="ml-1" alt="" />
        </Tooltip>
        <InputNumber
          value={data?.nodeParam?.enableChatHistoryV2?.rounds || 1}
          onChange={handleChangeNodeParam}
          min={1}
          max={20}
          className="nodrag"
          controls={{
            upIcon: <img src={arrowUp} className="w-4 h-4" />,
            downIcon: <img src={arrowDown} className="w-4 h-4" />,
          }}
        />
      </div>
    </div>
  );
}

export default index;
