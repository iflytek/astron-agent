import React, { useMemo, memo } from 'react';
import {
  FlowSelect,
  FlowTemplateEditor,
  FLowCollapse,
} from '@/components/workflow/ui';
import { Checkbox } from 'antd';
import { v4 as uuid } from 'uuid';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import InputParams from '@/components/workflow/nodes/components/inputs';
import OutputParams from './components/output-params';
import FixedOptions from './components/fixed-options';
import AnswerSettings from './components/answer-settings';
import { useTranslation } from 'react-i18next';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { SourceHandle } from '@/components/workflow/nodes/components/handle';
import { ModelSection } from '@/components/workflow/nodes/node-common';

const QuestionSection = memo(
  ({ id, data, delayCheckNode, handleChangeNodeParam }): React.ReactElement => {
    const { t } = useTranslation();
    return (
      <FLowCollapse
        label={
          <h4 className="text-base font-medium">
            {t('workflow.nodes.questionAnswerNode.questionContent')}
          </h4>
        }
        content={
          <div className="rounded-md px-[18px] pb-3 pointer-events-auto">
            <FlowTemplateEditor
              id={id}
              data={data}
              onBlur={() => delayCheckNode(id)}
              value={data?.nodeParam?.question}
              onChange={value =>
                handleChangeNodeParam(
                  d => (d.nodeParam.question = value),
                  value
                )
              }
              placeholder={t(
                'workflow.nodes.questionAnswerNode.questionPlaceholder'
              )}
            />
            <p className="text-xs text-[#F74E43]">
              {data?.nodeParam?.questionErrMsg}
            </p>
          </div>
        }
      />
    );
  }
);

const AnswerModeSection = memo(
  ({
    id,
    data,
    nodeParam,
    canvasesDisabled,
    handleChangeNodeParam,
    edges,
    setEdges,
    removeNodeRef,
  }): React.ReactElement => {
    const { t } = useTranslation();

    return (
      <>
        <FLowCollapse
          label={
            <div className="flex items-center justify-between">
              <span>{t('workflow.nodes.questionAnswerNode.answerMode')}</span>
              {!canvasesDisabled && (
                <AnswerSettings
                  data={data}
                  handleChangeNodeParam={handleChangeNodeParam}
                />
              )}
            </div>
          }
          content={
            <div className="px-[18px]">
              <FlowSelect
                value={nodeParam?.answerType}
                onChange={value => {
                  const edge = edges?.find(item => item?.source === id);
                  if (edge) removeNodeRef(edge.source, edge.target);

                  handleChangeNodeParam(d => {
                    d.nodeParam.answerType = value;
                    if (value === 'option') {
                      d.outputs = [
                        {
                          schema: {
                            default: '',
                            description: t(
                              'workflow.nodes.questionAnswerNode.nodeQuestionContent'
                            ),
                            type: 'string',
                          },
                          name: 'query',
                          id: uuid(),
                          required: true,
                        },
                        {
                          schema: {
                            default: '',
                            description: t(
                              'workflow.nodes.questionAnswerNode.userReplyOptions'
                            ),
                            type: 'string',
                          },
                          name: 'id',
                          id: uuid(),
                          required: true,
                        },
                        {
                          schema: {
                            default: '',
                            description: t(
                              'workflow.nodes.questionAnswerNode.userReplyOptionContent'
                            ),
                            type: 'string',
                          },
                          name: 'content',
                          id: uuid(),
                          required: true,
                        },
                      ];
                    } else {
                      d.outputs = [
                        {
                          schema: {
                            default: '',
                            description: t(
                              'workflow.nodes.questionAnswerNode.nodeQuestionContent'
                            ),
                            type: 'string',
                          },
                          name: 'query',
                          id: uuid(),
                          required: true,
                        },
                        {
                          schema: {
                            default: '',
                            description: t(
                              'workflow.nodes.questionAnswerNode.userReplyOptionContent'
                            ),
                            type: 'string',
                          },
                          name: 'content',
                          id: uuid(),
                          required: true,
                        },
                      ];
                      if (nodeParam?.directAnswer?.handleResponse) {
                        d.outputs.push({
                          id: uuid(),
                          name: '',
                          schema: { type: 'string' },
                          required: true,
                        });
                      }
                    }
                    setEdges(e => e?.filter(item => item?.source !== id));
                  }, value);
                }}
                options={[
                  {
                    label: t('workflow.nodes.questionAnswerNode.directReply'),
                    value: 'direct',
                  },
                  {
                    label: t('workflow.nodes.questionAnswerNode.optionReply'),
                    value: 'option',
                  },
                ]}
              />
            </div>
          }
        />
        {nodeParam?.answerType === 'option' && (
          <div className="relative intent-collapse-expand">
            <FLowCollapse
              isIntentCollapse={true}
              label={
                <div>
                  {t('workflow.nodes.questionAnswerNode.setOptionContent')}
                </div>
              }
              content={
                <FixedOptions id={id} data={data} nodeParam={nodeParam} />
              }
            />
          </div>
        )}
      </>
    );
  }
);

