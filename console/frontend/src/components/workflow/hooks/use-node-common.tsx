import { syncIteratorEndInputs } from '../utils/iterator-outputs';
import type { CheckboxProps } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import type { WorkflowNode, WorkflowNodeData } from '../types/domain';
import { cloneDeep } from 'lodash';
import { useMemoizedFn } from 'ahooks';
import { Tooltip, Checkbox } from 'antd';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import useFlowStore from '@/components/workflow/store/use-flow-store';
import {
  renderType,
  findPathById,
  deleteFieldByPath,
  checkedNodeOutputData,
  generateOrUpdateObject,
  removeItemById,
  findItemById,
  isBaseType,
  generateReferences,
} from '@/components/workflow/utils/reactflowUtils';
import {
  FlowNodeInput,
  FlowTypeCascader,
  FlowNodeTextArea,
} from '@/components/workflow/ui';
import { v4 as uuid } from 'uuid';
import { isJSON } from '@/utils';
import { originOutputTypeList } from '@/components/workflow/constant';
import { useTranslation } from 'react-i18next';
import {
  ToolNodeOneClickUpdate,
  FlowNodeOneClickUpdate,
  RpaNodeOneClickUpdate,
} from '@/components/workflow/hooks/use-one-click-update';
import {
  NodeCommonProps,
  NodeDataType,
  InputItem,
  OutputItem,
  PropertyItem,
  UseNodeCommonReturn,
  UseNodeInfoReturn,
  UseNodeFuncReturn,
  UseNodeOutputRenderReturn,
  UseNodeModelsReturn,
  UseNodeHandleReturn,
  UseNodeInputRenderReturn,
} from '@/components/workflow/types/hooks';

import addItemIcon from '@/assets/imgs/workflow/add-item-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';

type OutputEditorProps = Required<NodeCommonProps> & { output: PropertyItem };

function formatParameterDefault(value: unknown): string {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' ? value : (JSON.stringify(value) ?? '');
}

