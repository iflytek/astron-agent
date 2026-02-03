import { useMemo } from 'react';
import { useMemoizedFn } from 'ahooks';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { message } from 'antd';
import useUserStore from '@/store/user-store';
import {
  generateKnowledgeOutput,
  getNodeId,
  copyNodeData,
  getNextName,
  handleModifyToolUrlParams,
  findFromTwoItems,
  transformTree,
  generateRandomPosition,
} from '@/components/workflow/utils/reactflowUtils';
import { isJSON } from '@/utils';
import useSpaceStore from '@/store/space-store';
import { v4 as uuid } from 'uuid';
import { cloneDeep } from 'lodash';

// 类型导入
import {
  AddNodeType,
  ToolType,
  FlowType,
  McpType,
  PositionType,
  NewNodeType,
  UseAddNodeReturn,
  UseAddToolNodeReturn,
  UseAddFlowNodeReturn,
  UseAddRpaNodeReturn,
  UseAddMcpNodeReturn,
} from '@/components/workflow/types/hooks';

import { UseFlowCommonReturn } from '@/components/workflow/types/hooks';
import { RpaNodeParam } from '@/types/rpa';
import { Edge } from 'reactflow';
import { transRpaParameters } from '@/utils/rpa';

const useAddNode = (): UseAddNodeReturn => {
  const { spaceId } = useSpaceStore();
  const setWillAddNode = useFlowsManager(state => state.setWillAddNode);
  const setShowToolModal = useFlowsManager(state => state.setToolModalInfo);
  const setMcpModalInfo = useFlowsManager(state => state.setMcpModalInfo);
  const setFlowModal = useFlowsManager(state => state.setFlowModalInfo);
  const setRpaModal = useFlowsManager(state => state.setRpaModalInfo);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const nodes = currentStore(state => state.nodes);
  const user = useUserStore(state => state.user);
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const takeSnapshot = currentStore(state => state.takeSnapshot);
  const setNodes = currentStore(state => state.setNodes);
  const checkNode = currentStore(state => state.checkNode);
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const handleAddNode = useMemoizedFn(
    (addNode: AddNodeType, position: PositionType): NewNodeType[] | null => {
      setWillAddNode(addNode);
      const nodeType = addNode?.idType;
      if (nodeType === 'plugin') {
        setShowToolModal({
          open: true,
        });
        return null;
      } else if (nodeType === 'flow') {
        setFlowModal({
          open: true,
        });
        return null;
      } else if (nodeType === 'rpa') {
        setRpaModal({
          open: true,
        });
        return null;
      } else if (addNode?.idType === 'mcp') {
        setMcpModalInfo({ open: true });
        return null;
      } else {
        const currentTypeList = nodes.filter(
          node => node?.nodeType === nodeType
        );
        addNode.data.nodeParam.appId = currentFlow?.appId;
        addNode.data.nodeParam.uid = user?.uid?.toString();
        if (nodeType === 'knowledge-base') {
          addNode.data.nodeParam.flowId = currentFlow?.flowId;
          addNode.data.nodeParam.ragType = 'CBG-RAG';
          addNode.data.outputs = generateKnowledgeOutput('CBG-RAG');
        }
        if (nodeType === 'node-variable') {
          addNode.data.nodeParam.flowId = currentFlow?.flowId;
        }
        if (nodeType === 'database' && spaceId) {
          addNode.data.nodeParam.spaceId = spaceId?.toString();
        }
        let addNodes: NewNodeType[] = [];
        if (nodeType === 'iteration') {
          const nodeId = getNodeId(addNode.idType);
          const startNodeId = getNodeId('iteration-node-start');
          addNode.data.nodeParam.IterationStartNodeId = startNodeId;
          addNodes = [
            {
              id: nodeId,
              type: 'custom',
              nodeType,
              selected: true,
              position: { x: position?.x, y: position?.y },
              data: {
                ...copyNodeData(addNode.data),
                description: addNode.description,
                label: getNextName(currentTypeList, addNode.aliasName),
                labelEdit: false,
              },
            },
            {
              id: startNodeId,
              parentId: nodeId,
              extent: 'parent',
              zIndex: 1,
              draggable: false,
              type: 'custom',
              nodeType: 'iteration-node-start',
              selected: false,
              position: { x: 100, y: 150 },
              data: {
                label: '开始',
                originPosition: {
                  x: 100,
                  y: 300,
                },
                parentId: nodeId,
                description:
                  '工作流的开启节点，用于定义流程调用所需的业务变量信息。',
                nodeMeta: {
                  nodeType: '基础节点',
                  aliasName: '开始节点',
                },
                inputs: [],
                outputs: [
                  {
                    id: uuid(),
                    name: 'input',
                    schema: {
                      type: '',
                      default: '',
                    },
                  },
                ],
                nodeParam: {},
              },
            },
            {
              id: getNodeId('iteration-node-end'),
              parentId: nodeId,
              extent: 'parent',
              draggable: false,
              zIndex: 1,
              type: 'custom',
              nodeType: 'iteration-node-end',
              selected: false,
              position: { x: 250, y: 150 },
              data: {
                parentId: nodeId,
                originPosition: {
                  x: 1000,
                  y: 300,
                },
                label: '结束',
                description:
                  '工作流的结束节点，用于输出工作流运行后的最终结果。',
                nodeMeta: {
                  nodeType: '基础节点',
                  aliasName: '结束节点',
                },
                inputs: [
                  {
                    id: uuid(),
                    name: 'output',
                    schema: {
                      type: '',
                      value: {
                        type: 'ref',
                        content: {},
                      },
                    },
                  },
                ],
                outputs: [],
                nodeParam: {
                  outputMode: 0,
                  template: '',
                },
              },
            },
          ];
        } else {
          addNodes = [
            {
              id: getNodeId(addNode.idType),
              type: 'custom',
              nodeType,
              selected: true,
              position: { x: position?.x, y: position?.y },
              data: {
                icon: addNode.icon,
                ...copyNodeData(addNode.data),
                description: addNode.description,
                label: getNextName(currentTypeList, addNode.aliasName),
                labelEdit: false,
              },
            },
          ];
        }
        takeSnapshot();
        setNodes(nodes =>
          cloneDeep([
            ...nodes.map(node => ({ ...node, selected: false })),
            ...addNodes,
          ])
        );
        canPublishSetNot();
        setWillAddNode(null);
        checkNode(addNodes[0].id);
        return addNodes;
      }
    }
  );
  return {
    handleAddNode,
  };
};

