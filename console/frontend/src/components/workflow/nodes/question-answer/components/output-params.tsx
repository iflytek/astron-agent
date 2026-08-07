import React, { useMemo, useState } from 'react';
import { Checkbox } from 'antd';
import {
  FlowNodeInput,
  FlowSelect,
  FlowNodeTextArea,
  FlowInputNumber,
} from '@/components/workflow/ui';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { generateTypeDefault } from '@/utils';
import { useTranslation } from 'react-i18next';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';

const outputTypeList = [
  {
    label: 'String',
    value: 'string',
  },
  {
    label: 'Integer',
    value: 'integer',
  },
  {
    label: 'Boolean',
    value: 'boolean',
  },
  {
    label: 'Number',
    value: 'number',
  },
  {
    label: 'Array<String>',
    value: 'array-string',
  },
  {
    label: 'Array<Integer>',
    value: 'array-integer',
  },
  {
    label: 'Array<Boolean>',
    value: 'array-boolean',
  },
  {
    label: 'Array<Number>',
    value: 'array-number',
  },
];

export const RenderInput = ({
  id,
  item,
  setDefaultValueModalInfo,
  handleChangeOutputParam,
}): React.ReactElement => {
  const { t } = useTranslation();
  const type = item?.schema?.type;

  if (type === 'string') {
    return (
      <FlowNodeInput
        nodeId={id}
        maxLength={30}
        className="w-full"
        value={item?.schema?.default}
        onChange={value =>
          handleChangeOutputParam(
            item?.id,
            (data, v) => (data.schema.default = v),
            value
          )
        }
      />
    );
  }
  if (type === 'boolean') {
    return (
      <FlowSelect
        placeholder={t('workflow.nodes.common.selectPlaceholder')}
        options={[
          { label: 'true', value: true },
          { label: 'false', value: false },
        ]}
        value={item?.schema?.default}
        onChange={value =>
          handleChangeOutputParam(
            item?.id,
            (data, v) => (data.schema.default = v),
            value
          )
        }
      />
    );
  }
  if (type === 'integer') {
    return (
      <FlowInputNumber
        className="w-full flow-node-inputNumber-white"
        step={1}
        precision={0}
        value={item?.schema?.default}
        onChange={value =>
          handleChangeOutputParam(
            item?.id,
            (data, v) => (data.schema.default = v),
            value
          )
        }
      />
    );
  }
  if (type === 'number') {
    return (
      <FlowInputNumber
        className="w-full flow-node-inputNumber-white"
        placeholder={t('workflow.nodes.common.inputPlaceholder')}
        value={item?.schema?.default}
        onChange={value =>
          handleChangeOutputParam(
            item?.id,
            (data, v) => (data.schema.default = v),
            value
          )
        }
      />
    );
  }
  return (
    <div
      className="border border-[#e4eaff] bg-[#fff] px-[11px] h-[32px] rounded-lg cursor-pointer"
      style={{ lineHeight: '32px' }}
      onClick={() =>
        setDefaultValueModalInfo({
          open: true,
          nodeId: id,
          paramsId: item.id,
          data: item,
        })
      }
    >
      {`${item?.schema?.default}`}
    </div>
  );
};

export const RenderTypeInput = ({
  id,
  output,
  focusTextareaId,
  setFocusTextareaId,
  handleChangeOutputParam,
  delayCheckNode,
}): React.ReactElement => (
  <FlowNodeTextArea
    allowWheel={false}
    placeholder="请输入变量描述"
    maxLength={1000}
    rows={focusTextareaId === output.id ? 3 : 1}
    style={{
      height: focusTextareaId === output.id ? 86 : 30,
      overflow: focusTextareaId === output.id ? 'auto' : 'hidden',
      paddingTop: 2,
    }}
    value={output?.schema?.description}
    onChange={value =>
      handleChangeOutputParam(
        output.id,
        (data, v) => (data.schema.description = v),
        value
      )
    }
    onBlur={() => {
      setFocusTextareaId('');
      delayCheckNode(id);
    }}
    onFocus={() => setFocusTextareaId(output.id)}
  />
);