const useNodeInfo = ({
  id,
  data,
}: Required<NodeCommonProps>): UseNodeInfoReturn => {
  const { t } = useTranslation();
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const showIterativeModal = useFlowsManager(state => state.showIterativeModal);
  const iteratorId = useFlowsManager(state => state.iteratorId);
  const nodeList = useFlowsManager(state => state.nodeList);
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const nodes = currentStore(state => state.nodes);
  const edges = currentStore(state => state.edges);
  const flowNodes = useFlowStore(state => state.nodes);
  const flowEdges = useFlowStore(state => state.edges);

  const nodeType = useMemo(() => {
    return id?.split('::')[0] || '';
  }, [id]);
  // 判断是否为开始节点
  const isStartNode = useMemo(() => {
    return nodeType === 'node-start';
  }, [nodeType]);

  const isIteratorStart = useMemo(() => {
    return ['iteration-node-start', 'loop-node-start'].includes(nodeType);
  }, [nodeType]);

  const isEndNode = useMemo(() => {
    return nodeType === 'node-end';
  }, [nodeType]);

  const isIteratorEnd = useMemo(() => {
    return ['iteration-node-end', 'loop-node-end', 'loop-exit'].includes(
      nodeType
    );
  }, [nodeType]);

  const isKnowledgeNode = useMemo(() => {
    return nodeType === 'knowledge-base';
  }, [nodeType]);

  const isQuestionAnswerNode = useMemo(() => {
    return nodeType === 'question-answer';
  }, [nodeType]);

  const isDecisionMakingNode = useMemo(() => {
    return nodeType === 'decision-making';
  }, [nodeType]);

  const isIfElseNode = useMemo(() => {
    return nodeType === 'if-else';
  }, [nodeType]);

  const isIteratorNode = useMemo(() => {
    return nodeType === 'iteration';
  }, [nodeType]);

  const isLoopNode = useMemo(() => {
    return nodeType === 'loop';
  }, [nodeType]);

  const isIteratorChildNode = useMemo(() => {
    return Boolean(!showIterativeModal && data.parentId);
  }, [showIterativeModal, data?.parentId]);

  const isAgentNode = useMemo(() => {
    return nodeType === 'agent';
  }, [nodeType]);

  const isStartOrEndNode = useMemo(() => {
    return (
      nodeType === 'node-start' ||
      nodeType === 'node-end' ||
      isIteratorStart ||
      isIteratorEnd
    );
  }, [nodeType, isIteratorStart, isIteratorEnd]);

  const isCodeNode = useMemo(() => {
    return nodeType === 'ifly-code';
  }, [nodeType]);

  const isDataBaseNode = useMemo(() => {
    return nodeType === 'database';
  }, [nodeType]);

  const isLLMNode = useMemo(() => {
    return nodeType === 'spark-llm';
  }, [nodeType]);

  const showInputs = useMemo(() => {
    const isDatabaseNodeFormMode =
      isDataBaseNode && data?.nodeParam?.mode === 1;
    return data?.inputs?.length > 0 && !isIfElseNode && !isDatabaseNodeFormMode;
  }, [data, isIfElseNode, isDataBaseNode]);

  const showOutputs = useMemo(() => {
    return data?.outputs?.length > 0;
  }, [data?.outputs, id]);

  const showExceptionFlow = useMemo(() => {
    return Boolean(
      data?.retryConfig?.shouldRetry && data?.retryConfig?.errorStrategy === 2
    );
  }, [data?.retryConfig?.shouldRetry, data?.retryConfig?.errorStrategy]);

  const references = useMemo(() => {
    const currentReferences = generateReferences(nodes, edges, id);
    const parentId = data?.parentId || (showIterativeModal ? iteratorId : '');
    if (!parentId) return currentReferences;

    const outerReferences = generateReferences(
      showIterativeModal ? flowNodes : nodes,
      showIterativeModal ? flowEdges : edges,
      parentId
    );
    const existingIds = new Set(currentReferences.map(item => item?.value));
    return [
      ...outerReferences.filter(item => !existingIds.has(item?.value)),
      ...currentReferences,
    ];
  }, [
    id,
    data?.parentId,
    showIterativeModal,
    iteratorId,
    nodes,
    edges,
    flowNodes,
    flowEdges,
  ]);
  const isFixedInputsNode = useMemo(() => {
    return ['plugin', 'flow', 'rpa'].includes(nodeType);
  }, [nodeType]);
  const inputs = useMemo(() => {
    return data?.inputs || [];
  }, [data?.inputs]);

  const outputs = useMemo(() => {
    return data?.outputs || [];
  }, [data?.outputs]);

  const showNodeOperation = useMemo(() => {
    return !isStartNode && !isEndNode;
  }, [isStartNode, isEndNode]);

  const currentNode = useMemo(() => {
    return nodes?.find(item => item?.id === id);
  }, [nodes, id]);

  // 节点参数
  const nodeParam = useMemo(() => {
    return data?.nodeParam || {};
  }, [data?.nodeParam]);

  const nodeIcon = useMemo(() => {
    let nodeFinallyType = '';
    if (['iteration-node-start', 'loop-node-start'].includes(nodeType)) {
      nodeFinallyType = 'node-start';
    } else if (
      ['iteration-node-end', 'loop-node-end', 'loop-exit'].includes(nodeType)
    ) {
      nodeFinallyType = 'node-end';
    } else {
      nodeFinallyType = nodeType;
    }
    const currentNode = nodeList
      ?.flatMap(item => item?.nodes)
      ?.find(item => item?.idType === nodeFinallyType);
    return currentNode?.data?.icon;
  }, [nodeList, nodeType]);

  const nodeDesciption = useMemo(() => {
    //工具节点需要特判一下，使用工具本身的描述
    if (nodeType === 'plugin' || nodeType === 'mcp') {
      return data?.nodeParam?.toolDescription;
    }
    if (nodeType === 'rpa') {
      return data?.nodeParam?.rpaDescription;
    }
    const currentNode = nodeList
      ?.flatMap(item => item?.nodes)
      ?.find(item => item?.idType === nodeType);
    return currentNode?.description || currentNode?.data?.description;
  }, [nodeList, data, nodeType]);
  const isRpaNode = useMemo(() => {
    return nodeType === 'rpa' || nodeType === 'rpa';
  }, [nodeType]);
  const inputLabel = useMemo(() => {
    if (isEndNode || isIteratorEnd) {
      return t('workflow.nodes.common.output');
    }
    return t('workflow.nodes.common.input');
  }, [isEndNode, isIteratorEnd]);
  const outputLabel = useMemo(() => {
    if (isStartNode || isIteratorStart) {
      return t('workflow.nodes.common.input');
    }
    return t('workflow.nodes.common.output');
  }, [isStartNode, isIteratorStart]);
  const stringSplitMode = useMemo(() => {
    return data?.nodeParam?.mode === 1;
  }, [data?.nodeParam?.mode]);
  const allowAddInput = useMemo(() => {
    if (canvasesDisabled || stringSplitMode || isIteratorNode || isLoopNode) {
      return false;
    }
    return true;
  }, [canvasesDisabled, stringSplitMode, isIteratorNode, isLoopNode]);
  const allowAddOutput = useMemo(() => {
    if (canvasesDisabled) {
      return false;
    }
    if (isLLMNode && data?.nodeParam?.respFormat === 0) {
      return false;
    }
    return true;
  }, [canvasesDisabled, isLLMNode, data?.nodeParam?.respFormat]);

  return {
    nodeType,
    isStartNode,
    isIteratorStart,
    isEndNode,
    isIteratorEnd,
    isKnowledgeNode,
    isQuestionAnswerNode,
    isDecisionMakingNode,
    isIfElseNode,
    isIteratorNode,
    isLoopNode,
    isIteratorChildNode,
    isAgentNode,
    isStartOrEndNode,
    isCodeNode,
    isDataBaseNode,
    showInputs,
    showOutputs,
    showExceptionFlow,
    references,
    isFixedInputsNode,
    inputs,
    outputs,
    showNodeOperation,
    currentNode,
    nodeParam,
    nodeIcon,
    nodeDesciption,
    isRpaNode,
    inputLabel,
    outputLabel,
    allowAddInput,
    allowAddOutput,
  };
};