const OutputSection = memo(
  ({
    id,
    data,
    nodeParam,
    canvasesDisabled,
    handleChangeNodeParam,
    updateNodeRef,
  }): React.ReactElement => {
    const { t } = useTranslation();

    return (
      <FLowCollapse
        label={
          <div className="flex-1 flex items-center justify-between">
            <div className="text-base font-medium">
              {t('workflow.nodes.common.output')}
            </div>
            {!canvasesDisabled && nodeParam?.answerType === 'direct' && (
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={e => {
                  e?.stopPropagation();
                  handleChangeNodeParam(d => {
                    d.nodeParam.directAnswer.handleResponse =
                      !data.nodeParam.directAnswer.handleResponse;
                    d.outputs = d.nodeParam.directAnswer.handleResponse
                      ? [
                          ...d.outputs.slice(0, 2),
                          {
                            id: uuid(),
                            name: '',
                            schema: { type: 'string' },
                            required: true,
                          },
                        ]
                      : d.outputs.slice(0, 2);
                    updateNodeRef(id);
                  });
                }}
              >
                <Checkbox checked={nodeParam?.directAnswer?.handleResponse} />
                <span>
                  {t(
                    'workflow.nodes.questionAnswerNode.extractFieldsFromUserReply'
                  )}
                </span>
              </div>
            )}
          </div>
        }
        content={<OutputParams id={id} data={data} />}
      />
    );
  }
);

export const QuestionAnswerDetail = memo(props => {
  const { id, data } = props;
  const { handleChangeNodeParam, nodeParam } = useNodeCommon({ id, data });
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const delayCheckNode = currentStore(state => state.delayCheckNode);
  const edges = currentStore(state => state.edges);
  const setEdges = currentStore(state => state.setEdges);
  const removeNodeRef = currentStore(state => state.removeNodeRef);
  const updateNodeRef = currentStore(state => state.updateNodeRef);

  return (
    <div className="p-[14px] pb-[6px]">
      <div className="bg-[#fff] rounded-lg flex flex-col gap-2.5">
        <ModelSection id={id} data={data} />
        <InputParams id={id} data={data}>
          <div className="flex-1 flex items-center justify-between text-base font-medium">
            <div>{t('workflow.nodes.questionAnswerNode.input')}</div>
          </div>
        </InputParams>
        <QuestionSection
          id={id}
          data={data}
          delayCheckNode={delayCheckNode}
          handleChangeNodeParam={handleChangeNodeParam}
        />
        <AnswerModeSection
          id={id}
          data={data}
          nodeParam={nodeParam}
          canvasesDisabled={canvasesDisabled}
          handleChangeNodeParam={handleChangeNodeParam}
          edges={edges}
          setEdges={setEdges}
          removeNodeRef={removeNodeRef}
        />
        <OutputSection
          id={id}
          data={data}
          nodeParam={nodeParam}
          canvasesDisabled={canvasesDisabled}
          handleChangeNodeParam={handleChangeNodeParam}
          updateNodeRef={updateNodeRef}
        />
      </div>
    </div>
  );
});

