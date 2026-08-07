import React, { useMemo, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cloneDeep } from 'lodash';
import { FLowCollapse } from '@/components/workflow/ui';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import ExceptionHandling from '@/components/workflow/nodes/components/exception-handling';
import SingleInput from '../components/single-input';
import FixedOutputs from '../components/fixed-outputs';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';
import parameterSettingsIcon from '@/assets/imgs/workflow/parameter-settings-icon.png';
import knowledgeListDelete from '@/assets/imgs/workflow/knowledge-list-delete.svg';
import knowledgeListLook from '@/assets/imgs/workflow/knowledge-list-look.svg';

const KnowledgeCollapseHeader = ({ id }): React.ReactElement => {
  const setKnowledgeModalInfo = useFlowsManager(
    state => state.setKnowledgeModalInfo
  );
  const setKnowledgeParameterModalInfo = useFlowsManager(
    state => state.setKnowledgeParameterModalInfo
  );
  const { t } = useTranslation();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  return (
    <div className="w-full flex items-center justify-between">
      <h4>{t('workflow.nodes.knowledgeNode.knowledgeBase')}</h4>
      {!canvasesDisabled && (
        <div
          className="flex items-center gap-4 text-xs font-medium"
          onClick={e => e.stopPropagation()}
        >
          <div
            className="flex items-center cursor-pointer gap-1"
            onClick={() =>
              setKnowledgeParameterModalInfo({
                open: true,
                nodeId: id,
              })
            }
          >
            <img
              className="w-3 h-3 mt-0.5"
              src={parameterSettingsIcon}
              alt=""
            />
            <span className="text-[#6356EA] cursor-pointer">
              {t('workflow.nodes.knowledgeNode.parameterSetting')}
            </span>
          </div>
          <div
            className="flex items-center cursor-pointer gap-1"
            onClick={e => {
              e.stopPropagation();
              setKnowledgeModalInfo({
                open: true,
                nodeId: id,
              });
            }}
          >
            <img src={inputAddIcon} className="w-2.5 h-2.5 mt-0.5" alt="" />
            <span className="text-[#6356EA] cursor-pointer">
              {t('workflow.nodes.knowledgeNode.addKnowledgeBase')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const KnowledgeRepoList = ({
  id,
  data,
  handleKnowledgesChange,
}): React.ReactElement => {
  const { t } = useTranslation();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const setKnowledgeDetailModalInfo = useFlowsManager(
    state => state.setKnowledgeDetailModalInfo
  );

  const repoList = useMemo(() => {
    return data?.nodeParam?.repoList || [];
  }, [data]);
  return (
    <div className="p-3 rounded-md min-h-[78px] relative">
      {repoList.length > 0 ? (
        <div className="p-1.5 bg-[#f7f7f7] flex flex-col gap-1.5">
          {repoList.map(knowledge => (
            <div
              key={knowledge.id}
              className="py-2 px-2.5 bg-[#fff] flex items-center gap-2.5 rounded-md"
              onClick={e => {
                e.stopPropagation();
              }}
            >
              <img src={data?.icon} className="w-7 h-7" alt="" />
              <div className="flex items-center flex-1 overflow-hidden">
                <p
                  className="flex-1 text-overflow text-sm font-medium"
                  title={knowledge.name}
                >
                  {knowledge.name}
                </p>
              </div>
              <div
                className="w-[18px] h-[18px] rounded-full bg-[#F7F7F7] flex items-center justify-center cursor-pointer"
                onClick={e => {
                  e.stopPropagation();
                  setKnowledgeDetailModalInfo({
                    ...knowledge,
                    open: true,
                    nodeId: id,
                    repoId: knowledge.id,
                  });
                }}
              >
                <img src={knowledgeListLook} className="w-1.5 h-1.5" alt="" />
              </div>
              {!canvasesDisabled && (
                <div
                  className="w-[18px] h-[18px] rounded-full bg-[#F7F7F7] flex items-center justify-center cursor-pointer"
                  onClick={e => {
                    e.stopPropagation();
                    handleKnowledgesChange(knowledge);
                  }}
                >
                  <img src={knowledgeListDelete} className="w-1 h-1" alt="" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          <p className="text-desc text-center py-[30px] bg-[#f7f7f7] text-[#CBCBCD]">
            {t('workflow.nodes.knowledgeNode.pleaseAddKnowledgeBase')}
          </p>
        </>
      )}
      <div className="text-xs text-[#F74E43] mt-1">
        {data?.nodeParam?.repoIdErrMsg}
      </div>
    </div>
  );
};

export const KnowledgeDetail = memo(props => {
  const { id, data } = props;
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const setNode = currentStore(state => state.setNode);
  const checkNode = currentStore(state => state.checkNode);
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);

  const handleKnowledgesChange = useCallback(
    knowledge => {
      autoSaveCurrentFlow();
      setNode(id, old => {
        const findKnowledgeIndex = old.data.nodeParam.repoList?.findIndex(
          item => item.id === knowledge.id
        );
        if (findKnowledgeIndex === -1) {
          old.data.nodeParam.repoId.push(
            knowledge.coreRepoId || knowledge.outerRepoId
          );
          old.data.nodeParam.repoList.push(knowledge);
        } else {
          old.data.nodeParam.repoId.splice(findKnowledgeIndex, 1);
          old.data.nodeParam.repoList.splice(findKnowledgeIndex, 1);
        }
        return {
          ...cloneDeep(old),
        };
      });
      checkNode(id);
      canPublishSetNot();
    },
    [setNode, checkNode, canPublishSetNot, autoSaveCurrentFlow]
  );

  return (
    <div className="p-[14px] pb-[6px]">
      <div className="bg-[#fff] rounded-lg flex flex-col gap-2.5">
        <SingleInput id={id} data={data} />
        <FLowCollapse
          label={<KnowledgeCollapseHeader id={id} />}
          content={
            <KnowledgeRepoList
              id={id}
              data={data}
              handleKnowledgesChange={handleKnowledgesChange}
            />
          }
        />
        <FixedOutputs id={id} data={data} />
        <ExceptionHandling id={id} data={data} />
      </div>
    </div>
  );
});

export const Knowledge = memo(({ data, repoList }) => {
  return (
    <>
      <span className="text-[#333] text-right">知识库</span>
      <span className="flex items-center gap-1 flex-wrap">
        {repoList?.length > 0 ? (
          repoList?.map(item => (
            <span key={item.id} className="flex items-center gap-1">
              <img src={data?.icon} className="w-[12px] h-[12px]" alt="" />
              <span>{item.name}</span>
            </span>
          ))
        ) : (
          <span className="text-[#b3b7c6]">未配置知识库</span>
        )}
      </span>
    </>
  );
});