const useNodeFunc = ({
  id,
  data,
}: Required<NodeCommonProps>): UseNodeFuncReturn => {
  const { isIteratorNode, nodeType } = useNodeInfo({ id, data });
  const setNodeInfoEditDrawerlInfo = useFlowsManager(
    state => state.setNodeInfoEditDrawerlInfo
  );
  const setVersionManagement = useFlowsManager(
    state => state.setVersionManagement
  );
  const setAdvancedConfiguration = useFlowsManager(
    state => state.setAdvancedConfiguration
  );
  const setOpenOperationResult = useFlowsManager(
    state => state.setOpenOperationResult
  );
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const checkNode = currentStore(state => state.checkNode);
  const setNode = currentStore(state => state.setNode);
  const updateNodeRef = currentStore(state => state.updateNodeRef);
  const takeSnapshot = currentStore(state => state.takeSnapshot);
  const deleteNodeRef = currentStore(state => state.deleteNodeRef);
  const nodes = currentStore(state => state.nodes);
  const handleNodeClick = useMemoizedFn(() => {
    setNodeInfoEditDrawerlInfo({
      open: true,
      nodeId: id,
    });
    setVersionManagement(false);
    setAdvancedConfiguration(false);
    setOpenOperationResult(false);
  });
  // 通用的节点参数变更处理函数
  const handleChangeNodeParam = useCallback(
    <Value,>(fn: (data: NodeDataType, value: Value) => void, value: Value) => {
      setNode(id, old => {
        fn(old.data, value);
        return {
          ...cloneDeep(old),
        };
      });
      autoSaveCurrentFlow();
      canPublishSetNot();
      checkNode(id);
    },
    [id, setNode, autoSaveCurrentFlow, canPublishSetNot, checkNode]
  );
  const handleIteratorEndChange = useMemoizedFn(
    (
      type: 'add' | 'remove' | 'replace',
      outputId: string,
      value?: unknown,
      currentNode?: WorkflowNode
    ) => {
      if (isIteratorNode) {
        const outputIndex = currentNode?.data?.outputs?.findIndex(
          output => output?.id === outputId
        );
        const iteratorStartEnd = nodes?.find(
          node =>
            node.data.parentId === id &&
            ['iteration-node-end', 'node-end'].includes(node.nodeType)
        );
        if (!iteratorStartEnd) return;
        setNode(iteratorStartEnd.id, old => {
          old.data.inputs = syncIteratorEndInputs(
            old.data.inputs,
            type,
            outputIndex ?? -1,
            typeof value === 'string' ? value : undefined
          );
          return cloneDeep(old);
        });
      }
    }
  );
  const handleChangeOutputParam = useCallback(
    <Value,>(
      outputId: string,
      fn: (
        data: PropertyItem,
        value: Value,
        nodeData: WorkflowNodeData
      ) => void,
      value: Value
    ): void => {
      setNode(id, old => {
        const currentOutput = findItemById(old.data.outputs, outputId);
        if (currentOutput) {
          fn(currentOutput, value, old?.data);
        }
        handleIteratorEndChange('replace', outputId, currentOutput?.name, old);
        return {
          ...cloneDeep(old),
        };
      });
      updateNodeRef(id);
      canPublishSetNot();
    },
    [id, setNode, handleIteratorEndChange, updateNodeRef, canPublishSetNot]
  );

  const handleAddOutputLine = useMemoizedFn(() => {
    takeSnapshot();
    setNode(id, old => {
      old.data.outputs.push({
        id: uuid(),
        name: '',
        schema: {
          type: isIteratorNode ? 'array-string' : 'string',
          default: '',
        },
        required: false,
      });
      return {
        ...cloneDeep(old),
      };
    });
    canPublishSetNot();
  });
  const handleRemoveOutputLine = useMemoizedFn((outputId: string) => {
    const previousNode = cloneDeep(nodes.find(node => node.id === id));
    takeSnapshot();
    setNode(id, old => {
      const path = findPathById(old.data.outputs, outputId);
      if (
        path &&
        old.data.retryConfig?.customOutput &&
        isJSON(old.data.retryConfig.customOutput)
      ) {
        const updatedObj = deleteFieldByPath(
          cloneDeep(JSON.parse(old?.data?.retryConfig?.customOutput ?? '')),
          path
        );
        old.data.retryConfig.customOutput = JSON.stringify(updatedObj, null, 2);
      }
      old.data.outputs = removeItemById(old.data.outputs, outputId);
      return {
        ...cloneDeep(old),
      };
    });
    deleteNodeRef(id, outputId);
    canPublishSetNot();
    handleIteratorEndChange('remove', outputId, undefined, previousNode);
  });
  const isFixedOutputComponentFunc = useMemoizedFn((output: PropertyItem) => {
    return nodeType === 'database' && !output.isChild;
  });
  return {
    handleNodeClick,
    handleChangeNodeParam,
    handleChangeOutputParam,
    handleIteratorEndChange,
    handleAddOutputLine,
    handleRemoveOutputLine,
    isFixedOutputComponentFunc,
  };
};

