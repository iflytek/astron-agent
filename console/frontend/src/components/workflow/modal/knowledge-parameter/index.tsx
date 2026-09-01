import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Node } from 'reactflow';
import { Slider, InputNumber, Input, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useMemoizedFn } from 'ahooks';
import { cloneDeep } from 'lodash';
import { RepoConfig } from '@/components/workflow/types';
import { applyRerankId, RAGFLOW_RAG_TYPE } from '../knowledge-rerank';

const KnowledgeParameter = (): React.ReactElement => {
  const { t } = useTranslation();
  const [repoConfig, setRepoConfig] = useState<RepoConfig>({});
  const knowledgeParameterModalInfo = useFlowsManager(
    state => state.knowledgeParameterModalInfo
  );
  const setKnowledgeParameterModalInfo = useFlowsManager(
    state => state.setKnowledgeParameterModalInfo
  );
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const nodes = currentStore(state => state.nodes);
  const setNode = currentStore(state => state.setNode);
  const currentNode = nodes.find(
    node => node.id === knowledgeParameterModalInfo.nodeId
  );

  useEffect(() => {
    setRepoConfig({
      topN: currentNode?.data.nodeParam.topN,
      score: currentNode?.data.nodeParam.score,
      rerankId: currentNode?.data.nodeParam.rerankId,
    });
  }, [currentNode]);

  const handleParameterChange = useMemoizedFn((fn: (old: Node) => void) => {
    if (!currentNode) return;
    autoSaveCurrentFlow();
    setNode(currentNode.id, old => {
      fn(old);
      return {
        ...cloneDeep(old),
      };
    });
    canPublishSetNot();
  });

  const handleOk = useMemoizedFn((): void => {
    handleParameterChange(old => {
      old.data.nodeParam.topN = repoConfig?.topN;
      old.data.nodeParam.score = repoConfig?.score || 0.2;
      applyRerankId(
        old.data.nodeParam,
        currentNode.data.nodeParam.ragType,
        repoConfig?.rerankId
      );
    });
    setKnowledgeParameterModalInfo({
      open: false,
      nodeId: '',
    });
  });

  const isRagflow = currentNode?.data.nodeParam.ragType === RAGFLOW_RAG_TYPE;

  return (
    <>
      {knowledgeParameterModalInfo?.open
        ? createPortal(
            <div
              className="mask"
              style={{
                zIndex: 1002,
              }}
            >
              <div className="modalContent">
                <p className="text-second font-medium">
                  {t('workflow.nodes.parameterModal.topK')}
                </p>
                <p className="text-desc mt-1.5">
                  {t('workflow.nodes.parameterModal.topKDescription')}
                </p>
                <div className="flex flex-1">
                  <Slider
                    min={1}
                    max={5}
                    value={repoConfig.topN}
                    className="flex-1 config-slider"
                    onChange={value =>
                      setRepoConfig({
                        ...repoConfig,
                        topN: value,
                      })
                    }
                  />
                  <InputNumber
                    className="global-input ml-[30px] pt-1.5 pl-3.5 w-[60px] text-center"
                    value={repoConfig.topN}
                    onChange={(value: unknown) => {
                      setRepoConfig({
                        ...repoConfig,
                        topN: typeof value === 'number' ? value : 3,
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
                  {t('workflow.promptDebugger.scoreThresholdDescription')}
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
                  <InputNumber
                    className="global-input ml-[30px] pt-1.5 pl-0.5 w-[60px] text-center"
                    value={repoConfig.score}
                    onChange={(value: unknown) => {
                      setRepoConfig({
                        ...repoConfig,
                        score: typeof value === 'number' ? value : undefined,
                      });
                    }}
                    precision={2}
                    min={0}
                    max={1}
                    controls={false}
                  />
                </div>
                {isRagflow ? (
                  <>
                    <p className="text-second font-medium mt-2.5">
                      {t('workflow.nodes.parameterModal.rerankModelId')}
                    </p>
                    <p className="text-desc mt-1.5">
                      {t(
                        'workflow.nodes.parameterModal.rerankModelIdDescription'
                      )}
                    </p>
                    <Input
                      className="global-input mt-3"
                      value={repoConfig.rerankId}
                      placeholder={t(
                        'workflow.nodes.parameterModal.rerankModelIdPlaceholder'
                      )}
                      maxLength={512}
                      allowClear
                      onChange={event =>
                        setRepoConfig({
                          ...repoConfig,
                          rerankId: event.target.value,
                        })
                      }
                    />
                  </>
                ) : null}
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
                      setKnowledgeParameterModalInfo({
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

export default KnowledgeParameter;