const useAddToolNode = ({ addEdge }): UseAddToolNodeReturn => {
  const willAddNode = useFlowsManager(state => state.willAddNode);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const nodes = currentStore(state => state.nodes);
  const user = useUserStore(state => state.user);
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const takeSnapshot = currentStore(state => state.takeSnapshot);
  const setNodes = currentStore(state => state.setNodes);
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const beforeNode = useFlowsManager(state => state.beforeNode);
  const reactFlowInstance = currentStore(state => state.reactFlowInstance);
  const checkNode = currentStore(state => state.checkNode);
  const handleAddToolNode = useMemoizedFn((tool: ToolType): void => {
    takeSnapshot();
    const currentTypeList = nodes.filter(
      node => node?.data?.nodeParam?.pluginId === tool.toolId
    );
    willAddNode.data.nodeParam.pluginId = tool.toolId;
    willAddNode.data.nodeParam.operationId = tool.operationId;
    willAddNode.data.nodeParam.toolDescription = tool.description;
    willAddNode.data.nodeParam.version = tool.version || 'V1.0';
    willAddNode.data.nodeParam.appId = currentFlow?.appId || '';
    willAddNode.data.nodeParam.uid = user?.uid?.toString() || '';
    const toolRequestInput =
      (isJSON(tool?.webSchema || '') &&
        JSON.parse(tool.webSchema || '')?.toolRequestInput) ||
      [];
    willAddNode.data.inputs = handleModifyToolUrlParams(toolRequestInput);
    willAddNode.data.nodeParam.businessInput =
      findFromTwoItems(toolRequestInput);
    willAddNode.data.outputs = transformTree(
      (isJSON(tool?.webSchema || '') &&
        JSON.parse(tool.webSchema || '')?.toolRequestOutput) ||
        []
    );
    const newToolNode = {
      id: getNodeId(willAddNode.idType),
      type: 'custom',
      nodeType: willAddNode?.idType,
      position: generateRandomPosition(reactFlowInstance?.getViewport()),
      selected: true,
      data: {
        icon: willAddNode.icon,
        ...copyNodeData(willAddNode.data),
        label: getNextName(currentTypeList, tool.name),
        labelEdit: false,
      },
    };
    setNodes(nodes => [
      ...nodes.map(node => ({ ...node, selected: false })),
      newToolNode,
    ]);
    canPublishSetNot();
    message.success(`${tool.name} 已添加`);
    if (beforeNode) {
      addEdge(beforeNode.sourceHandle, beforeNode, newToolNode);
    }
    checkNode(newToolNode.id);
  });
  return {
    handleAddToolNode,
  };
};