const OutputNameInput = ({
  id,
  data,
  output,
}: OutputEditorProps): React.ReactElement => {
  const { handleChangeOutputParam } = useNodeFunc({ id, data });
  const { handleCustomOutputGenerate } = useNodeOutputRender({ id, data });
  const { isFixedOutputComponentFunc } = useNodeFunc({ id, data });
  const isFixedOutputComponent = isFixedOutputComponentFunc(output);
  if (isFixedOutputComponent) {
    return <div>{output.name}</div>;
  }
  const handleChange = useMemoizedFn((value: string) => {
    handleChangeOutputParam(
      output.id,
      (data, value) => (data.name = value),
      value
    );
  });

  const handleBlur = useMemoizedFn(() => {
    handleCustomOutputGenerate();
  });

  return (
    <FlowNodeInput
      nodeId={id}
      disabled={
        output?.deleteDisabled || output?.customParameterType === 'deepseekr1'
      }
      maxLength={30}
      className="w-full"
      value={output.name}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

// 类型选择器
const OutputTypeSelector = ({
  id,
  data,
  output,
}: OutputEditorProps): React.ReactElement => {
  const { handleChangeOutputParam } = useNodeFunc({ id, data });
  const { outputTypeList } = useNodeOutputRender({ id, data });
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const delayUpdateNodeRef = currentStore(state => state.delayUpdateNodeRef);
  const { isFixedOutputComponentFunc } = useNodeFunc({ id, data });
  const isFixedOutputComponent = isFixedOutputComponentFunc(output);
  if (isFixedOutputComponent) {
    return <div>{renderType(output)}</div>;
  }
  const handleTypeChange = useMemoizedFn((selected: unknown) => {
    if (
      !Array.isArray(selected) ||
      !selected.every(
        (item: unknown): item is string => typeof item === 'string'
      )
    )
      return;
    const [kind, fileType] = selected;
    if (!kind) return;
    const type = ['file', 'fileList'].includes(kind) ? fileType : kind;
    if (!type) return;
    handleChangeOutputParam(
      output.id,
      (data, value) => {
        const { kind, type } = value;

        if (kind === 'file') {
          data.fileType = 'file';
          data.schema = { type: 'string' };
          data.allowedFileType = [type];
        } else if (kind === 'fileList') {
          data.fileType = 'file';
          data.schema = { type: 'array-string' };
          data.allowedFileType = [type.replace(/.*<(.+?)>.*/, '$1')];
        } else if (data?.schema?.type) {
          data.schema.type = type;
          delete data.fileType;
          delete data.allowedFileType;
        } else {
          data.type = type;
          delete data.fileType;
          delete data.allowedFileType;
        }

        if (isBaseType(type)) {
          if (data?.schema?.type) {
            data.schema.properties = [];
          } else {
            data.properties = [];
          }
        }
      },
      { kind, type }
    );

    delayUpdateNodeRef(id);
  });

  return (
    <FlowTypeCascader
      value={
        output.fileType === 'file'
          ? output?.schema?.type === 'string'
            ? ['file', ...(output.allowedFileType?.slice(0, 1) ?? [])]
            : [
                'fileList',
                ...(output.allowedFileType
                  ?.slice(0, 1)
                  .map(type => `Array<${type}>`) ?? []),
              ]
          : [output.schema?.type || output.type || 'string']
      }
      disabled={
        output?.deleteDisabled || output?.customParameterType === 'deepseekr1'
      }
      options={outputTypeList}
      onChange={handleTypeChange}
    />
  );
};

// 描述/类型输入
const OutputDescription = ({
  id,
  data,
  output,
}: OutputEditorProps): React.ReactElement => {
  const { renderTypeInput } = useNodeInputRender({ id, data });
  const { isFixedOutputComponentFunc } = useNodeFunc({ id, data });
  const isFixedOutputComponent = isFixedOutputComponentFunc(output);
  if (isFixedOutputComponent) {
    return (
      <div>
        {formatParameterDefault(output.schema?.default ?? output.default)}
      </div>
    );
  }
  return (
    <div
      className={`flex flex-col flex-1 h-full ${
        output?.deleteDisabled || output?.customParameterType === 'deepseekr1'
          ? 'disabled-flow-textarea'
          : ''
      }`}
    >
      {renderTypeInput(output)}
    </div>
  );
};

// 错误提示
const OutputErrors = ({
  output,
}: {
  output: PropertyItem;
}): React.ReactElement => (
  <div className="flex items-center gap-3 text-xs text-[#F74E43]">
    <div className="flex flex-col w-1/4">{output?.nameErrMsg}</div>
    <div className="flex flex-col w-1/4"></div>
    <div className="flex flex-col flex-1">
      {output?.schema?.value?.contentErrMsg}
    </div>
  </div>
);

const useNodeOutputRender = ({
  id,
  data,
}: Required<NodeCommonProps>): UseNodeOutputRenderReturn => {
  const { outputs, currentNode, isStartNode, isIteratorNode } = useNodeInfo({
    id,
    data,
  });
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const delayUpdateNodeRef = currentStore(state => state.delayUpdateNodeRef);
  const setNode = currentStore(state => state.setNode);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);

  const handleCustomOutputGenerate = useMemoizedFn(() => {
    delayUpdateNodeRef(id);
    setTimeout(() => {
      if (!currentNode || !checkedNodeOutputData(outputs, currentNode)) {
        setNode(id, old => {
          old.data.nodeParam.setAnswerContentErrMsg =
            '输出中变量名校验不通过,自动生成JSON失败';
          return {
            ...cloneDeep(old),
          };
        });
        return;
      }
      setNode(id, old => {
        old.data.nodeParam.setAnswerContentErrMsg = '';
        if (old?.data?.retryConfig) {
          const newSetAnswerContent = JSON.stringify(
            generateOrUpdateObject(
              old?.data.outputs,
              isJSON(old?.data?.retryConfig?.customOutput ?? '')
                ? JSON.parse(old?.data?.retryConfig?.customOutput ?? '')
                : null
            ),
            null,
            2
          );
          old.data.retryConfig.customOutput = newSetAnswerContent;
        }
        return {
          ...cloneDeep(old),
        };
      });
      autoSaveCurrentFlow();
      canPublishSetNot();
    }, 500);
  });

  const renderOutputComponent = useMemoizedFn(
    (output: PropertyItem): React.ReactElement => {
      const type = output?.schema?.type || output?.type;
      return (
        <div className="w-full flex flex-col gap-1">
          <div className="flex items-start gap-3">
            <div className="flex flex-col w-1/4 flex-shrink-0">
              <OutputNameInput
                {...{
                  id,
                  data,
                  output,
                }}
              />
            </div>

            <div className="flex flex-col w-1/4">
              <OutputTypeSelector
                {...{
                  id,
                  data,
                  output,
                }}
              />
            </div>

            <div className="flex flex-col flex-1">
              <OutputDescription {...{ id, data, output }} />
            </div>

            <OutputActions
              {...{
                id,
                data,
                output,
                type,
              }}
            />
          </div>

          <OutputErrors output={output} />
        </div>
      );
    }
  );

  const outputTypeList = useMemo(() => {
    if (isStartNode) return originOutputTypeList;
    if (isIteratorNode)
      return [
        ...originOutputTypeList.slice(5),
        {
          label: 'Array<Array>',
          value: 'array-array',
        },
      ];
    return originOutputTypeList.filter(
      item => item?.value !== 'file' && item?.value !== 'fileList'
    );
  }, [originOutputTypeList, isStartNode, isIteratorNode]);

  return {
    handleCustomOutputGenerate,
    renderOutputComponent,
    outputTypeList,
  };
};

const useNodeModels = ({
  id,
  data,
}: Required<NodeCommonProps>): UseNodeModelsReturn => {
  const sparkLlmModels = useFlowsManager(state => state.sparkLlmModels);
  const questionAnswerModels = useFlowsManager(
    state => state.questionAnswerModels
  );
  const decisionMakingModels = useFlowsManager(
    state => state.decisionMakingModels
  );
  const extractorParameterModels = useFlowsManager(
    state => state.extractorParameterModels
  );
  const models = useMemo(() => {

    if (id?.startsWith('spark-llm')) {
      return sparkLlmModels;
    }
    if (id?.startsWith('question-answer')) {
      return questionAnswerModels;
    }
    if (id?.startsWith('decision-making')) {
      return decisionMakingModels;
    }
    if (id?.startsWith('extractor-parameter')) {
      return extractorParameterModels;
    }
    return [];
  }, [id, sparkLlmModels, questionAnswerModels]);
  const model = useMemo(() => {
    return models?.find(item => item?.llmId === data?.nodeParam?.llmId);
  }, [data?.nodeParam?.llmId, models]);
  const isThinkModel = useMemo(() => {
    return model?.isThink === true || data?.nodeParam?.isThink === true;
  }, [model?.isThink, data?.nodeParam?.isThink]);
  return {
    models,
    model,
    isThinkModel,
  };
};

// 新增按钮
const AddButton = ({
  type,
  handleAdd,
}: {
  type?: string;
  handleAdd: () => void;
}): React.ReactElement | null => {
  const { t } = useTranslation();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  if (canvasesDisabled || (type !== 'object' && type !== 'array-object'))
    return null;

  return (
    <Tooltip
      title={t('workflow.nodes.common.addSubItem')}
      overlayClassName="black-tooltip config-secret"
    >
      <img
        src={addItemIcon}
        className="w-4 h-4 mt-1.5 cursor-pointer"
        onClick={handleAdd}
      />
    </Tooltip>
  );
};

// 必填勾选框
const RequiredCheckbox = ({
  isStartNode,
  output,
  handleRequiredChange,
}: {
  isStartNode: boolean;
  output: PropertyItem;
  handleRequiredChange: NonNullable<CheckboxProps['onChange']>;
}): React.ReactElement | null => {
  if (!isStartNode) return null;

  return (
    <div className="w-[50px] flex justify-center items-center mt-1.5">
      <Checkbox
        disabled={output?.deleteDisabled}
        checked={output.required}
        style={{ width: '16px', height: '16px', background: '#F9FAFB' }}
        onChange={handleRequiredChange}
      />
    </div>
  );
};

// 删除按钮
const RemoveButton = ({
  id,
  data,
  output,
  handleRemove,
}: OutputEditorProps & {
  handleRemove: () => void;
}): React.ReactElement | null => {
  const { outputs, isDataBaseNode } = useNodeInfo({ id, data });
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);

  if (canvasesDisabled) return null;

  if (isDataBaseNode && !output?.isChild) return null;

  if (outputs?.length <= 1) return null;

  const disabled =
    output?.deleteDisabled || output?.customParameterType === 'deepseekr1';

  return (
    <img
      src={remove}
      className="w-[16px] h-[17px] mt-1.5"
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      onClick={handleRemove}
      alt=""
    />
  );
};

