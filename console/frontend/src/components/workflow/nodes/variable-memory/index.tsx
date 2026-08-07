import React, { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cloneDeep } from 'lodash';
import { v4 as uuid } from 'uuid';
import Inputs from './components/inputs';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import useFlowStore from '@/components/workflow/store/use-flow-store';
import { FlowSelect, FLowCollapse } from '@/components/workflow/ui';
import {
  isRefKnowledgeBase,
  renderType,
} from '@/components/workflow/utils/reactflowUtils';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { useMemoizedFn } from 'ahooks';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';

function Outputs({
  id,
  outputs,
  currentNodes,
  handleChangeOutputParam,
  handleRemoveOutputLine,
}): React.ReactElement {
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const updateNodeRef = currentStore(state => state.updateNodeRef);
  const checkNode = currentStore(state => state.checkNode);

  const shouldAddParam = useMemoizedFn((input, paramsOptionsArr): boolean => {
    if (!input?.name) return false;

    const existSame = paramsOptionsArr?.some(
      option => option?.label === input?.name
    );
    if (existSame) return false;

    const schema = input?.schema?.value;
    if (!schema) return false;

    if (schema.type === 'literal' && schema.content) return true;
    if (schema.type === 'ref' && schema.content?.name) return true;

    return false;
  });

  const paramsOptions = useMemo(() => {
    const variableMemoryNode = currentNodes.filter(
      node =>
        node.nodeType === 'node-variable' &&
        node.data.nodeParam.method === 'set'
    );
    const paramsOptionsArr: Array<{
      id: string;
      label: string;
      value: string;
      type: string;
    }> = [];
    variableMemoryNode.forEach(item => {
      item?.data?.inputs?.forEach(input => {
        if (shouldAddParam(input, paramsOptionsArr)) {
          paramsOptionsArr.push({
            id: input.id,
            label: input.name,
            value: input.name,
            type: isRefKnowledgeBase(input)
              ? `array-${input?.schema?.type}`
              : input?.schema?.type,
          });
        }
      });
    });
    return paramsOptionsArr;
  }, [currentNodes]);

  const optionRender = useMemoizedFn(nodeData => {
    let type = nodeData?.data?.type;
    if (type?.includes('array')) {
      const arr = nodeData?.data?.type?.split('-');
      type = `Array<${arr[1]}>`;
    }
    return (
      <div className="flex items-center gap-2">
        <span>{nodeData.label}</span>
        <div className="bg-[#F0F0F0] px-2.5 rounded text-xs">{type}</div>
      </div>
    );
  });

  return (
    <>
      {outputs?.map(output => (
        <div className="px-[18px]" key={output.id}>
          <div className="flex items-center gap-3 text-desc">
            <div className="flex-1">
              <FlowSelect
                optionRender={optionRender}
                options={paramsOptions}
                value={output?.name}
                onChange={(value, currentOption) => {
                  handleChangeOutputParam(
                    output.id,
                    (data, value) => {
                      data.refId = currentOption?.id;
                      data.name = value;
                      data.schema.type = currentOption?.type;
                    },
                    value
                  );
                }}
                onBlur={() => {
                  updateNodeRef(id);
                  checkNode(id);
                }}
              />
            </div>
            <div className="w-1/3">{renderType(output.schema.type)}</div>
            {outputs.length > 1 && (
              <img
                src={remove}
                className="w-[16px] h-[17px] cursor-pointer mt-1.5"
                onClick={() => handleRemoveOutputLine(output.id)}
                alt=""
              />
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-[#F74E43]">
            <div className="flex-1">{output?.nameErrMsg}</div>
            <div className="w-1/3"></div>
          </div>
        </div>
      ))}
    </>
  );
}

export const VariableMemoryDetail = memo(props => {
  const { id, data } = props;
  const {
    handleChangeNodeParam,
    handleAddOutputLine,
    handleRemoveOutputLine,
    handleChangeOutputParam,
    nodeParam,
    outputs,
  } = useNodeCommon({ id, data });
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const iteratorId = useFlowsManager(state => state.iteratorId);
  const showIterativeModal = useFlowsManager(state => state.showIterativeModal);
  const updateNodeRef = currentStore(state => state.updateNodeRef);
  const nodes = currentStore(state => state.nodes);
  const flowNodes = useFlowStore(state => state.nodes);
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);

  const currentNodes = useMemo(() => {
    if (showIterativeModal) {
      const nodeIds = nodes?.map(node => node?.id);
      return cloneDeep([
        ...flowNodes.filter(node => !nodeIds?.includes(node?.id)),
        ...nodes,
      ]);
    } else {
      return cloneDeep(flowNodes);
    }
  }, [flowNodes, nodes, showIterativeModal, iteratorId]);

  return (
    <div id={id}>
      <div className="p-[14px] pb-[6px]">
        <div className="bg-[#fff] rounded-lg flex flex-col gap-2.5">
          <FLowCollapse
            label={<div className="text-base font-medium">存储方式</div>}
            content={
              <div className="px-[18px]">
                <div className="flex items-center gap-2 bg-[#E7EAF3] p-1 rounded-md">
                  <div
                    className="flex-1 rounded-md  hover:bg-[#fff] text-center p-1"
                    style={{
                      background: nodeParam?.method === 'set' ? '#fff' : '',
                    }}
                    onClick={() =>
                      handleChangeNodeParam((data, value) => {
                        data.inputs = [
                          {
                            id: uuid(),
                            name: 'input',
                            schema: {
                              type: 'string',
                              value: {
                                type: 'ref',
                                content: {},
                              },
                            },
                          },
                        ];
                        data.outputs = [];
                        data.nodeParam.method = value;
                        updateNodeRef(id);
                      }, 'set')
                    }
                  >
                    {t('workflow.nodes.variableMemoryNode.setVariableValue')}
                  </div>
                  <div
                    className="flex-1 rounded-md hover:bg-[#fff] text-center p-1"
                    style={{
                      background: nodeParam?.method === 'get' ? '#fff' : '',
                    }}
                    onClick={() =>
                      handleChangeNodeParam((data, value) => {
                        data.inputs = [];
                        data.outputs = [
                          {
                            id: uuid(),
                            name: '',
                            schema: {
                              type: '',
                              description: '',
                            },
                            required: true,
                          },
                        ];
                        data.nodeParam.method = value;
                      }, 'get')
                    }
                  >
                    {t('workflow.nodes.variableMemoryNode.getVariableValue')}
                  </div>
                </div>
              </div>
            }
          />
          {nodeParam?.method === 'set' && (
            <FLowCollapse
              label={
                <div className="text-base font-medium">
                  {t('workflow.nodes.variableMemoryNode.input')}
                </div>
              }
              content={
                <Inputs currentNodes={currentNodes} id={id} data={data} />
              }
            />
          )}
          {nodeParam?.method === 'get' && (
            <FLowCollapse
              label={
                <div className="text-base font-medium">
                  {t('workflow.nodes.variableMemoryNode.output')}
                </div>
              }
              content={
                <div>
                  <div className="flex items-center gap-3 text-desc px-[18px]">
                    <h4 className="flex-1">
                      {t('workflow.nodes.variableMemoryNode.parameterName')}
                    </h4>
                    <h4 className="w-1/3">
                      {t('workflow.nodes.variableMemoryNode.variableType')}
                    </h4>
                    {outputs?.length > 1 && <span className="w-5 h-5"></span>}
                  </div>
                  <div className="flex flex-col gap-3">
                    <Outputs
                      id={id}
                      outputs={outputs}
                      currentNodes={currentNodes}
                      handleChangeOutputParam={handleChangeOutputParam}
                      handleRemoveOutputLine={handleRemoveOutputLine}
                    />
                  </div>
                  {!canvasesDisabled && (
                    <div
                      className="text-[#6356EA] text-xs font-medium mt-1 inline-flex items-center cursor-pointer gap-1.5 pl-6"
                      onClick={() => handleAddOutputLine()}
                    >
                      <img src={inputAddIcon} className="w-3 h-3" alt="" />
                      <span>{t('workflow.nodes.variableMemoryNode.add')}</span>
                    </div>
                  )}
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
});
