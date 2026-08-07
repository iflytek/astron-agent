import React, { useMemo, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cloneDeep } from 'lodash';
import { v4 as uuid } from 'uuid';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import {
  FlowNodeInput,
  FlowNodeTextArea,
  FLowCollapse,
  FlowTemplateEditor,
} from '@/components/workflow/ui';
import SingleInput from '../components/single-input';
import { SourceHandle } from '@/components/workflow/nodes/components/handle';
import ExceptionHandling from '@/components/workflow/nodes/components/exception-handling';
import { ModelSection } from '@/components/workflow/nodes/node-common';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import FixedOutputs from '@/components/workflow/nodes/components/fixed-outputs';

import remove from '@/assets/imgs/workflow/input-remove-icon.png';

const AdvancedConfigSection = ({
  id,
  data,
  handleChangeNodeParam,
  delayCheckNode,
}): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <FLowCollapse
      label={
        <h4 className="text-base font-medium">
          {t('workflow.nodes.decisionMakingNode.advancedConfiguration')}
        </h4>
      }
      content={
        <div className="px-[18px] flex flex-col gap-3">
          <FlowTemplateEditor
            id={id}
            data={data}
            onBlur={() => delayCheckNode(id)}
            value={data?.nodeParam?.promptPrefix}
            onChange={value =>
              handleChangeNodeParam(
                (data, value) => (data.nodeParam.promptPrefix = value),
                value
              )
            }
            placeholder={t(
              'workflow.nodes.decisionMakingNode.systemPromptPlaceholder'
            )}
          />
          <p className="text-xs text-[#F74E43]">
            {data.nodeParam.promptPrefixErrMsg}
          </p>
        </div>
      }
    />
  );
};