// 主操作区组件
export const OutputActions = ({
  id,
  data,
  output,
  type,
}: OutputEditorProps & { type?: string }): React.ReactElement => {
  const { isStartNode } = useNodeInfo({ id, data });
  const { handleChangeOutputParam, handleRemoveOutputLine } = useNodeFunc({
    id,
    data,
  });
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const takeSnapshot = currentStore(state => state.takeSnapshot);
  const setNode = currentStore(state => state.setNode);
  const checkNode = currentStore(state => state.checkNode);

  const handleAddItem = useMemoizedFn((output: PropertyItem) => {
    takeSnapshot();
    setNode(id, old => {
      const currentOutput = findItemById(old.data.outputs, output?.id);
      const propertyItem = {
        id: uuid(),
        name: '',
        type: 'string',
        default: '',
        required: false,
      };
      if (currentOutput?.schema) {
        if (currentOutput?.schema?.properties) {
          currentOutput.schema.properties.push(propertyItem);
        } else {
          currentOutput.schema.properties = [propertyItem];
        }
      } else if (currentOutput) {
        if (currentOutput.properties) {
          currentOutput.properties.push(propertyItem);
        } else {
          currentOutput.properties = [propertyItem];
        }
      }
      return {
        ...cloneDeep(old),
      };
    });
    canPublishSetNot();
  });

  const handleAdd = useMemoizedFn(() => handleAddItem(output));

  const handleRequiredChange = useMemoizedFn(
    (e: Parameters<NonNullable<CheckboxProps['onChange']>>[0]) => {
      handleChangeOutputParam(
        output.id,
        (data, value) => (data.required = value),
        e.target.checked
      );
    }
  );

  const handleRemove = useMemoizedFn(() => {
    if (
      !output?.deleteDisabled &&
      output?.customParameterType !== 'deepseekr1'
    ) {
      handleRemoveOutputLine(output.id);
      checkNode(id);
    }
  });

  return (
    <>
      <AddButton {...{ type, handleAdd }} />
      <RequiredCheckbox {...{ isStartNode, output, handleRequiredChange }} />
      <RemoveButton {...{ id, data, output, handleRemove }} />
    </>
  );
};

