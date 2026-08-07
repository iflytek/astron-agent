import React, { useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cloneDeep } from 'lodash';
import { FLowCollapse, FlowTextArea } from '@/components/workflow/ui';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import ExceptionHandling from '@/components/workflow/nodes/components/exception-handling';
import SingleInput from '../components/single-input';
import { KnowledgeRepoList } from '../knowledge';
import FixedOutputs from '../components/fixed-outputs';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';
import parameterSettingsIcon from '@/assets/imgs/workflow/parameter-settings-icon.png';

const KnowledgeProStrategy = ({
  handleParameterChange,
  data,
}): React.ReactElement => {
  const { t } = useTranslation();
  const knowledgeProStrategy = useFlowsManager(
    state => state.knowledgeProStrategy
  );

  return (
    <FLowCollapse
      label={
        <div className="text-base font-medium">
          {t('workflow.nodes.knowledgeProNode.strategySelection')}
        </div>
      }
      content={
        <div className="flex flex-col gap-2 px-[18px] pb-3">
          {knowledgeProStrategy?.map(item => (
            <div
              key={item?.code}
              className="bg-[#fff] rounded-lg px-3 py-2 flex flex-col gap-1.5 cursor-pointer"
              style={{
                border:
                  data?.nodeParam?.ragType === item?.code
                    ? '1px solid #6356EA'
                    : '1px solid #E4EAFF',
                color:
                  data?.nodeParam?.ragType === item?.code ? '#6356EA' : '#333',
              }}
              onClick={() =>
                handleParameterChange(old => {
                  old.data.nodeParam.ragType = item?.code;
                })
              }
            >
              <div className="text-xs font-medium">{item?.name}</div>
              <div className="text-[#787878] text-xss">{item?.description}</div>
            </div>
          ))}
        </div>
      }
    />
  );
};

const AnswerRole = ({ handleParameterChange, data }): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <FLowCollapse
      label={
        <div className="flex items-center justify-between">
          <h4 className="text-base font-medium">
            {t('workflow.nodes.knowledgeProNode.answerRule')}
          </h4>
        </div>
      }
      content={
        <div className="rounded-md px-[18px] pb-3">
          <FlowTextArea
            style={{
              minHeight: 100,
            }}
            adaptiveHeight={true}
            placeholder={t(
              'workflow.nodes.knowledgeProNode.outputRequirementPlaceholder'
            )}
            value={data?.nodeParam?.answerRole}
            onChange={e =>
              handleParameterChange(old => {
                old.data.nodeParam.answerRole = e?.target?.value;
              })
            }
          />
          <p className="text-xs text-[#F74E43]">
            {data.nodeParam.templateErrMsg}
          </p>
        </div>
      }
    />
  );
};

export const KnowledgeProDetail = memo(props => {
  const { id, data } = props;
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const setKnowledgeModalInfo = useFlowsManager(
    state => state.setKnowledgeModalInfo
  );
  const setNode = currentStore(state => state.setNode);
  const checkNode = currentStore(state => state.checkNode);
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const setKnowledgeProParameterModalInfo = useFlowsManager(
    state => state.setKnowledgeProParameterModalInfo
  );

  const handleKnowledgesChange = useCallback(
    knowledge => {
      autoSaveCurrentFlow();
      setNode(id, old => {
        const findKnowledgeIndex = old.data.nodeParam.repoList?.findIndex(
          item => item.id === knowledge.id
        );
        if (findKnowledgeIndex === -1) {
          old.data.nodeParam.repoIds.push(
            knowledge.coreRepoId || knowledge.outerRepoId
          );
          old.data.nodeParam.repoList.push(knowledge);
        } else {
          old.data.nodeParam.repoIds.splice(findKnowledgeIndex, 1);
          old.data.nodeParam.repoList.splice(findKnowledgeIndex, 1);
        }
        if (knowledge?.tag === 'CBG-RAG') {
          old.data.nodeParam.repoType = 2;
        } else {
          old.data.nodeParam.repoType = 3;
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

  const handleParameterChange = useCallback(
    fn => {
      autoSaveCurrentFlow();
      setNode(id, old => {
        fn(old);
        return {
          ...cloneDeep(old),
        };
      });
      canPublishSetNot();
    },
    [setNode, canPublishSetNot, autoSaveCurrentFlow]
  );

  return (
    <div className="p-[14px] pb-[6px]">
      <div className="bg-[#fff] rounded-lg w-full flex flex-col gap-2.5">
        <KnowledgeProStrategy
          handleParameterChange={handleParameterChange}
          data={data}
        />
        <SingleInput id={id} data={data} />
        <FLowCollapse
          label={
            <div className="w-full flex items-center justify-between">
              <h4>{t('workflow.nodes.knowledgeProNode.knowledgeBase')}</h4>
              {!canvasesDisabled && (
                <div
                  className="flex items-center gap-4 text-xs font-medium"
                  onClick={e => e.stopPropagation()}
                >
                  <div
                    className="flex items-center cursor-pointer gap-1"
                    onClick={() =>
                      setKnowledgeProParameterModalInfo({
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
                      {t('workflow.nodes.knowledgeProNode.parameterSetting')}
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
                    <img
                      src={inputAddIcon}
                      className="w-2.5 h-2.5 mt-0.5"
                      alt=""
                    />
                    <span className="text-[#6356EA] cursor-pointer">
                      {t('workflow.nodes.knowledgeProNode.addKnowledgeBase')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          }
          content={
            <KnowledgeRepoList
              id={id}
              data={data}
              handleKnowledgesChange={handleKnowledgesChange}
            />
          }
        />
        <AnswerRole handleParameterChange={handleParameterChange} data={data} />
        <FixedOutputs id={id} data={data} />
        <ExceptionHandling id={id} data={data} />
      </div>
    </div>
  );
});