const useAddMcpNode = ({ addEdge }): UseAddMcpNodeReturn => {
  const willAddNode = useFlowsManager(state => state.willAddNode);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const nodes = currentStore(state => state.nodes);
  const takeSnapshot = currentStore(state => state.takeSnapshot);
  const setNodes = currentStore(state => state.setNodes);
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const beforeNode = useFlowsManager(state => state.beforeNode);
  const reactFlowInstance = currentStore(state => state.reactFlowInstance);
  const checkNode = currentStore(state => state.checkNode);
  const handleAddMcpNode = useMemoizedFn((mcpParam: McpType): void => {
    takeSnapshot();
    const currentTypeList = nodes.filter(
      node => node?.data?.nodeParam?.mcpServerId === mcpParam.mcpId
    );
    willAddNode.data.nodeParam.toolName = mcpParam.name;
    willAddNode.data.nodeParam.mcpServerUrl = mcpParam.server_url;
    willAddNode.data.nodeParam.toolDescription = mcpParam.description;
    willAddNode.data.inputs = mcpParam?.args?.map(item => ({
      id: uuid(),
      name: item.name,
      type: item.type,
      required: item?.required,
      description: item.description,
      schema: {
        type: item.type,
        value: {
          type: 'ref',
          content: {},
        },
      },
    }));
    const newToolNode = {
      id: getNodeId(willAddNode.idType),
      type: 'custom',
      nodeType: willAddNode?.idType,
      position: generateRandomPosition(reactFlowInstance?.getViewport()),
      selected: true,
      data: {
        icon: willAddNode.icon,
        ...copyNodeData(willAddNode.data),
        label: getNextName(currentTypeList, mcpParam.name),
        labelEdit: false,
      },
    };
    setNodes(nodes => [
      ...nodes.map(node => ({ ...node, selected: false })),
      newToolNode,
    ]);
    canPublishSetNot();
    message.success(`${mcpParam.name} 已添加`);
    if (beforeNode) {
      addEdge(beforeNode.sourceHandle, beforeNode, newToolNode);
    }
    checkNode(newToolNode.id);
  });
  return {
    handleAddMcpNode,
  };
};