const useNodeHandle = ({
  id,
  data,
}: Required<NodeCommonProps>): UseNodeHandleReturn => {
  const { nodeType } = useNodeInfo({ id, data });
  const showIterativeModal = useFlowsManager.getState().showIterativeModal;
  // 判断是否可连接
  const isConnectable = useMemo(() => {
    return showIterativeModal || !data?.parentId;
  }, [data?.parentId, showIterativeModal]);

  const hasSourceHandle = useMemo(() => {
    if (
      ['node-end', 'iteration-node-end', 'loop-node-end', 'loop-exit'].includes(
        nodeType
      )
    ) {
      return false;
    }
    if (nodeType === 'decision-making') {
      return false;
    }
    if (nodeType === 'if-else') {
      return false;
    }
    if (data?.nodeParam?.answerType === 'option') {
      return false;
    }
    return true;
  }, [nodeType, data]);

  const sourceHandleId = useMemo(() => {
    return data?.nodeParam?.handlingEdge;
  }, [data?.nodeParam?.handlingEdge]);

  const exceptionHandleId = useMemo(() => {
    return data?.nodeParam?.exceptionHandlingEdge;
  }, [data?.nodeParam?.exceptionHandlingEdge, id]);

  const hasTargetHandle = useMemo(() => {
    if (
      ['node-start', 'iteration-node-start', 'loop-node-start']?.includes(
        nodeType
      )
    ) {
      return false;
    }
    return true;
  }, [nodeType]);

  return {
    isConnectable,
    sourceHandleId,
    exceptionHandleId,
    hasTargetHandle,
    hasSourceHandle,
  };
};