const FixedOutputs = ({ fixedOutputs }): React.ReactElement => {
  if (!fixedOutputs?.length) return null;

  return (
    <div className="flex flex-col gap-3">
      {fixedOutputs.map(item => (
        <div key={item.id} className="flex flex-col gap-1">
          <div className="flex items-start gap-3">
            <div className="flex flex-col w-1/4 flex-shrink-0">
              {item?.name}
            </div>
            <div className="flex flex-col w-1/4">{item?.schema?.type}</div>
            <div className="flex flex-col flex-1 h-full">
              {item?.schema?.description}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#F74E43]">
            <div className="flex flex-col w-1/4">{item?.nameErrMsg}</div>
            <div className="flex flex-col w-1/4"></div>
            <div className="flex flex-col flex-1">
              {item?.schema?.descriptionErrMsg}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ExtractionOutputs = ({
  extractionOutputs,
  id,
  handleChangeOutputParam,
  focusTextareaId,
  setFocusTextareaId,
  setDefaultValueModalInfo,
  handleRemoveOutputLine,
  delayCheckNode,
}): React.ReactElement => {
  if (!extractionOutputs?.length) return null;

  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const delayUpdateNodeRef = currentStore(state => state.delayUpdateNodeRef);
  const updateNodeRef = currentStore(state => state.updateNodeRef);

  return (
    <div className="flex flex-col gap-3">
      {extractionOutputs.map(item => (
        <div key={item.id} className="flex flex-col gap-1">
          <div className="flex items-start gap-3 overflow-hidden">
            <div className="flex flex-col w-[100px] flex-shrink-0">
              <FlowNodeInput
                nodeId={id}
                maxLength={30}
                className="w-full"
                value={item.name}
                onChange={value =>
                  handleChangeOutputParam(
                    item?.id,
                    (data, value) => (data.name = value),
                    value
                  )
                }
                onBlur={() => {
                  delayUpdateNodeRef(id);
                }}
              />
            </div>
            <div className="flex flex-col w-[100px]">
              <FlowSelect
                value={item?.schema?.type}
                options={outputTypeList}
                onBlur={() => {
                  updateNodeRef(id);
                }}
                onChange={value =>
                  handleChangeOutputParam(
                    item?.id,
                    (data, value) => {
                      data.schema.type = value;
                      data.schema.default = generateTypeDefault(value);
                    },
                    value
                  )
                }
              />
            </div>
            <div className="flex flex-col flex-1 h-full">
              <RenderTypeInput
                id={id}
                output={item}
                focusTextareaId={focusTextareaId}
                setFocusTextareaId={setFocusTextareaId}
                handleChangeOutputParam={handleChangeOutputParam}
                delayCheckNode={delayCheckNode}
              />
            </div>
            <div className="flex flex-col flex-1 h-full">
              <RenderInput
                id={id}
                item={item}
                setDefaultValueModalInfo={setDefaultValueModalInfo}
                handleChangeOutputParam={handleChangeOutputParam}
              />
            </div>
            <div className="w-[50px] flex justify-center items-center mt-1.5">
              <Checkbox
                checked={item.required}
                style={{
                  width: '16px',
                  height: '16px',
                  background: '#F9FAFB',
                }}
                onChange={e => {
                  e.stopPropagation();
                  handleChangeOutputParam(
                    item?.id,
                    (data, value) => (data.required = value),
                    e.target.checked
                  );
                }}
              />
            </div>
            {extractionOutputs.length > 1 && (
              <img
                src={remove}
                className="w-[16px] h-[17px] cursor-pointer mt-1.5"
                onClick={() => handleRemoveOutputLine(item.id)}
                alt=""
              />
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-[#F74E43]">
            <div className="flex flex-col w-[100px]">{item?.nameErrMsg}</div>
            <div className="flex flex-col w-[100px]"></div>
            <div className="flex flex-col flex-1">
              {item?.schema?.descriptionErrMsg}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

function index({ id, data }): React.ReactElement {
  const {
    handleChangeOutputParam,
    handleAddOutputLine,
    handleRemoveOutputLine,
    outputs,
  } = useNodeCommon({ id, data });
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const setDefaultValueModalInfo = useFlowsManager(
    state => state.setDefaultValueModalInfo
  );
  const delayCheckNode = currentStore(state => state.delayCheckNode);
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const [focusTextareaId, setFocusTextareaId] = useState('');

  const fixedOutputs = useMemo(() => {
    return data?.nodeParam?.answerType === 'direct'
      ? outputs.slice(0, 2)
      : outputs;
  }, [outputs, data]);

  const extractionOutputs = useMemo(() => {
    return outputs.slice(2);
  }, [outputs]);

  return (
    <div className="rounded-md px-[18px]">
      <div className="flex items-start gap-3 text-desc">
        <h4 className="w-1/4">{t('workflow.nodes.common.variableName')}</h4>
        <h4 className="w-1/4">{t('workflow.nodes.common.variableType')}</h4>
        <h4 className="flex-1">{t('workflow.nodes.common.description')}</h4>
      </div>
      <div className="flex flex-col gap-3">
        <FixedOutputs fixedOutputs={fixedOutputs} />
      </div>
      {data?.nodeParam?.answerType === 'direct' &&
        data?.nodeParam?.directAnswer?.handleResponse && (
          <div className="flex flex-col gap-3 my-3">
            <div className="text-base font-medium">
              {t('workflow.nodes.questionAnswerNode.parameterExtraction')}
            </div>
            <div className="flex items-start gap-3 text-desc">
              <h4 className="w-[100px]">
                {t('workflow.nodes.common.variableName')}
              </h4>
              <h4 className="w-[100px]">
                {t('workflow.nodes.common.variableType')}
              </h4>
              <h4 className="flex-1">
                {t('workflow.nodes.common.description')}
              </h4>
              <h4 className="flex-1">
                {t('workflow.nodes.questionAnswerNode.defaultValue')}
              </h4>
              <h4 className="w-[50px]">
                {t('workflow.nodes.questionAnswerNode.required')}
              </h4>
              {extractionOutputs.length > 1 && (
                <span className="w-5 h-5"></span>
              )}
            </div>
            <ExtractionOutputs
              extractionOutputs={extractionOutputs}
              id={id}
              handleChangeOutputParam={handleChangeOutputParam}
              focusTextareaId={focusTextareaId}
              setFocusTextareaId={setFocusTextareaId}
              setDefaultValueModalInfo={setDefaultValueModalInfo}
              handleRemoveOutputLine={handleRemoveOutputLine}
              delayCheckNode={delayCheckNode}
            />
            {!canvasesDisabled && (
              <div
                className="text-[#6356EA] text-xs font-medium flex items-center cursor-pointer gap-1.5 w-fit"
                onClick={() => handleAddOutputLine()}
              >
                <img src={inputAddIcon} className="w-3 h-3" alt="" />
                <span>{t('workflow.nodes.common.add')}</span>
              </div>
            )}
          </div>
        )}
    </div>
  );
}

export default index;
