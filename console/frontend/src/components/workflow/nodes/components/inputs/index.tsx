import type { NodeComponentProps } from '@/components/workflow/nodes/types';
import { inputReference } from '@/components/workflow/nodes/types';
import type { ChangeInputParameter } from '@/components/workflow/nodes/types';
import type {
  WorkflowInput,
  WorkflowReference,
} from '@/components/workflow/types/domain';
import React, { memo } from 'react';
import { Button, Tooltip } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
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

interface InputFieldProps extends NodeComponentProps {
  item: WorkflowInput;
}

interface InputChangeProps {
  id: string;
  item: WorkflowInput;
  handleChangeInputParam: ChangeInputParameter;
}

interface ReferenceFieldProps extends InputChangeProps {
  isFixedInputsNode: boolean;
  references: WorkflowReference[];
}

function NameField({
  id,
  item,
  handleChangeInputParam,
}: InputChangeProps): React.ReactElement {
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
      id={`${id}-${item.id}-name`}
      aria-label="参数名称"
      maxLength={30}
      value={item.name}
      onChange={value =>
        handleChangeInputParam(item.id, (data, val) => (data.name = val), value)
      }
    />
  );
}
export function TypeSelector({
  id,
  data,
  item,
}: InputFieldProps): React.ReactElement {
  const { handleChangeInputParam, isIteratorNode, isFixedInputsNode } =
    useNodeCommon({
      id,
      data,
    });
  const { t } = useTranslation();
  if (isIteratorNode) return <>Array</>;

  return (
    <FlowSelect
      aria-label={`${item.name || '参数'}的赋值方式`}
      value={item?.schema?.value?.type}
      options={[
        { label: t('workflow.nodes.common.input'), value: 'literal' },
        { label: t('workflow.nodes.common.reference'), value: 'ref' },
      ]}
      onChange={(value: 'literal' | 'ref') =>
        handleChangeInputParam(
          item.id,
          (data, val) => {
            if (val === 'literal') {
              data.schema.value = {
                ...data.schema.value,
                type: 'literal',
                content: '',
              };
              if (!isFixedInputsNode) {
                data.schema.type = 'string';
              }
            } else {
              data.schema.value = {
                ...data.schema.value,
                type: 'ref',
                content: {},
              };
            }
          },
          value
        )
      }
    />
  );
}

export function ValueField({
  id,
  data,
  item,
}: InputFieldProps): React.ReactElement {
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
}: InputChangeProps): React.ReactElement {
  return (
    <FlowNodeInput
      nodeId={id}
      aria-label={`${item.name || '参数'}的值`}
      value={
        item.schema.value.type === 'literal'
          ? typeof item.schema.value.content === 'string'
            ? item.schema.value.content
            : JSON.stringify(item.schema.value.content)
          : ''
      }
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

function RemoveButton({
  id,
  data,
  item,
}: InputFieldProps): React.ReactElement | null {
  const { allowNoInputParams, canvasesDisabled, handleRemoveInputLine } =
    useNodeCommon({ id, data });
  if (!allowNoInputParams || canvasesDisabled) return null;

  const isImageParam = item?.customParameterType === 'image_understanding';
  return (
    <Tooltip title={isImageParam ? '图片参数不可删除' : '删除参数'}>
      <Button
        type="text"
        size="small"
        className="workflow-parameter-remove"
        aria-label={`删除参数 ${item.name || ''}`}
        disabled={isImageParam}
        icon={<DeleteOutlined />}
        onClick={() => handleRemoveInputLine(item.id)}
      />
    </Tooltip>
  );
}

/** 单独拆出引用选择 */
function ReferenceField({
  isFixedInputsNode,
  id,
  item,
  references,
  handleChangeInputParam,
}: ReferenceFieldProps): React.ReactElement {
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const checkNode = currentStore(state => state.checkNode);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const reference = inputReference(item);
  const cascaderValue =
    reference?.nodeId && reference.name
      ? [reference.nodeId, reference.name]
      : [];

  const handleSelect = (node: WorkflowReference): void =>
    handleChangeInputParam(
      item.id,
      (data, val) => {
        data.schema.value.content = val.content;
        if (!isFixedInputsNode) {
          data.schema.type = val.type ?? data.schema.type;
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
      aria-label={`${item.name || '参数'}引用的变量`}
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

export function ErrorMessages({
  item,
}: {
  item: WorkflowInput;
}): React.ReactElement {
  const errors = [item?.nameErrMsg, item?.schema?.value?.contentErrMsg].filter(
    Boolean
  );
  return errors.length ? (
    <div className="workflow-parameter-errors" role="status">
      {errors.map((error, index) => (
        <p key={index}>{error}</p>
      ))}
    </div>
  ) : (
    <></>
  );
}

function index({
  id,
  data,
}: React.PropsWithChildren<NodeComponentProps> & {
  allowAdd?: boolean;
}): React.ReactElement {
  const { inputs, handleAddInputLine, handleChangeInputParam, allowAddInput } =
    useNodeCommon({ id, data });
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
        <div className="workflow-parameter-list">
          {data?.nodeParam?.enableChatHistoryV2?.isEnabled && (
            <ChatHistory id={id} data={data} />
          )}
          {inputs.map(item => (
            <div key={item.id} className="workflow-parameter-field">
              <div className="workflow-parameter-row">
                <div className="workflow-parameter-name">
                  <label className="sr-only" htmlFor={`${id}-${item.id}-name`}>
                    {t('workflow.nodes.common.parameterName')}
                  </label>
                  <NameField
                    id={id}
                    item={item}
                    handleChangeInputParam={handleChangeInputParam}
                  />
                </div>
                <TypeSelector id={id} data={data} item={item} />
                <ValueField id={id} data={data} item={item} />
                <RemoveButton item={item} id={id} data={data} />
              </div>
              <ErrorMessages item={item} />
            </div>
          ))}
          {allowAddInput && (
            <Button
              type="text"
              size="small"
              className="workflow-add-parameter"
              icon={<PlusOutlined />}
              onClick={() => handleAddInputLine()}
            >
              {t('workflow.nodes.common.add')}
            </Button>
          )}
        </div>
      }
    />
  );
}

export default memo(index);
