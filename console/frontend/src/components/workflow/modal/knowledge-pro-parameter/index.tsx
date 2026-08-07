import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Slider, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { FlowInputNumber } from '@/components/workflow/ui';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useMemoizedFn } from 'ahooks';
import { cloneDeep } from 'lodash';
import { KnowledgeProRepoConfig } from '@/components/workflow/types';

const KnowledgeProParameter = (): React.ReactElement => {
  const { t } = useTranslation();

  const [repoConfig, setRepoConfig] = useState<KnowledgeProRepoConfig>({});
  const knowledgeProParameterModalInfo = useFlowsManager(
    state => state.knowledgeProParameterModalInfo
  );
  const setKnowledgeProParameterModalInfo = useFlowsManager(
    state => state.setKnowledgeProParameterModalInfo
  );
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const setNode = currentStore(state => state.setNode);
  const nodes = currentStore(state => state.nodes);
  const currentNode = nodes.find(
    node => node.id === knowledgeProParameterModalInfo.nodeId
  );

  useEffect(() => {
    setRepoConfig({
      repoTopK: currentNode?.data.nodeParam.repoTopK,
      score: currentNode?.data.nodeParam.score,
    });
  }, [currentNode]);

  const handleParameterChange = useMemoizedFn((fn: (old: unknown) => void) => {
    autoSaveCurrentFlow();
    setNode(currentNode?.id, old => {
      fn(old);
      return {
        ...cloneDeep(old),
      };
    });
    canPublishSetNot();
  });

  const handleOk = useMemoizedFn(() => {
    handleParameterChange(old => {
      old.data.nodeParam.repoTopK = repoConfig?.repoTopK;
      old.data.nodeParam.score = repoConfig?.score;
    });
    setKnowledgeProParameterModalInfo({
      open: false,
      nodeId: '',
    });
  });

  return (
    <>
      {knowledgeProParameterModalInfo?.open
        ? createPortal(
            <div
              className="mask"
              style={{
                zIndex: 1002,
              }}
            >
              <div className="modalContent w-[454px]">
                <p className="text-second font-medium">
                  {t('workflow.nodes.knowledgeProNode.parameterModal.topK')}
                </p>
                <p className="text-[#7F7F7F] text-xs mt-1.5">
                  {t(
                    'workflow.nodes.knowledgeProNode.parameterModal.topKDescription'
                  )}
                </p>
                <p className="text-[#7F7F7F] text-xs mt-5">
                  {t(
                    'workflow.nodes.knowledgeProNode.parameterModal.topKExample'
                  )}
                </p>
                <div className="flex flex-1">
                  <Slider
                    min={1}
                    max={5}
                    value={repoConfig.repoTopK}
                    className="flex-1 config-slider"
                    onChange={value =>
                      setRepoConfig({
                        ...repoConfig,
                        repoTopK: value,
                      })
                    }
                  />
                  <FlowInputNumber
                    className="global-input ml-[12px] w-[40px] h-[30px] text-center rounded-lg"
                    value={repoConfig.repoTopK}
                    onChange={(value: number | null) => {
                      setRepoConfig({
                        ...repoConfig,
                        repoTopK: typeof value === 'number' ? value : 3,
                      });
                    }}
                    min={1}
                    max={5}
                    controls={false}
                  />
                </div>
                <p className="text-second font-medium mt-2.5">
                  {t('workflow.promptDebugger.scoreThresholdLabel')}
                </p>
                <p className="text-desc mt-1.5">
                  {t(
                    'workflow.nodes.knowledgeProNode.parameterModal.scoreThresholdDescription'
                  )}
                </p>
                <div className="flex flex-1">
                  <Slider
                    min={0}
                    max={1.0}
                    step={0.01}
                    value={repoConfig.score}
                    className="flex-1 config-slider"
                    onChange={value =>
                      setRepoConfig({
                        ...repoConfig,
                        score: value,
                      })
                    }
                  />
                  <FlowInputNumber
                    className="global-input ml-[30px] pt-1.5 pl-0.5 w-[60px] text-center"
                    value={repoConfig.score}
                    onChange={(value: number | null) => {
                      setRepoConfig({
                        ...repoConfig,
                        score: value ?? undefined,
                      });
                    }}
                    precision={2}
                    min={0}
                    max={1}
                    controls={false}
                  />
                </div>
                <div className="flex flex-row-reverse gap-3 mt-7">
                  <Button
                    type="primary"
                    className="px-[48px]"
                    onClick={handleOk}
                  >
                    {t('common.save')}
                  </Button>
                  <Button
                    type="text"
                    className="origin-btn px-[48px]"
                    onClick={() =>
                      setKnowledgeProParameterModalInfo({
                        open: false,
                        nodeId: '',
                      })
                    }
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default KnowledgeProParameter;
