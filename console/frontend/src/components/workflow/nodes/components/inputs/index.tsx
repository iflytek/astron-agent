import React, { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlowNodeInput,
  FlowSelect,
  FlowCascader,
  FLowCollapse,
} from '@/components/workflow/ui';
import ChatHistory from '@/components/workflow/nodes/components/chat-history';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { EnabledChatHistory } from '@/components/workflow/nodes/components/single-input';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';

function NameField({
  id,
  item,
  handleChangeInputParam,
}: unknown): React.ReactElement {
  if (item?.customParameterType === 'image_understanding') {
    return (
      <div className="flex items-center gap-2">
        <span>{item?.name}</span>
        <div className="bg-[#F0F0F0] px-2.5 py-0.5 rounded text-xs">Image</div>
      </div>
    );
  }
  return (
    <FlowNodeInput
      nodeId={id}
      maxLength={30}
      value={item.name}
      onChange={value =>
        handleChangeInputParam(item.id, (data, val) => (data.name = val), value)
      }
    />
  );
}
export function TypeSelector({ id, data, item }: unknown): React.ReactElement {
  const { handleChangeInputParam, isIteratorNode, isFixedInputsNode } =
    useNodeCommon({
      id,
      data,
    });
  const { t } = useTranslation();
  if (isIteratorNode) return <>Array</>;

  return (
    <FlowSelect
      value={item?.schema?.value?.type}
      options={[
        { label: t('workflow.nodes.common.input'), value: 'literal' },
        { label: t('workflow.nodes.common.reference'), value: 'ref' },
      ]}
      onChange={value =>
        handleChangeInputParam(
          item.id,
          (data, val) => {
            data.schema.value.type = val;
            if (val === 'literal') {
              data.schema.value.content = '';
              if (!isFixedInputsNode) {
                data.schema.type = 'string';
              }
            } else {
              data.schema.value.content = {};
            }
          },
          value
        )
      }
    />
  );
}

export function ValueField({ id, data, item }: unknown): React.ReactElement {
  const { references, handleChangeInputParam, isFixedInputsNode } =
    useNodeCommon({ id, data });
  const valueType = item?.schema?.value?.type;

  if (valueType === 'literal') {
    return (
      <LiteralField
        id={id}
        item={item}
        handleChangeInputParam={handleChangeInputParam}
      />
    );
  }

  return (
    <ReferenceField
      isFixedInputsNode={isFixedInputsNode}
      id={id}
      item={item}
      references={references}
      handleChangeInputParam={handleChangeInputParam}
    />
  );
}

/** 单独拆出 literal 输入 */
export function LiteralField({
  id,
  item,
  handleChangeInputParam,
}: unknown): React.ReactElement {
  return (
    <FlowNodeInput
      nodeId={id}
      value={item?.schema?.value?.content}
      onChange={value =>
        handleChangeInputParam(
          item.id,
          (data, val) => (data.schema.value.content = val),
          value
        )
      }
    />
  );
}

function RemoveButton({ id, data, item }: unknown): React.ReactElement {
  const { allowNoInputParams, canvasesDisabled, handleRemoveInputLine } =
    useNodeCommon({ id, data });
  if (!allowNoInputParams || canvasesDisabled) return null;

  const isImageParam = item?.customParameterType === 'image_understanding';
  return (
    <img
      src={remove}
      className="w-[16px] h-[17px] flex-shrink-0 mt-1.5"
      style={{
        cursor: isImageParam ? 'not-allowed' : 'pointer',
        opacity: isImageParam ? 0.5 : 1,
      }}
      onClick={() => !isImageParam && handleRemoveInputLine(item.id)}
      alt=""
    />
  );
}

/** 单独拆出引用选择 */
function ReferenceField({
  isFixedInputsNode,
  id,
  item,
  references,
  handleChangeInputParam,
}: unknown): React.ReactElement {
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const checkNode = currentStore(state => state.checkNode);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const cascaderValue = item?.schema?.value?.content?.nodeId
    ? [item?.schema?.value?.content?.nodeId, item?.schema?.value?.content?.name]
    : [];

  const handleSelect = (node: unknown): void =>
    handleChangeInputParam(
      item.id,
      (data, val) => {
        data.schema.value.content = val.content;
        if (!isFixedInputsNode) {
          data.schema.type = val.type;
        }
        data.fileType = val.fileType;
      },
      {
        content: {
          id: node.id,
          nodeId: node.originId,
          name: node.value,
        },
        type: node.type,
        fileType: node?.fileType,
      }
    );

  return (
    <FlowCascader
      value={cascaderValue}
      options={references}
      handleTreeSelect={handleSelect}
      onBlur={() => {
        checkNode(id);
        autoSaveCurrentFlow();
      }}
    />
  );
}

export function ErrorMessages({ item }: unknown): React.ReactElement {
  return (
    <div className="flex items-center gap-3 text-xs text-[#F74E43]">
      <div className="flex flex-col w-1/3">{item?.nameErrMsg}</div>
      <div className="flex flex-col w-1/4"></div>
      <div className="flex flex-col flex-1">
        {item?.schema?.value?.contentErrMsg}
      </div>
    </div>
  );
}

function index({ id, data }): React.ReactElement {
  const {
    inputs,
    isIteratorNode,
    handleAddInputLine,
    handleChangeInputParam,
    allowAddInput,
  } = useNodeCommon({ id, data });
  const { t } = useTranslation();

  return (
    <FLowCollapse
      label={
        <div className="w-full flex items-center cursor-pointer gap-2">
          <div className="flex items-center justify-between text-base font-medium flex-1">
            <div>{t('common.input')}</div>
            <EnabledChatHistory id={id} data={data} />
          </div>
        </div>
      }
      content={
        <div className="px-[18px] rounded-lg overflow-hidden">
          <div className="flex items-center gap-3 text-desc">
            <h4 className="w-1/3">
              {t('workflow.nodes.common.parameterName')}
            </h4>
            <h4 className="w-1/4">
              {isIteratorNode ? ' ' : t('workflow.nodes.common.parameterValue')}
            </h4>
            <h4 className="flex-1">
              {isIteratorNode ? t('workflow.nodes.common.parameterValue') : ' '}
            </h4>
            <span className="w-5 h-5"></span>
          </div>
          {data?.nodeParam?.enableChatHistoryV2?.isEnabled && (
            <ChatHistory id={id} data={data} />
          )}
          <div className="flex flex-col gap-3 mt-4">
            {inputs.map(item => (
              <div key={item.id} className="flex flex-col gap-1">
                <div className="flex items-start gap-3 overflow-hidden">
                  <div className="flex flex-col flex-shrink-0 w-1/3">
                    <NameField
                      id={id}
                      item={item}
                      handleChangeInputParam={handleChangeInputParam}
                    />
                  </div>
                  <div className="flex flex-col flex-shrink-0 w-1/4">
                    <TypeSelector id={id} data={data} item={item} />
                  </div>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <ValueField id={id} data={data} item={item} />
                  </div>
                  <RemoveButton item={item} id={id} data={data} />
                </div>
                <ErrorMessages item={item} />
              </div>
            ))}
          </div>
          {allowAddInput && (
            <div
              className="text-[#6356EA] text-xs font-medium mt-1 inline-flex items-center cursor-pointer gap-1.5"
              onClick={() => handleAddInputLine()}
            >
              <img src={inputAddIcon} className="w-3 h-3" alt="" />
              <span>{t('workflow.nodes.common.add')}</span>
            </div>
          )}
        </div>
      }
    />
  );
}

export default memo(index);