const useAddFlowNode = ({ addEdge }): UseAddFlowNodeReturn => {
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const nodes = currentStore(state => state.nodes);
  const user = useUserStore(state => state.user);
  const takeSnapshot = currentStore(state => state.takeSnapshot);
  const setNodes = currentStore(state => state.setNodes);
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const beforeNode = useFlowsManager(state => state.beforeNode);
  const willAddNode = useFlowsManager(state => state.willAddNode);
  const reactFlowInstance = currentStore(state => state.reactFlowInstance);
  const checkNode = currentStore(state => state.checkNode);
  const handleAddFlowNode = useMemoizedFn((flow: FlowType): void => {
    takeSnapshot();
    const currentTypeList = nodes.filter(
      node => node?.data?.nodeParam?.flowId === flow.flowId
    );
    willAddNode.data.nodeParam.toolDescription = flow.description;
    willAddNode.data.nodeParam.appId = flow?.appId;
    willAddNode.data.nodeParam.flowId = flow?.flowId;
    willAddNode.data.nodeParam.uid = user?.uid?.toString() || '';
    willAddNode.data.nodeParam.version = (flow as unknown)?.version || '';
    willAddNode.data.inputs = (flow as unknown)?.ioInversion?.inputs || [];
    willAddNode.data.outputs = (flow as unknown)?.ioInversion?.outputs || [];
    const newFlowNode = {
      id: getNodeId(willAddNode.idType),
      type: 'custom',
      nodeType: willAddNode?.idType,
      position: generateRandomPosition(reactFlowInstance?.getViewport()),
      selected: true,
      data: {
        icon: willAddNode.icon,
        ...copyNodeData(willAddNode.data),
        label: getNextName(currentTypeList, flow.name),
        labelEdit: false,
      },
    };
    setNodes(nodes => [
      ...nodes.map(node => ({ ...node, selected: false })),
      newFlowNode,
    ]);
    canPublishSetNot();
    message.success(`${flow.name} 已添加`);
    if (beforeNode) {
      addEdge(beforeNode.sourceHandle, beforeNode, newFlowNode);
    }
    checkNode(newFlowNode.id);
  });
  return {
    handleAddFlowNode,
  };
};

const useAddRpaNode = ({ addEdge }): UseAddRpaNodeReturn => {
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const nodes = currentStore(state => state.nodes);
  const takeSnapshot = currentStore(state => state.takeSnapshot);
  const setNodes = currentStore(state => state.setNodes);
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const beforeNode = useFlowsManager(state => state.beforeNode);
  const willAddNode = useFlowsManager(state => state.willAddNode);
  const reactFlowInstance = currentStore(state => state.reactFlowInstance);
  const checkNode = currentStore(state => state.checkNode);
  const handleAddRpaNode = useMemoizedFn((rpaParam: RpaNodeParam): void => {
    takeSnapshot();
    const currentTypeList = nodes.filter(
      node => node?.data?.nodeParam?.projectId === rpaParam.project_id
    );
    willAddNode.data.nodeParam.projectId = rpaParam.project_id;
    willAddNode.data.nodeParam.source = rpaParam.platform;
    willAddNode.data.nodeParam.header = rpaParam.fields;
    willAddNode.data.nodeParam.version = rpaParam.version;
    willAddNode.data.nodeParam.appId = currentFlow?.appId || '';
    willAddNode.data.nodeParam.assistantId = rpaParam.rpaId;
    willAddNode.data.nodeParam.rpaDescription = rpaParam.description;
    willAddNode.data.inputs = transRpaParameters(
      rpaParam.parameters?.filter(item => item.varDirection === 0) || []
    );
    willAddNode.data.outputs = transRpaParameters(
      rpaParam.parameters?.filter(item => item.varDirection === 1) || []
    );
    const newRpaNode = {
      id: getNodeId(willAddNode.idType),
      type: 'custom',
      nodeType: willAddNode?.idType,
      position: generateRandomPosition(reactFlowInstance?.getViewport()),
      selected: true,
      data: {
        icon: willAddNode.icon,
        ...copyNodeData(willAddNode.data),
        label: getNextName(currentTypeList, rpaParam.name),
        labelEdit: false,
      },
    };
    setNodes(nodes => [
      ...nodes.map(node => ({ ...node, selected: false })),
      newRpaNode,
    ]);
    canPublishSetNot();
    message.success(`${rpaParam?.name} 已添加`);
    if (beforeNode) {
      addEdge(beforeNode.sourceHandle, beforeNode, newRpaNode);
    }
    checkNode(newRpaNode.id);
  });
  return {
    handleAddRpaNode,
  };
};

