import React, { useEffect, useState, useRef, memo } from 'react';
import { Tooltip, Slider, Switch } from 'antd';
import { useMemoizedFn } from 'ahooks';
import { FlowInputNumber } from '@/components/workflow/ui';
import { useTranslation } from 'react-i18next';

import debuggerIcon from '@/assets/imgs/workflow/debugger-icon.png';
import close from '@/assets/imgs/workflow/modal-close.png';
import questionMark from '@/assets/imgs/common/questionmark.png';

// ----------------- hooks -----------------
function useClickOutside(
  ref: React.RefObject<HTMLDivElement>,
  onClose: () => void
): void | (() => void) {
  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.body.addEventListener('click', handleClick);
    return (): void => document.body.removeEventListener('click', handleClick);
  }, [ref, onClose]);
}

function useConfigs(currentSelectModel, setConfigs): void {
  useEffect(() => {
    if (!currentSelectModel) return;

    try {
      if (currentSelectModel?.llmSource === 2) {
        const configs =
          currentSelectModel?.config?.serviceBlock?.[
            currentSelectModel.serviceId
          ]?.[0]?.fields ||
          currentSelectModel?.config?.serviceBlock?.['@@serviceId@@']?.[0]
            ?.fields ||
          [];
        configs.forEach(item => {
          if (item.key === 'max_tokens') item.key = 'maxTokens';
          if (item.key === 'top_k') item.key = 'topK';
          if (item.key === 'search_disable') item.key = 'searchDisable';
        });
        setConfigs(configs);
      } else {
        const configs = JSON.parse(currentSelectModel?.config || '[]')?.map(
          item => ({
            ...item,
            desc: item?.name,
            name: item?.key,
          })
        );
        setConfigs(configs);
      }
    } catch {
      return;
    }
  }, [currentSelectModel]);
}

// ----------------- 子组件 -----------------
function ParamSwitch({
  item,
  nodeParam,
  currentSelectModel,
  handleChangeNodeParam,
  handleDifferentModel,
}): React.ReactElement {
  return (
    <Switch
      className="list-switch config-switch"
      checked={
        currentSelectModel?.llmSource === 0
          ? nodeParam?.extraParams?.[item.key]
          : !nodeParam[item.key]
      }
      onChange={val =>
        handleChangeNodeParam(
          (data, v) => handleDifferentModel(data, item, v),
          currentSelectModel?.llmSource === 0 ? val : !val
        )
      }
    />
  );
}

function ParamRange({
  item,
  nodeParam,
  handleChangeNodeParam,
  handleDifferentModel,
}): React.ReactElement {
  const value = nodeParam[item.key] ?? nodeParam?.extraParams?.[item.key];

  return (
    <div className="w-full flex items-center justify-between">
      <Slider
        min={item?.constraintContent?.[0]?.name}
        max={item?.constraintContent?.[1]?.name}
        step={item?.precision || 1}
        value={value}
        className="flex-1 config-slider nodrag"
        onChange={val =>
          handleChangeNodeParam(
            (data, v) => handleDifferentModel(data, item, v),
            val
          )
        }
      />
      <FlowInputNumber
        className="global-inputnumber-center ml-[18px] pt-1.5 pl-0.5 w-[60px] text-center nodrag"
        value={value}
        onChange={val =>
          handleChangeNodeParam(
            (data, v) => handleDifferentModel(data, item, v),
            val
          )
        }
        onBlur={() => {
          if (
            nodeParam?.extraParams &&
            nodeParam?.extraParams?.[item.key] === null
          ) {
            handleChangeNodeParam(
              data => (data.nodeParam.extraParams[item.key] = item.default),
              item.default
            );
          }
          if (nodeParam?.[item.key] === null) {
            handleChangeNodeParam(
              data => (data.nodeParam[item.key] = item.default),
              item.default
            );
          }
        }}
        step={item?.precision || 1}
        min={item?.constraintContent?.[0]?.name}
        max={item?.constraintContent?.[1]?.name}
        controls={false}
      />
    </div>
  );
}

function ParamItem({
  item,
  nodeParam,
  currentSelectModel,
  handleChangeNodeParam,
  handleDifferentModel,
}): React.ReactElement {
  return (
    <div>
      <div className="flex items-center gap-1 justify-between">
        <div className="flex items-center gap-1">
          <span>{item.name}</span>
          {item.desc && (
            <Tooltip
              title={item.desc}
              overlayClassName="black-tooltip config-secret"
            >
              <img src={questionMark} width={16} className="ml-1" alt="" />
            </Tooltip>
          )}
        </div>
        {item.constraintType === 'switch' && (
          <ParamSwitch
            {...{
              item,
              nodeParam,
              currentSelectModel,
              handleChangeNodeParam,
              handleDifferentModel,
            }}
          />
        )}
      </div>
      {item.constraintType === 'range' && (
        <ParamRange
          {...{ item, nodeParam, handleChangeNodeParam, handleDifferentModel }}
        />
      )}
    </div>
  );
}

// ----------------- 主组件 -----------------
function ModelParams({
  setShowModelParmas,
  currentSelectModel,
  nodeParam,
  handleChangeNodeParam,
}): React.ReactElement {
  const { t } = useTranslation();
  const paramsRef = useRef<HTMLDivElement | null>(null);
  const [configs, setConfigs] = useState([]);

  useConfigs(currentSelectModel, setConfigs);
  useClickOutside(paramsRef, () => setShowModelParmas(false));

  const handleDifferentModel = useMemoizedFn((data, item, value) => {
    if (currentSelectModel?.llmSource === 0) {
      Reflect.deleteProperty(data.nodeParam, item.key);
      data.nodeParam.extraParams = {
        ...data.nodeParam.extraParams,
        [item.key]: value,
      };
    } else {
      data.nodeParam[item.key] = value;
    }
  });

  return (
    <div
      ref={paramsRef}
      className="absolute right-[-3px] top-8 border border-[#f5f7fc] bg-[#fff] rounded-lg p-4"
      style={{
        zIndex: 100,
        width: 'calc(100% - 4px)',
        boxShadow: '0px 4px 10px 0px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={debuggerIcon} className="w-3 h-3" alt="" />
          <span className="font-medium text-base">
            {t('workflow.nodes.modelSelect.modelParamsSettings')}
          </span>
        </div>
        <img
          src={close}
          className="w-3 h-3 cursor-pointer"
          alt=""
          onClick={e => {
            e.stopPropagation();
            setShowModelParmas(false);
          }}
        />
      </div>
      <div className="flex flex-col gap-2 w-full text-second font-medium mt-4">
        {configs
          ?.filter((item: unknown) =>
            ['range', 'switch'].includes(item.constraintType)
          )
          ?.map((item: unknown, index) => (
            <ParamItem
              key={index}
              {...{
                item,
                nodeParam,
                currentSelectModel,
                handleChangeNodeParam,
                handleDifferentModel,
              }}
            />
          ))}
      </div>
    </div>
  );
}

export default memo(ModelParams);