const IntentSection = ({
  id,
  intentChains,
  setNode,
  setEdges,
  takeSnapshot,
  removeNodeRef,
  edges,
  canPublishSetNot,
  handleChangeParam,
  canvasesDisabled,
  delayCheckNode,
}): React.ReactElement => {
  const { t } = useTranslation();
  const intentOrderList = t('workflow.nodes.flow.intentNumbers', {
    returnObjects: true,
  }) as string[];

  const handleAddIntent = useCallback(() => {
    takeSnapshot();
    setNode(id, old => {
      old.data.nodeParam.intentChains.splice(
        old.data.nodeParam.intentChains.length - 1,
        0,
        {
          intentType: 2,
          id: 'intent-one-of::' + uuid(),
          name: '',
          description: '',
        }
      );
      return { ...cloneDeep(old) };
    });
    canPublishSetNot();
  }, [id, setNode, takeSnapshot, canPublishSetNot]);

  const handleRemoveIntent = useCallback(
    intentChainId => {
      takeSnapshot();
      setNode(id, old => {
        old.data.nodeParam.intentChains =
          old.data.nodeParam.intentChains.filter(i => i.id !== intentChainId);
        return { ...cloneDeep(old) };
      });
      const edge = edges.find(edge => edge.sourceHandle === intentChainId);
      edge && removeNodeRef(edge.source, edge.target);
      setEdges(edges =>
        edges.filter(edge => edge.sourceHandle !== intentChainId)
      );
      canPublishSetNot();
    },
    [
      id,
      setNode,
      setEdges,
      edges,
      takeSnapshot,
      removeNodeRef,
      canPublishSetNot,
    ]
  );

  return (
    <FLowCollapse
      label={
        <h4 className="text-base font-medium">
          {t('workflow.nodes.decisionMakingNode.intent')}
        </h4>
      }
      content={
        <div className="px-[18px]">
          <div className="flex flex-col gap-6">
            {intentChains.map((intent, index) => (
              <div
                key={intent.id}
                className="flex flex-col gap-4 bg-[#f6f7f9] p-4 relative"
              >
                {index !== intentChains.length - 1 ? (
                  <>
                    <div className="flex items-start gap-2.5">
                      <div className="w-2/5">
                        {t('workflow.nodes.decisionMakingNode.intentNumber', {
                          index: intentOrderList[index],
                        })}
                      </div>
                      <div className="flex-1">
                        {t(
                          'workflow.nodes.decisionMakingNode.intentDescription'
                        )}
                      </div>
                      {intentChains.length > 2 && (
                        <span className="w-5 h-5"></span>
                      )}
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-2/5">
                        <FlowNodeInput
                          nodeId={id}
                          value={intent.name}
                          className="flex-1"
                          onChange={value =>
                            handleChangeParam(
                              intent.id,
                              (d, v) => (d.name = v),
                              value
                            )
                          }
                          placeholder={t(
                            'workflow.nodes.decisionMakingNode.intentNamePlaceholder'
                          )}
                        />
                        <p className="text-xs text-[#F74E43]">
                          {intent.nameErrMsg}
                        </p>
                      </div>
                      <div className="flex-1">
                        <FlowNodeTextArea
                          allowWheel={false}
                          adaptiveHeight={true}
                          readOnly={canvasesDisabled}
                          value={intent.description}
                          onChange={value =>
                            handleChangeParam(
                              intent.id,
                              (d, v) => (d.description = v),
                              value
                            )
                          }
                          placeholder={t(
                            'workflow.nodes.decisionMakingNode.intentDescriptionPlaceholder'
                          )}
                          onBlur={() => delayCheckNode(id)}
                        />
                        <p className="text-xs text-[#F74E43]">
                          {intent.descriptionErrMsg}
                        </p>
                      </div>
                      {intentChains.length > 2 && (
                        <img
                          src={remove}
                          className="w-[16px] h-[17px] cursor-pointer mt-1.5"
                          onClick={() => handleRemoveIntent(intent.id)}
                          alt=""
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex">
                    <span className="text-[#6356EA] flex-shrink-0">
                      {t('workflow.nodes.decisionMakingNode.defaultIntent')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {!canvasesDisabled && intentChains.length < 11 && (
            <div
              className="mt-4 text-[#6356EA] text-center"
              onClick={handleAddIntent}
            >
              {t('workflow.nodes.decisionMakingNode.addIntentKeyword')}
            </div>
          )}
        </div>
      }
    />
  );
};

export const DecisionMakingDetail = memo(props => {
  const { id, data } = props;
  const { handleChangeNodeParam } = useNodeCommon({
    id,
    data,
  });
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const setNode = currentStore(state => state.setNode);
  const delayCheckNode = currentStore(state => state.delayCheckNode);
  const takeSnapshot = currentStore(state => state.takeSnapshot);
  const edges = currentStore(state => state.edges);
  const setEdges = currentStore(state => state.setEdges);
  const removeNodeRef = currentStore(state => state.removeNodeRef);
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);

  const handleChangeParam = useCallback(
    (intentId, fn, value) => {
      setNode(id, old => {
        const currentIntent = old.data.nodeParam.intentChains.find(
          item => item.id === intentId
        );
        fn(currentIntent, value);
        return {
          ...cloneDeep(old),
        };
      });
      autoSaveCurrentFlow();
      canPublishSetNot();
    },
    [setNode, canPublishSetNot, takeSnapshot, autoSaveCurrentFlow]
  );

  const intentChains = useMemo(() => {
    return data?.nodeParam?.intentChains || [];
  }, [data]);

  return (
    <div>
      <div className="p-[14px] pb-[6px]">
        <div className="w-full bg-[#fff] rounded-lg flex flex-col gap-2.5">
          <ModelSection id={id} data={data} />
          <SingleInput id={id} data={data} />
          <IntentSection
            id={id}
            intentChains={intentChains}
            setNode={setNode}
            setEdges={setEdges}
            takeSnapshot={takeSnapshot}
            removeNodeRef={removeNodeRef}
            edges={edges}
            canPublishSetNot={canPublishSetNot}
            handleChangeParam={handleChangeParam}
            canvasesDisabled={canvasesDisabled}
            delayCheckNode={delayCheckNode}
          />
          <AdvancedConfigSection
            id={id}
            data={data}
            handleChangeNodeParam={handleChangeNodeParam}
            delayCheckNode={delayCheckNode}
          />
          <FixedOutputs id={id} data={data} />
          <ExceptionHandling id={id} data={data} />
        </div>
      </div>
    </div>
  );
});

export const DecisionMaking = memo(({ id, data }) => {
  const { t } = useTranslation();
  const intentOrderList = t('workflow.nodes.flow.intentNumbers', {
    returnObjects: true,
  }) as string[];
  const { isConnectable } = useNodeCommon({ id, data });

  const intentChains = useMemo(() => {
    return data?.nodeParam?.intentChains || [];
  }, [data]);

  return (
    <>
      {intentChains.map((item, index) => (
        <>
          <span className="text-[#333] text-right">
            {index === intentChains.length - 1
              ? t('workflow.nodes.decisionMakingNode.defaultIntent')
              : t('workflow.nodes.decisionMakingNode.intentNumber', {
                  index: intentOrderList[index],
                })}
          </span>
          <span className="relative exception-handle-edge">
            <div
              className="text-overflow max-w-[300px]"
              title={
                index === intentChains.length - 1
                  ? ''
                  : item.name
                    ? item?.name
                    : '未配置内容'
              }
            >
              {index === intentChains.length - 1 ? (
                ''
              ) : item.name ? (
                item?.name
              ) : (
                <span className="text-[#b3b7c6]">未配置内容</span>
              )}
            </div>
            <SourceHandle
              nodeId={id}
              id={item.id}
              isConnectable={isConnectable}
            />
          </span>
        </>
      ))}
    </>
  );
});
