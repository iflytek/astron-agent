import React, { useRef, useState, useMemo } from 'react';
import { useClickAway } from 'ahooks';
import { FlowInputNumber } from '@/components/workflow/ui';
import { Tooltip, Switch, Slider } from 'antd';
import { v4 as uuid } from 'uuid';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useTranslation } from 'react-i18next';

import answerSettings from '@/assets/imgs/workflow/answer-settings.svg';
import close from '@/assets/imgs/workflow/modal-close.png';
import answerSettingsParams from '@/assets/imgs/workflow/answer-settings-params.svg';

const UserMustAnswer = ({
  data,
  handleChangeNodeParam,
}): React.ReactElement => {
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const edges = currentStore(state => state.edges);
  const setEdges = currentStore(state => state.setEdges);
  const removeNodeRef = currentStore(state => state.removeNodeRef);
  const optionDefaultAnswerOptionId = useMemo(() => {
    return data?.nodeParam?.optionAnswer?.find(item => item.type === 1)?.id;
  }, [data?.nodeParam?.optionAnswer]);

  return (
    <div className="w-full flex items-center justify-between">
      <div className="flex items-center gap-1">
        <span>{t('workflow.nodes.questionAnswerNode.userMustAnswer')}</span>
        <Tooltip
          title={t('workflow.nodes.questionAnswerNode.userMustAnswerTip')}
          overlayClassName="black-tooltip"
        >
          <img src={answerSettingsParams} className="w-3 h-3" alt="" />
        </Tooltip>
      </div>
      <Switch
        className="list-switch config-switch"
        checked={data?.nodeParam?.needReply}
        onChange={value => {
          if (value) {
            const edge = edges.find(
              edge => edge.sourceHandle === optionDefaultAnswerOptionId
            );
            if (
              edges?.filter(
                item =>
                  item?.source === edge?.source && item?.target === edge?.target
              )?.length === 1
            ) {
              removeNodeRef(edge.source, edge.target);
            }
            setEdges(edges =>
              edges.filter(
                item => item.sourceHandle !== optionDefaultAnswerOptionId
              )
            );
          }
          handleChangeNodeParam((data, value) => {
            data.nodeParam.needReply = value;
            if (!value) {
              data?.nodeParam?.optionAnswer.push({
                id: `option-one-of::${uuid()}`,
                name: 'default',
                type: 1,
                content: '',
                content_type: 'string',
              });
            } else {
              data.nodeParam.optionAnswer =
                data?.nodeParam?.optionAnswer?.filter(item => item?.type === 2);
            }
          }, value);
        }}
      />
    </div>
  );
};

const ConversationTimeout = ({
  data,
  handleChangeNodeParam,
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className="w-full flex items-center gap-3">
      <div className="flex items-center gap-1 w-[128px]">
        <span>
          {t('workflow.nodes.questionAnswerNode.conversationTimeout')}
        </span>
        <Tooltip
          title={t('workflow.nodes.questionAnswerNode.conversationTimeoutTip')}
          overlayClassName="black-tooltip"
        >
          <img src={answerSettingsParams} className="w-3 h-3" alt="" />
        </Tooltip>
      </div>
      <Slider
        min={2}
        max={5}
        step={1}
        value={data?.nodeParam?.timeout}
        className="flex-1 config-slider nodrag"
        onChange={value =>
          handleChangeNodeParam(
            (data, value) => (data.nodeParam.timeout = value),
            value
          )
        }
      />
      <div className="flex items-center gap-2.5">
        <FlowInputNumber
          value={data?.nodeParam?.timeout}
          onChange={value =>
            handleChangeNodeParam(
              (data, value) => (data.nodeParam.timeout = value),
              value
            )
          }
          onBlur={() => {
            if (data?.nodeParam?.timeout === null) {
              handleChangeNodeParam(
                (data, value) => (data.nodeParam.timeout = value),
                3
              );
            }
          }}
          min={2}
          max={5}
          precision={0}
          className="nodrag w-[40px] input-number-bg-white"
          controls={false}
        />
        <span className="text-xss font-medium text-[#7F7F7F]">
          {t('workflow.nodes.questionAnswerNode.minute')}
        </span>
      </div>
    </div>
  );
};

const MaxRetrySettings = ({
  data,
  handleChangeNodeParam,
}): React.ReactElement | null => {
  if (data?.nodeParam?.answerType == 'direct') {
    return null;
  }

  const { t } = useTranslation();

  return (
    <div className="w-full flex items-center gap-3">
      <div className="flex items-center gap-1 w-[128px]">
        <span>{t('workflow.nodes.questionAnswerNode.maxRetrySettings')}</span>
        <Tooltip
          title={t('workflow.nodes.questionAnswerNode.maxRetrySettingsTip')}
          overlayClassName="black-tooltip"
        >
          <img src={answerSettingsParams} className="w-3 h-3" alt="" />
        </Tooltip>
      </div>
      <Slider
        min={2}
        max={5}
        step={1}
        value={data?.nodeParam?.directAnswer?.maxRetryCounts}
        className="flex-1 config-slider nodrag"
        onChange={value =>
          handleChangeNodeParam(
            (data, value) =>
              (data.nodeParam.directAnswer.maxRetryCounts = value),
            value
          )
        }
      />
      <div className="flex items-center gap-2.5">
        <FlowInputNumber
          value={data?.nodeParam?.directAnswer?.maxRetryCounts}
          onChange={value =>
            handleChangeNodeParam(
              (data, value) =>
                (data.nodeParam.directAnswer.maxRetryCounts = value),
              value
            )
          }
          onBlur={() => {
            if (data?.nodeParam?.directAnswer?.maxRetryCounts === null) {
              handleChangeNodeParam(
                (data, value) =>
                  (data.nodeParam.directAnswer.maxRetryCounts = value),
                3
              );
            }
          }}
          min={2}
          max={5}
          precision={0}
          className="nodrag w-[40px] input-number-bg-white"
          controls={false}
        />
        <span className="text-xss font-medium text-[#7F7F7F]">
          {t('workflow.nodes.questionAnswerNode.times')}
        </span>
      </div>
    </div>
  );
};

function Index({ data, handleChangeNodeParam }): React.ReactElement {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false); // 默认关闭
  const ref = useRef(null);

  useClickAway(() => {
    setVisible(false);
  }, ref);

  return (
    <div className="relative" ref={ref}>
      <img
        src={answerSettings}
        className="w-[13px] h-[13px] cursor-pointer"
        alt=""
        onClick={e => {
          e.stopPropagation(); // 阻止冒泡
          setVisible(!visible);
        }}
      />
      {visible && (
        <div
          className="absolute rounded-lg bg-[#fff] z-50 w-[400px] p-5 right-0 top-[21px]"
          style={{ boxShadow: '0px 2px 4px 0px rgba(46, 51, 68, 0.2)' }}
          onClick={e => {
            e.stopPropagation();
          }}
        >
          <div className="w-full flex items-center justify-between">
            <span className="font-medium text-base">
              {t('workflow.nodes.questionAnswerNode.answerSettings')}
            </span>
            <img
              src={close}
              className="w-3 h-3 cursor-pointer"
              alt=""
              onClick={e => {
                e.stopPropagation();
                setVisible(false);
              }}
            />
          </div>
          <div className="mt-8 flex flex-col gap-5">
            <UserMustAnswer
              data={data}
              handleChangeNodeParam={handleChangeNodeParam}
            />
            <ConversationTimeout
              data={data}
              handleChangeNodeParam={handleChangeNodeParam}
            />
            <MaxRetrySettings
              data={data}
              handleChangeNodeParam={handleChangeNodeParam}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Index;