const titleRender = (nodeData: {
  name: string;
  schema?: { type?: string };
  type?: string;
}): React.ReactElement => {
  return (
    <div className="flex items-center gap-2">
      <span>{nodeData.name}</span>
      <div className="bg-[#F0F0F0] px-2.5 py-0.5 rounded text-xs">
        {renderType(nodeData)}
      </div>
    </div>
  );
};

const useNodeInputRender = ({
  id,
  data,
}: Required<NodeCommonProps>): UseNodeInputRenderReturn => {
  const { t } = useTranslation();
  const { isIteratorNode } = useNodeInfo({ id, data });
  const { handleChangeOutputParam } = useNodeFunc({ id, data });
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const delayCheckNode = currentStore(state => state.delayCheckNode);
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const nodes = currentStore(state => state.nodes);
  const setNode = currentStore(state => state.setNode);
  const updateNodeRef = currentStore(state => state.updateNodeRef);
  const takeSnapshot = currentStore(state => state.takeSnapshot);
  const checkNode = currentStore(state => state.checkNode);
  const [focusTextareaId, setFocusTextareaId] = useState('');
  const renderTypeInput = useMemoizedFn((output: PropertyItem) => {
    return (
      <FlowNodeTextArea
        disabled={output?.customParameterType === 'deepseekr1'}
        placeholder={t('workflow.nodes.common.variableDescriptionPlaceholder')}
        maxLength={1000}
        rows={focusTextareaId === output?.id ? 3 : 1}
        style={{
          height: focusTextareaId === output?.id ? 100 : 30,
        }}
        value={formatParameterDefault(output.schema?.default ?? output.default)}
        onChange={value =>
          handleChangeOutputParam(
            output.id,
            (data, value) => {
              if (data?.schema?.type) {
                data.schema.default = value;
              } else {
                data.default = value;
              }
            },
            value
          )
        }
        onBlur={() => {
          delayCheckNode(id);
          setFocusTextareaId('');
        }}
        onFocus={() => setFocusTextareaId(output?.id)}
      />
    );
  });
  const handleChangeInputParam = useCallback(
    <Value,>(
      inputId: string,
      fn: (data: InputItem, value: Value, nodeData: WorkflowNodeData) => void,
      value: Value
    ) => {
      setNode(id, old => {
        const currentInput = old?.data?.inputs?.find(
          item => item?.id === inputId
        );
        if (currentInput) {
          fn(currentInput, value, old.data);
        }
        if (isIteratorNode) {
          const outputs = old?.data?.inputs?.map(input => ({
            id: input?.id,
            name: input?.name,
            schema: {
              type: input.schema.type.split('-').pop() ?? 'string',
              default: '',
            },
          }));
          const iteratorStartNode = nodes?.find(
            node =>
              node?.data?.parentId === id &&
              node?.nodeType === 'iteration-node-start'
          );
          if (iteratorStartNode)
            setNode(iteratorStartNode.id, old => {
              old.data.outputs = outputs;
              return cloneDeep(old);
            });
          if (iteratorStartNode) updateNodeRef(iteratorStartNode.id);
        }
        return {
          ...cloneDeep(old),
        };
      });
      autoSaveCurrentFlow();
      canPublishSetNot();
    },
    [
      id,
      setNode,
      isIteratorNode,
      nodes,
      updateNodeRef,
      autoSaveCurrentFlow,
      canPublishSetNot,
    ]
  );
  const handleAddInputLine = useMemoizedFn(() => {
    takeSnapshot();
    setNode(id, old => {
      old.data.inputs.push({
        id: uuid(),
        name: '',
        schema: {
          type: 'string',
          value: {
            type: 'ref',
            content: {},
          },
        },
      });
      return {
        ...cloneDeep(old),
      };
    });
    checkNode(id);
    canPublishSetNot();
  });
  const handleRemoveInputLine = useMemoizedFn((inputId: string) => {
    takeSnapshot();
    setNode(id, old => {
      old.data.inputs = old.data.inputs.filter(item => item.id !== inputId);
      return {
        ...cloneDeep(old),
      };
    });
    canPublishSetNot();
    checkNode(id);
  });
  const allowNoInputParams = useMemo(() => {
    return (
      ([
        'knowledge-base',
        'knowledge-pro-base',
        'iteration',
        'extractor-parameter',
      ].includes(data.nodeType ?? '') &&
        data?.outputs?.length > 1) ||
      ![
        'knowledge-base',
        'knowledge-pro-base',
        'iteration',
        'extractor-parameter',
      ]?.includes(data.nodeType ?? '')
    );
  }, [data]);

  return {
    allowNoInputParams,
    renderTypeInput,
    handleChangeInputParam,
    handleAddInputLine,
    handleRemoveInputLine,
  };
};

