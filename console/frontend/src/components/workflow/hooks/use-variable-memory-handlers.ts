import { useCallback } from 'react';
import { cloneDeep } from 'lodash';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { isRefKnowledgeBase } from '@/components/workflow/utils/reactflowUtils';
import { UseVariableMemoryHandlersReturn } from '../types/hooks';

export function useVariableMemoryHandlers({
  id,
  currentNodes,
}): UseVariableMemoryHandlersReturn {
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();

  const setNode = currentStore(state => state.setNode);
  const setNodes = currentStore(state => state.setNodes);
  const takeSnapshot = currentStore(state => state.takeSnapshot);
  const updateNodeRef = currentStore(state => state.updateNodeRef);
  const deleteNodeRef = currentStore(state => state.deleteNodeRef);

  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );

  /** 更新 variable-memory 节点的 ref */
  const updateVariableMemoryNodeRef = useCallback(() => {
    const variableMemoryNode = currentNodes.filter(
      node =>
        node.nodeType === 'node-variable' &&
        node.data.nodeParam.method === 'get'
    );
    variableMemoryNode.forEach(node => updateNodeRef(node?.id));
  }, [currentNodes, updateNodeRef]);

  /** 移除 variable-memory 节点的 ref */
  const removeVariableMemoryNodeRef = useCallback(
    outputId => {
      const variableMemoryNodeIds = currentNodes
        ?.filter(
          node =>
            node.nodeType === 'node-variable' &&
            node.data.nodeParam.method === 'get'
        )
        ?.map(node => node?.id);

      setNodes(old => {
        old.forEach(node => {
          if (variableMemoryNodeIds?.includes(node?.id)) {
            node?.data?.outputs?.forEach(output => {
              if (output?.refId === outputId) {
                output.refId = '';
                output.name = '';
                output.schema.type = '';
                setTimeout(() => {
                  deleteNodeRef(node?.id, output?.id);
                }, 0);
              }
            });
          }
        });
        return cloneDeep(old);
      });
    },
    [currentNodes, setNodes, deleteNodeRef]
  );

  // 判断 currentInput 是否有效
  const isValidInput = (input): boolean | string | {} => {
    if (!input?.name) return false;
    const { type, content } = input?.schema?.value || {};
    if (type === 'literal') return !!content;
    if (type === 'ref') return !!content?.name;
    return false;
  };

  // 更新 output
  const updateOutputFromInput = (output, currentInput): void => {
    if (!isValidInput(currentInput)) {
      output.name = '';
      output.schema.type = '';
      return;
    }

    output.name = currentInput.name;
    output.schema.type = isRefKnowledgeBase(currentInput)
      ? `array-${currentInput?.schema?.type}`
      : currentInput?.schema?.type;
    output.refId = currentInput?.id || '';
  };

  const findCurrentInput = (nodes, output) => {
    const setterInputs =
      nodes
        ?.filter(
          node =>
            node.nodeType === 'node-variable' &&
            node.data.nodeParam.method === 'set'
        )
        ?.flatMap(node => node?.data?.inputs || []) || [];

    return (
      setterInputs.find(item => item?.id === output?.refId) ||
      setterInputs.find(item => item?.name && item?.name === output?.name)
    );
  };

  /** 修改输入参数（支持 name / type / value / ref） */
  const handleChangeParam = useCallback(
    (outputId, fn, value) => {
      // 更新当前节点输入
      setNode(id, old => {
        const currentInput = old.data?.inputs.find(
          item => item?.id === outputId
        );
        fn(currentInput, value);
        return { ...cloneDeep(old) };
      });

      canPublishSetNot();
      autoSaveCurrentFlow();

      // 延迟更新 variable-memory 节点
      setTimeout(() => {
        setNodes(nodes => {
          nodes.forEach(node => {
            if (
              node.nodeType === 'node-variable' &&
              node.data.nodeParam.method === 'get'
            ) {
              node?.data?.outputs?.forEach(output => {
                const currentInput = findCurrentInput(nodes, output);
                if (currentInput) {
                  updateOutputFromInput(output, currentInput);
                }
              });
            }
          });
          return cloneDeep(nodes);
        });
      }, 0);
    },
    [id, setNode, setNodes, canPublishSetNot, autoSaveCurrentFlow]
  );

  /** 删除输入行 */
  const handleRemoveInputLine = useCallback(
    inputId => {
      takeSnapshot();
      setNode(id, old => {
        const index = old.data.inputs?.findIndex(item => item.id === inputId);
        old.data.inputs.splice(index, 1);
        return { ...cloneDeep(old) };
      });
      canPublishSetNot();
      removeVariableMemoryNodeRef(inputId);
    },
    [id, takeSnapshot, setNode, canPublishSetNot, removeVariableMemoryNodeRef]
  );

  return {
    handleChangeParam,
    handleRemoveInputLine,
    updateVariableMemoryNodeRef,
  };
}