export const useFlowCommon = (): UseFlowCommonReturn => {
  const setWillAddNode = useFlowsManager(state => state.setWillAddNode);
  const setNodeInfoEditDrawerlInfo = useFlowsManager(
    state => state.setNodeInfoEditDrawerlInfo
  );
  const checkFlow = useFlowsManager(state => state.checkFlow);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const setEdges = currentStore(state => state.setEdges);
  const edgeType = useFlowsManager(state => state.edgeType);
  const setBeforeNode = useFlowsManager(state => state.setBeforeNode);
  const setOpenOperationResult = useFlowsManager(
    state => state.setOpenOperationResult
  );
  const setVersionManagement = useFlowsManager(
    state => state.setVersionManagement
  );
  const showToolModal = useFlowsManager(state => state.toolModalInfo.open);
  const showMcpModal = useFlowsManager(state => state.mcpModalInfo.open);
  const showIterativeModal = useFlowsManager(state => state.showIterativeModal);
  const knowledgeModalInfoOpen = useFlowsManager(
    state => state.knowledgeModalInfo.open
  );
  const showKnowledgeDetailModal = useFlowsManager(
    state => state.knowledgeDetailModalInfo.open
  );
  const addEdge = useMemoizedFn(
    (
      sourceHandle: string | null,
      currentNode: NewNodeType,
      nextNode: NewNodeType
    ): void => {
      const edge = {
        source: currentNode?.id,
        sourceHandle: sourceHandle,
        target: nextNode?.id,
        targetHandle: null,
        type: 'customEdge',
        markerEnd: {
          type: 'arrow',
          color: '#6356EA',
        },
        data: {
          edgeType: edgeType,
        },
        id: `reactflow__edge-${currentNode?.id}${sourceHandle ?? ''}-${
          nextNode?.id
        }`,
      };
      setEdges((edges: unknown[]) => {
        const newEdges = [...edges, edge] as Edge[];
        return newEdges;
      });
    }
  );

  const { handleAddNode } = useAddNode();
  const { handleAddToolNode } = useAddToolNode({ addEdge });
  const { handleAddFlowNode } = useAddFlowNode({ addEdge });
  const { handleAddRpaNode } = useAddRpaNode({ addEdge });
  const { handleAddMcpNode } = useAddMcpNode({ addEdge });

  const handleEdgeAddNode = useMemoizedFn(
    (
      addNode: AddNodeType,
      position: PositionType,
      sourceHandle: string | null,
      currentNode: NewNodeType
    ): void => {
      const addNodes = handleAddNode(addNode, position);
      addNodes && addEdge(sourceHandle, currentNode, addNodes[0]);
      setBeforeNode({
        ...currentNode,
        sourceHandle,
      });
    }
  );

  const handleDebugger = useMemoizedFn((): void => {
    setOpenOperationResult(openOperationResult => !openOperationResult);
    setVersionManagement(false);
    setNodeInfoEditDrawerlInfo({
      open: false,
      nodeId: '',
    });
    checkFlow();
  });

  const resetBeforeAndWillNode = useMemoizedFn((): void => {
    setBeforeNode(null);
    setWillAddNode(null);
  });

  const startWorkflowKeydownEvent = useMemo(() => {
    return (
      !showToolModal &&
      !showMcpModal &&
      !showIterativeModal &&
      !knowledgeModalInfoOpen &&
      !showKnowledgeDetailModal
    );
  }, [
    showToolModal,
    showMcpModal,
    showIterativeModal,
    knowledgeModalInfoOpen,
    showKnowledgeDetailModal,
  ]);

  const startIterativeWorkflowKeydownEvent = useMemo(() => {
    return (
      !showToolModal &&
      showIterativeModal &&
      !knowledgeModalInfoOpen &&
      !showKnowledgeDetailModal
    );
  }, [
    showToolModal,
    showIterativeModal,
    knowledgeModalInfoOpen,
    showKnowledgeDetailModal,
  ]);

  return {
    startWorkflowKeydownEvent,
    startIterativeWorkflowKeydownEvent,
    handleAddNode,
    handleAddToolNode,
    handleAddMcpNode,
    handleAddFlowNode,
    handleAddRpaNode,
    handleEdgeAddNode,
    handleDebugger,
    resetBeforeAndWillNode,
  };
};