export const useNodeCommon = ({
  id,
  data: suppliedData,
}: NodeCommonProps): UseNodeCommonReturn => {
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const storedData = currentStore(
    state => state.nodes.find(node => node.id === id)?.data
  );
  const data: WorkflowNodeData = suppliedData ??
    storedData ?? {
      nodeMeta: { aliasName: '' },
      nodeParam: {},
      inputs: [],
      outputs: [],
    };
  const nodeInfo = useNodeInfo({ id, data });
  const nodeFunc = useNodeFunc({ id, data });
  const nodeInputRender = useNodeInputRender({ id, data });
  const { renderOutputComponent } = useNodeOutputRender({ id, data });
  const nodeModels = useNodeModels({ id, data });
  const nodeHandle = useNodeHandle({ id, data });
  const nodeOutputRender = useNodeOutputRender({ id, data });
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);

  const addUniqueComponentToProperties = useMemoizedFn(
    (schemasArray: OutputItem[]): OutputItem[] => {
      function addAgeToProperties(propertiesArray: PropertyItem[]): void {
        propertiesArray.forEach(property => {
          property.key = property.id;
          property.isChild = true;
          property.title = renderOutputComponent(property);
          if (property.properties && Array.isArray(property.properties)) {
            addAgeToProperties(property.properties);
          }
        });
      }

      return schemasArray.map(schema => {
        const newSchema = { ...schema };
        if (newSchema.schema && newSchema.schema.properties) {
          addAgeToProperties(newSchema.schema.properties);
        }
        newSchema.title = renderOutputComponent(newSchema);
        newSchema.key = newSchema.id;
        newSchema.properties = newSchema.schema.properties;
        return newSchema;
      });
    }
  );

  const renderTypeOneClickUpdate = (): React.ReactElement | null => {
    const { nodeType } = useNodeInfo({ id, data });
    if (nodeType === 'plugin') {
      return <ToolNodeOneClickUpdate id={id} data={data} />;
    } else if (nodeType === 'flow') {
      return <FlowNodeOneClickUpdate id={id} data={data} />;
    } else if (nodeType === 'rpa') {
      return <RpaNodeOneClickUpdate id={id} data={data} />;
    }
    return null;
  };

  return {
    titleRender,
    addUniqueComponentToProperties,
    renderTypeOneClickUpdate,
    canvasesDisabled,
    ...nodeInfo,
    ...nodeFunc,
    ...nodeModels,
    ...nodeOutputRender,
    ...nodeHandle,
    ...nodeInputRender,
  };
};
