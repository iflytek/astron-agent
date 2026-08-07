import React, { useMemo, useCallback } from 'react';
import { cloneDeep } from 'lodash';
import { v4 as uuid } from 'uuid';
import { FlowSelect, FlowTemplateEditor } from '@/components/workflow/ui';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useTranslation } from 'react-i18next';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';

function index({ id, data, nodeParam }): React.ReactElement {
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const setNode = currentStore(state => state.setNode);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const delayCheckNode = currentStore(state => state.delayCheckNode);
  const takeSnapshot = currentStore(state => state.takeSnapshot);
  const edges = currentStore(state => state.edges);
  const setEdges = currentStore(state => state.setEdges);
  const removeNodeRef = currentStore(state => state.removeNodeRef);

  const optionAnswer = useMemo(() => {
    return nodeParam?.optionAnswer?.filter(item => item.type === 2);
  }, [nodeParam?.optionAnswer]);

  const optionDefaultAnswer = useMemo(() => {
    return nodeParam?.optionAnswer?.find(item => item.type === 1);
  }, [nodeParam?.optionAnswer]);

  const handleChangeOptionParma = useCallback(
    (optionId, key, value) => {
      setNode(id, old => {
        const currentOption = old?.data?.nodeParam?.optionAnswer?.find(
          item => item?.id === optionId
        );
        currentOption[key] = value;
        return {
          ...cloneDeep(old),
        };
      });
      autoSaveCurrentFlow();
      canPublishSetNot();
    },
    [id]
  );

  const handleAddLine = useCallback(() => {
    takeSnapshot();
    setNode(id, old => {
      const optionAnswer = old.data.nodeParam.optionAnswer;
      const filterOptionAnswer = optionAnswer?.filter(item => item.type === 2);
      const length = old?.data?.nodeParam?.needReply
        ? optionAnswer?.length
        : optionAnswer?.length - 1;
      old.data.nodeParam.optionAnswer.splice(length, 0, {
        id: `option-one-of::${uuid()}`,
        name: String.fromCharCode(
          filterOptionAnswer?.[
            filterOptionAnswer?.length - 1
          ]?.name?.charCodeAt(0) + 1
        ),
        type: 2,
        content: '',
        content_type: 'string',
      });
      return {
        ...cloneDeep(old),
      };
    });
    canPublishSetNot();
  }, [setNode, canPublishSetNot, takeSnapshot]);

  const handleRemoveLine = useCallback(
    optionId => {
      takeSnapshot();
      setNode(id, old => {
        old.data.nodeParam.optionAnswer = old.data.nodeParam.optionAnswer
          ?.filter(item => item?.id !== optionId)
          ?.map((item, index) =>
            item?.type === 1
              ? {
                  ...item,
                }
              : {
                  ...item,
                  name: String.fromCharCode('A'.charCodeAt(0) + index),
                }
          );
        return {
          ...cloneDeep(old),
        };
      });
      canPublishSetNot();
      const edge = edges.find(edge => edge.sourceHandle === optionId);
      const othersEdges = edges.filter(
        item => item.source !== edge?.source && item.target === edge?.target
      );
      if (othersEdges.length > 0) {
        removeNodeRef(edge.source, edge.target);
      }
      setEdges(edges => edges.filter(edge => edge.sourceHandle !== optionId));
      canPublishSetNot();
    },
    [edges, setNode, canPublishSetNot, takeSnapshot]
  );

  return (
    <div className="flex flex-col gap-4 px-[18px] pb-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3 text-desc">
          <h4 className="w-[30px]">
            {t('workflow.nodes.questionAnswerNode.option')}
          </h4>
          <h4 className="w-[100px]">
            {t('workflow.nodes.questionAnswerNode.optionType')}
          </h4>
          <h4 className="flex-1">
            {t('workflow.nodes.questionAnswerNode.optionContent')}
          </h4>
          {optionAnswer.length > 1 && <span className="w-5 h-5"></span>}
        </div>
        {optionAnswer?.map(item => (
          <div key={item?.id} className="flex flex-col gap-1 relative">
            <div className="flex items-start gap-3 text-desc">
              <div className="p-1.5 border border-[#E4EAFF] rounded-md text-[#6356EA] text-xs font-medium">
                {item?.name}
              </div>
              <div className="w-[100px]">
                <FlowSelect
                  value={item?.['content_type']}
                  options={[
                    {
                      label: 'String',
                      value: 'string',
                    },
                    {
                      label: 'Image',
                      value: 'image',
                    },
                  ]}
                  onChange={value =>
                    handleChangeOptionParma(item?.id, 'content_type', value)
                  }
                />
              </div>
              <div className="flex-1">
                <FlowTemplateEditor
                  id={id}
                  data={data}
                  onBlur={() => delayCheckNode(id)}
                  value={item?.content}
                  onChange={value =>
                    handleChangeOptionParma(item?.id, 'content', value)
                  }
                  placeholder={t(
                    'workflow.nodes.questionAnswerNode.contentPlaceholder'
                  )}
                  minHeight={'0px'}
                />
              </div>
              {optionAnswer.length > 1 && (
                <img
                  src={remove}
                  className="w-[16px] h-[17px] cursor-pointer mt-1.5"
                  onClick={() => handleRemoveLine(item.id)}
                  alt=""
                />
              )}
            </div>
            {item?.contentErrMsg && (
              <div className="pl-[154px] text-xs text-[#F74E43]">
                {item?.contentErrMsg}
              </div>
            )}
          </div>
        ))}
        {optionAnswer?.length <= 25 && (
          <div
            className="text-[#6356EA] text-xs font-medium inline-flex items-center cursor-pointer gap-1.5 w-fit"
            onClick={() => handleAddLine()}
          >
            <img src={inputAddIcon} className="w-3 h-3" alt="" />
            <span>{t('workflow.nodes.questionAnswerNode.addOption')}</span>
          </div>
        )}
        {optionDefaultAnswer && (
          <div className="relative flex items-center gap-2 mt-3">
            <span className="text-[#6356EA] text-xs font-medium">
              {t('workflow.nodes.questionAnswerNode.other')}
            </span>
            <div className="flex-1 border border-[#E4EAFF] rounded-lg px-3 py-1 text-[#CBCBCD] text-xs">
              ({t('workflow.nodes.questionAnswerNode.otherOptionDescription')})
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default index;