const QuestionContent = ({ question }): React.ReactElement => {
  const { t } = useTranslation();
  const hasContent = question?.trim();
  return (
    <>
      <div className="text-[#333] text-right">
        {t('workflow.nodes.questionAnswerNode.questionContent')}
      </div>
      <span
        className="max-w-[300px] text-overflow"
        style={{ color: hasContent ? '' : '#B3B7C6' }}
        title={
          hasContent
            ? question
            : t('workflow.nodes.questionAnswerNode.questionContentPlaceholder')
        }
      >
        {hasContent
          ? question
          : t('workflow.nodes.questionAnswerNode.questionContentPlaceholder')}
      </span>
    </>
  );
};

const AnswerType = ({ type }): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <>
      <span className="text-[#333] text-right">
        {t('workflow.nodes.questionAnswerNode.answerType')}
      </span>
      <span>
        {type === 'direct'
          ? t('workflow.nodes.questionAnswerNode.directReply')
          : t('workflow.nodes.questionAnswerNode.optionReply')}
      </span>
    </>
  );
};
const OptionAnswers = ({ id, answers, isConnectable }): React.ReactElement => {
  const { t } = useTranslation();
  if (!answers?.length) return null;

  return answers.map(item => (
    <div key={item.id} className="contents">
      <div></div>
      <div className="flex items-center gap-2 relative exception-handle-edge">
        <span className="text-[#000] text-right w-[50px] px-1 py-0.5 rounded text-xs flex items-center justify-center bg-[#eff0f8]">
          {item?.name}
        </span>
        {item?.content ? (
          <span
            className="text-[#353a4a] max-w-[200px] text-overflow"
            title={item?.content}
          >
            {item?.content}
          </span>
        ) : (
          <span className="text-[#B3B7C6]">
            {t('workflow.nodes.questionAnswerNode.questionContentPlaceholder')}
          </span>
        )}
        <SourceHandle nodeId={id} id={item.id} isConnectable={isConnectable} />
      </div>
    </div>
  ));
};

const DefaultOptionAnswer = ({
  id,
  answer,
  isConnectable,
}): React.ReactElement => {
  const { t } = useTranslation();
  if (!answer) return null;

  return (
    <div className="contents">
      <div></div>
      <div className="flex items-center gap-2 relative exception-handle-edge">
        <span className="text-[#000] text-right w-[50px] px-1 py-0.5 rounded text-xs flex items-center justify-center bg-[#eff0f8]">
          {t('workflow.nodes.questionAnswerNode.other')}
        </span>
        <span className="text-[#353a4a]">
          {t('workflow.nodes.questionAnswerNode.userInvisible')}
        </span>
        <SourceHandle
          nodeId={id}
          id={answer.id}
          isConnectable={isConnectable}
        />
      </div>
    </div>
  );
};

export const QuestionAnswer = memo(({ id, data }): React.ReactElement => {
  const { isConnectable } = useNodeCommon({ id, data });

  const optionAnswer = useMemo(
    () => data?.nodeParam?.optionAnswer?.filter(item => item.type === 2),
    [data?.nodeParam?.optionAnswer]
  );

  const optionDefaultAnswer = useMemo(
    () => data?.nodeParam?.optionAnswer?.find(item => item.type === 1),
    [data?.nodeParam?.optionAnswer]
  );

  return (
    <>
      <QuestionContent question={data?.nodeParam?.question} />
      <AnswerType type={data?.nodeParam?.answerType} />

      {data?.nodeParam?.answerType === 'option' && (
        <>
          <OptionAnswers
            id={id}
            answers={optionAnswer}
            isConnectable={isConnectable}
          />
          <DefaultOptionAnswer
            id={id}
            answer={optionDefaultAnswer}
            isConnectable={isConnectable}
          />
        </>
      )}
    </>
  );
});
