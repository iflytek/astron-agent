import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlowNodeInput,
  FlowSelect,
  FlowCascader,
} from '@/components/workflow/ui';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { useVariableMemoryHandlers } from '@/components/workflow/hooks/use-variable-memory-handlers';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';

const NameInput = ({
  id,
  item,
  handleChangeParam,
  updateVariableMemoryNodeRef,
}): React.ReactElement => {
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const delayCheckNode = currentStore(state => state.delayCheckNode);

  return (
    <FlowNodeInput
      nodeId={id}
      maxLength={30}
      value={item.name}
      onChange={value =>
        handleChangeParam(item.id, (data, value) => (data.name = value), value)
      }
      onBlur={() => {
        updateVariableMemoryNodeRef();
        delayCheckNode(id);
      }}
    />
  );
};

const TypeSelect = ({ item, handleChangeParam }): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <FlowSelect
      value={item?.schema?.value?.type}
      options={[
        { label: t('workflow.nodes.common.input'), value: 'literal' },
        { label: t('workflow.nodes.common.reference'), value: 'ref' },
      ]}
      onChange={value =>
        handleChangeParam(
          item?.id,
          (data, value) => {
            data.schema.value.type = value;
            data.schema.value.content = value === 'literal' ? '' : {};
          },
          value
        )
      }
    />
  );
};

const LiteralInput = ({
  id,
  item,
  handleChangeParam,
  updateVariableMemoryNodeRef,
}): React.ReactElement => (
  <FlowNodeInput
    nodeId={id}
    value={item?.schema?.value?.content}
    onChange={value =>
      handleChangeParam(
        item?.id,
        (data, value) => (data.schema.value.content = value),
        value
      )
    }
    onBlur={updateVariableMemoryNodeRef}
  />
);

const RefInput = ({
  id,
  item,
  references,
  handleChangeParam,
  updateVariableMemoryNodeRef,
}): React.ReactElement => {
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const checkNode = currentStore(state => state.checkNode);

  return (
    <FlowCascader
      value={
        item?.schema?.value?.content?.nodeId
          ? [
              item?.schema?.value?.content?.nodeId,
              item?.schema?.value?.content?.name,
            ]
          : []
      }
      options={references}
      handleTreeSelect={node =>
        handleChangeParam(
          item?.id,
          (data, value) => {
            data.schema.value.content = value.content;
            data.schema.type = value.type;
            data.fileType = value.fileType;
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
        )
      }
      onBlur={() => {
        updateVariableMemoryNodeRef();
        checkNode(id);
      }}
    />
  );
};

const ValueInput = ({
  id,
  item,
  references,
  handleChangeParam,
  updateVariableMemoryNodeRef,
}): React.ReactElement => {
  if (item?.schema?.value?.type === 'literal') {
    return (
      <LiteralInput
        id={id}
        item={item}
        handleChangeParam={handleChangeParam}
        updateVariableMemoryNodeRef={updateVariableMemoryNodeRef}
      />
    );
  }

  return (
    <RefInput
      id={id}
      item={item}
      references={references}
      handleChangeParam={handleChangeParam}
      updateVariableMemoryNodeRef={updateVariableMemoryNodeRef}
    />
  );
};

export const InputItem = ({
  item,
  currentNodes,
  id,
  data,
}): React.ReactElement => {
  const { references, inputs } = useNodeCommon({ id, data });
  const {
    handleChangeParam,
    updateVariableMemoryNodeRef,
    handleRemoveInputLine,
  } = useVariableMemoryHandlers({ id, currentNodes });

  return (
    <div key={item.id} className="flex flex-col gap-1">
      <div className="flex items-center gap-3 overflow-hidden">
        {/* 名称输入 */}
        <div className="flex flex-col w-1/4 flex-shrink-0">
          <NameInput
            id={id}
            item={item}
            handleChangeParam={handleChangeParam}
            updateVariableMemoryNodeRef={updateVariableMemoryNodeRef}
          />
        </div>

        {/* 类型选择 */}
        <div className="flex flex-col w-1/4 flex-shrink-0">
          <TypeSelect item={item} handleChangeParam={handleChangeParam} />
        </div>

        {/* 值输入 */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <ValueInput
            id={id}
            item={item}
            references={references}
            handleChangeParam={handleChangeParam}
            updateVariableMemoryNodeRef={updateVariableMemoryNodeRef}
          />
        </div>

        {/* 删除按钮 */}
        {inputs.length > 1 && (
          <img
            src={remove}
            className="w-[16px] h-[17px] cursor-pointer mt-1.5"
            onClick={() => handleRemoveInputLine(item.id)}
            alt=""
          />
        )}
      </div>

      {/* 错误信息 */}
      <div className="flex items-center gap-3 text-xs text-[#F74E43]">
        <div className="flex flex-col w-1/4">{item?.nameErrMsg}</div>
        <div className="flex flex-col w-1/4"></div>
        <div className="flex flex-col flex-1">
          {item?.schema?.value?.contentErrMsg}
        </div>
      </div>
    </div>
  );
};

function index({ id, data, currentNodes }): React.ReactElement {
  const { inputs, handleAddInputLine } = useNodeCommon({
    id,
    data,
  });
  const { t } = useTranslation();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);

  return (
    <div className="rounded-md px-[18px]">
      {/* <h4>输入</h4> */}
      <div className="flex items-center gap-3 text-desc">
        <h4 className="w-1/4">{t('workflow.nodes.common.parameterName')}</h4>
        <h4 className="w-1/4">{t('workflow.nodes.common.parameterValue')}</h4>
        <h4 className="flex-1"></h4>
        <span className="w-5 h-5"></span>
      </div>
      <div className="flex flex-col gap-3">
        {inputs.map(item => (
          <InputItem
            item={item}
            currentNodes={currentNodes}
            id={id}
            data={data}
          />
        ))}
      </div>
      {!canvasesDisabled && (
        <div
          className="text-[#6356EA] text-xs font-medium mt-1 inline-flex items-center cursor-pointer gap-1.5"
          onClick={() => handleAddInputLine()}
        >
          <img src={inputAddIcon} className="w-3 h-3" alt="" />
          <span>{t('workflow.nodes.variableMemoryNode.add')}</span>
        </div>
      )}
    </div>
  );
}

export default index;
