import {
  getNodeId,
  getEdgeId,
  extractTargetAndSource,
  checkedNodeInputData,
  checkedNodeOutputData,
  checkedNodeParams,
  findChildrenNodes,
  findParentNodes,
  getNextName,
  findItemById,
  handleReplaceNodeId,
  generateReferences,
} from '@/components/workflow/utils/reactflowUtils';
import { v4 as uuid } from 'uuid';
import { message } from 'antd';
import { cloneDeep } from 'lodash';
import useFlowsManager from './use-flows-manager';
import {
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  Connection,
} from 'reactflow';
import { NodeDataType } from '@/components/workflow/types';

export const initialStatus = {
  historys: [], //History List
  nodes: [], //Node List
  edges: [], //Edge List
  zoom: 80, //Zoom
};

// Undo
const undo = (
  get: () => {
    historys: unknown[];
    setHistorys: (callback: (history: unknown[]) => unknown[]) => void;
  }
): void => {
  const history: unknown = get().historys?.[get().historys.length - 1];
  if (history) {
    const currentStore = useFlowsManager.getState().getCurrentStore();
    currentStore.getState().loadHistory(history?.nodes, history?.edges);
    get().setHistorys(history => {
      history.pop();
      return cloneDeep(history);
    });
  }
};

// Set Zoom
const setZoom = (
  zoom: number,
  set: (state: { zoom: number }) => void
): void => {
  set({
    zoom,
  });
};

// Take Snapshot
const takeSnapshot = (
  get: () => {
    setHistorys: (callback: (history: unknown[]) => unknown[]) => void;
  }
): void => {
  const currentStore = useFlowsManager.getState().getCurrentStore();
  const flowStore = currentStore.getState();
  const newState = {
    nodes: cloneDeep(flowStore.nodes),
    edges: cloneDeep(flowStore.edges),
  };
  get().setHistorys(history => cloneDeep([...history, newState]));
};

// Set Historys
const setHistorys = (
  change: unknown,
  get,
  set: (state: { historys: unknown[] }) => void
): void => {
  const newChange =
    typeof change === 'function' ? change(get().historys) : change;
  set({
    historys: newChange,
  });
};

// Move to Position
const moveToPosition = (viewport: unknown): void => {
  const flowStore = useFlowsManager?.getState?.();
  const currentStore = flowStore?.getCurrentStore?.();
  const currentState = currentStore?.getState?.();
  const reactFlowInstance = currentState?.reactFlowInstance;
  if (reactFlowInstance) {
    reactFlowInstance.setViewport(viewport);
  }
};

// Set React Flow Instance
const setReactFlowInstance = (
  newState: unknown,
  set: (state: { reactFlowInstance: unknown }) => void
): void => {
  set({ reactFlowInstance: newState });
};

// On Nodes Change
const onNodesChange = (changes: NodeChange[], get, set): void => {
  set({
    nodes: applyNodeChanges(changes, get().nodes),
  });
};

// On Edges Change
const onEdgesChange = (
  changes: EdgeChange[],
  get: () => {
    takeSnapshot: () => void;
    removeNodeRef: (source: string, target: string) => void;
  },
  set: (state: { edges: Edge[] }) => void
): void => {
  const change = changes[0];
  if (change?.type === 'remove') {
    get()?.takeSnapshot();
    const [source, target] = extractTargetAndSource(change.id);
    get().removeNodeRef(source, target);
  }
  set({
    edges: applyEdgeChanges(changes, get().edges),
  });
};

// Set Nodes
const setNodes = (
  change: unknown,
  get: () => { nodes: Node[]; edges: Edge[] },
  set: (state: { nodes: Node[]; edges: Edge[] }) => void
): void => {
  const newChange = typeof change === 'function' ? change(get().nodes) : change;
  const newEdges = cloneDeep(get().edges);
  set({
    edges: newEdges,
    nodes: newChange,
  });
};

// Set Edges
const setEdges = (
  change: unknown,
  get: () => { edges: Edge[] },
  set: (state: { edges: Edge[] }) => void
): void => {
  const newChange = typeof change === 'function' ? change(get().edges) : change;
  set({
    edges: newChange,
  });
};

// Set Node
const setNode = (
  id: string,
  change: Node | ((oldState: Node) => Node),
  get: () => {
    nodes: Node[];
    setNodes: (callback: (nodes: Node[]) => Node[]) => void;
  },
  set: (state: { nodes: Node[] }) => void
): void => {
  const newChange =
    typeof change === 'function'
      ? change(get().nodes.find(node => node.id === id))
      : change;

  get().setNodes((oldNodes: Node[]) =>
    oldNodes.map((node: Node) => {
      if (node.id === id) {
        return newChange;
      }
      return node;
    })
  );
};

// Delay Check Node
const delayCheckNode = (
  nodeId: string,
  get: () => { nodes: Node[]; setNode: (id: string, node: Node) => void }
): void => {
  setTimeout(() => {
    checkNode(nodeId, get);
  }, 500);
};

// Check Node
const checkNode = (
  nodeId: string,
  get: () => { nodes: Node[]; setNode: (id: string, node: Node) => void }
): boolean => {
  const currentCheckNode = get().nodes.find(node => node.id === nodeId);
  const inputsFlag = checkedNodeInputData(
    currentCheckNode.data.inputs || [],
    currentCheckNode
  );
  const outputsFlag = checkedNodeOutputData(
    currentCheckNode.data.outputs || [],
    currentCheckNode
  );
  const paramsFlag = checkedNodeParams(currentCheckNode);
  const repeatedFlag = true;
  const checkFlag = inputsFlag && outputsFlag && paramsFlag && repeatedFlag;
  get().setNode(nodeId, cloneDeep(currentCheckNode));
  useFlowsManager.getState().autoSaveCurrentFlow();
  return checkFlag;
};
// Copy Node
const copyNode = (
  nodeId: string,
  get: () => {
    nodes: Node[];
    setNodes: (callback: (nodes: Node[]) => Node[]) => void;
    takeSnapshot: () => void;
  }
): void => {
  get()?.takeSnapshot();
  const currentNode = get().nodes.find(item => item.id === nodeId);
  const currentTypeList = get().nodes.filter(
    node => node.nodeType === currentNode.nodeType
  );
  currentNode.selected = false;
  const copyNode = cloneDeep(currentNode);
  copyNode.id = getNodeId(copyNode.id?.split('::')?.[0]);
  copyNode.data.label = getNextName(
    currentTypeList,
    currentNode.data?.label?.split('_')?.[0]
  );
  copyNode.data.inputs = copyNode.data.inputs?.map(input => ({
    id: input?.id,
    name: input?.name,
    required: input?.required,
    type: input?.type,
    schema: {
      type: 'string',
      value: {
        type: input?.schema?.value?.type,
        content:
          input?.schema?.value?.type === 'literal'
            ? input?.schema?.value?.content
            : {},
      },
    },
  }));
  copyNode.data.references = [];
  copyNode.data.shrink = false;
  copyNode.position = {
    x: copyNode.position.x + 50,
    y: copyNode.position.y + 50,
  };
  copyNode.selected = true;
  if (currentNode?.nodeType === 'iteration') {
    const idsMap = {};
    const childNodes = get()?.nodes?.filter(
      node => node?.data?.parentId === currentNode?.id
    );
    const newChildNodes = handleReplaceNodeId(
      childNodes?.map(item => {
        const newId = getNodeId(item.id?.split('::')?.[0]);
        idsMap[item.id] = newId;
        return {
          ...item,
          id: newId,
          parentId: copyNode?.id,
          data: {
            ...item?.data,
            parentId: copyNode?.id,
          },
        };
      }),
      idsMap
    );
    const iterationNodeStartKey = Object.keys(idsMap)?.find(item =>
      item?.startsWith('iteration-node-start')
    );
    copyNode.data.nodeParam.IterationStartNodeId =
      idsMap[iterationNodeStartKey as string];
    get().setNodes(old => {
      return cloneDeep([
        ...old.map(item => ({ ...item, selected: false })),
        copyNode,
        ...newChildNodes,
      ]);
    });
    const childNodesId = childNodes?.map(node => node?.id);
    const newEdges = get()
      .edges?.filter(
        edge =>
          childNodesId?.includes(edge?.target) ||
          childNodesId?.includes(edge?.source)
      )
      ?.map(edge => ({
        ...edge,
        id: getEdgeId(idsMap[edge.target], idsMap[edge.source]),
        target: idsMap[edge.target],
        source: idsMap[edge.source],
        selected: false,
      }));
    get().setEdges(oldEdges => cloneDeep([...oldEdges, ...newEdges]));
  } else {
    get().setNodes(old => {
      return cloneDeep([
        ...old.map(item => ({ ...item, selected: false })),
        copyNode,
      ]);
    });
  }
};

// Delete Node
const deleteNode = (
  nodeId: string,
  get: () => {
    nodes: Node[];
    edges: Edge[];
    setNodes: (callback: (nodes: Node[]) => Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    takeSnapshot: () => void;
    removeNodeRef: (source: string, target: string, edges: Edge[]) => void;
  }
): void => {
  get()?.takeSnapshot();
  const currentNode = get().nodes?.find(node => node?.id === nodeId);
  const willDeleteNodeIds = get()
    .nodes?.filter(
      node =>
        node?.data?.parentId === currentNode?.id || node?.id === currentNode?.id
    )
    ?.map(node => node?.id);
  const newEdges = get().edges.filter(
    edge =>
      !willDeleteNodeIds?.includes(edge.target) &&
      !willDeleteNodeIds?.includes(edge.source)
  );
  get().edges.forEach(edge => {
    if (
      willDeleteNodeIds?.includes(edge.target) ||
      willDeleteNodeIds?.includes(edge.source)
    ) {
      get().removeNodeRef(edge.source, edge.target, [edge, ...newEdges]);
    }
  });
  get().setNodes(
    currentNode?.nodeType !== 'iteration'
      ? get().nodes.filter(node =>
          typeof nodeId === 'string'
            ? node.id !== nodeId
            : !nodeId.includes(node.id)
        )
      : get().nodes.filter(node => !willDeleteNodeIds?.includes(node?.id))
  );

  get().setEdges(newEdges);

  useFlowsManager.getState().autoSaveCurrentFlow();
  useFlowsManager.getState().setNodeInfoEditDrawerlInfo({
    open: false,
    nodeId: '',
  });
};

// Update Node Name Status
const updateNodeNameStatus = (
  nodeId: string,
  labelInputId: string | undefined,
  get: () => {
    nodes: Node[];
    setNodes: (callback: (nodes: Node[]) => Node[]) => void;
    updateNodeRef: (id: string) => void;
  }
): void => {
  get().setNodes((nodes: Node[]) => {
    const targetNode = nodes.find(item => item?.id === nodeId);
    targetNode.data.labelEdit = !targetNode.data.labelEdit;
    if (targetNode.data.labelEdit) {
      setTimeout(() => {
        document.getElementById(labelInputId)?.focus();
      }, 100);
    } else {
      setTimeout(() => {
        get().updateNodeRef(nodeId);
      }, 500);
    }
    return cloneDeep(nodes);
  });
};

// Re Name Node
const reNameNode = (
  nodeId: string,
  value: string,
  get: () => {
    nodes: Node[];
    setNodes: (callback: (nodes: Node[]) => Node[]) => void;
  }
): void => {
  get().setNodes((nodes: Node[]) => {
    const targetNode = nodes.find(item => item?.id === nodeId);
    targetNode.data.label = value;
    return cloneDeep(nodes);
  });
};

// Paste
const paste = async (
  get: () => {
    nodes: Node[];
    setNodes: (callback: (nodes: Node[]) => Node[]) => void;
    setEdges: (edges: Edge[]) => void;
  }
): Promise<void> => {
  try {
    const text = await navigator.clipboard.readText();
    const selection = JSON.parse(text);
    const idsMap = {};
    let newNodes: Node<NodeDataType>[] = get().nodes;
    const currentTypeNodeList = cloneDeep(get().nodes);

    newNodes = selection?.nodes.map(item => {
      const currentTypeList = currentTypeNodeList.filter(
        node =>
          node.data?.label?.split('_')?.[0] ===
          item.data?.label?.split('_')?.[0]
      );
      const newId = getNodeId(item.id?.split('::')?.[0]);
      idsMap[item.id] = newId;
      item.data.label = getNextName(
        currentTypeList,
        item.data?.label?.split('_')?.[0]
      );
      item.data.inputs = item.data.inputs?.map(input => ({
        id: uuid(),
        name: input?.name,
        required: input?.required,
        type: input?.type,
        schema: {
          type: 'string',
          value: {
            type: input?.schema?.value?.type,
            content:
              input?.schema?.value?.type === 'literal'
                ? input?.schema?.value?.content
                : {},
          },
        },
      }));
      item.data.references = [];
      item.data.shrink = false;
      currentTypeNodeList.push(item);
      const newItem = {
        ...item,
        id: newId,
        position: {
          x: item.position.x + 50,
          y: item.position.y + 50,
        },
        selected: true,
      };
      if (item?.parentId) {
        newItem.parentId = idsMap[item.parentId];
      }
      if (item?.data?.parentId) {
        newItem.data.parentId = idsMap[item.parentId];
      }
      return newItem;
    });
    get().setNodes(old => {
      return cloneDeep([
        ...(old?.map(item => ({ ...item, selected: false })) || []),
        ...newNodes,
      ]);
    });
    const newEdges = selection.edges
      ?.filter(edge => idsMap[edge.target] && idsMap[edge.source])
      ?.map(edge => ({
        ...edge,
        id: getEdgeId(idsMap[edge.target], idsMap[edge.source]),
        target: idsMap[edge.target],
        source: idsMap[edge.source],
        selected: false,
      }));

    get().setEdges(oldEdges => cloneDeep([...oldEdges, ...newEdges]));

    setTimeout(() => {
      newNodes.forEach(item => {
        get().updateNodeRef(item.id);
      });
    }, 500);
  } catch (error) {
    message.error('[Clipboard] 复制失败', error);
    return;
  }
};

// Function to update node references
const updateNodeRef = (id: string, get): void => {
  const childrenNodes: string[] = findChildrenNodes(id, get().edges);

  get().setNodes(old => {
    old.forEach(item => {
      if (!childrenNodes.includes(item.id)) {
        return;
      }

      const references = generateReferences(get().nodes, get().edges, item?.id);

      item.data?.inputs?.forEach(input => {
        processInputReference(item, input, references);
      });

      if (item?.nodeType === 'iteration') {
        updateIterationOutputs(item, old);
      }
    });

    return cloneDeep(old);
  });

  const state = useFlowsManager.getState();
  state.canPublishSetNot();
  state.autoSaveCurrentFlow();
};
//
// Process Input Reference
function processInputReference(item, input, references): void {
  const node = references?.find(
    ref => ref.value === input.schema.value.content.nodeId
  );

  const reference = findItemById(
    node ? node?.children[0]?.references : [],
    input.schema.value.content.id
  );

  if (shouldResetIteration(item, input, reference)) {
    resetContent(input);
  } else if (node && reference) {
    applyReference(item, input, reference);
  } else if (typeof input.schema.value.content === 'object') {
    resetContent(input);
  }
}
// Should Reset Iteration
function shouldResetIteration(item, input, reference): boolean {
  return (
    item?.nodeType === 'iteration' &&
    typeof input.schema.value.content === 'object' &&
    !reference?.type?.includes('array')
  );
}

// Reset Content
function resetContent(input): void {
  input.schema.value.content.name = '';
  input.schema.value.content.nodeId = '';
}

// Apply Reference
function applyReference(item, input, reference): void {
  input.schema.value.content.name = reference?.value;
  if (item?.nodeType !== 'plugin' && item?.nodeType !== 'flow') {
    input.schema.type = reference?.type;
    input.fileType = reference?.fileType;
  }
}

// Update Iteration Outputs
function updateIterationOutputs(item, old): void {
  const outputs = item?.data?.inputs?.map(input => ({
    id: input?.id,
    name: input?.name,
    schema: {
      type: input?.schema?.type?.split('-')?.pop(),
      default: '',
    },
  }));

  const iteratorStartNode = old?.find(
    node => node?.data?.parentId === item?.id && node?.nodeType === 'node-start'
  );

  if (iteratorStartNode) {
    iteratorStartNode.data.outputs = outputs;
  }
}

// Function to delay updating node references
const delayUpdateNodeRef = (id: string, get): void => {
  setTimeout(() => {
    get().updateNodeRef(id);
  }, 500);
};

// Function to remove node references
const removeNodeRef = (
  souceId: string,
  targetId: string,
  inputEdges?: Edge[],
  get
): void => {
  const edges = (inputEdges || get().edges).filter(
    edge => edge.target !== targetId || edge.source !== souceId
  );
  const childrenNodes: string[] = findChildrenNodes(
    souceId,
    inputEdges || get().edges
  );
  get().setNodes((old: Node[]) => {
    old.forEach(node => {
      if (childrenNodes.includes(node.id)) {
        const parentNodes: string[] = findParentNodes(node.id, edges);
        node.data?.inputs?.forEach(input => {
          const inputId = input?.schema?.value?.content?.nodeId;
          if (inputId && !parentNodes.includes(inputId)) {
            input.schema.value.content = {
              name: '',
              nodeId: '',
            };
          }
        });
      }
    });
    return cloneDeep(old);
  });
  useFlowsManager.getState().canPublishSetNot();
};

// Function to delete node references
const deleteNodeRef = (id: string, outputId: string, get): void => {
  const childrenNodes: string[] = findChildrenNodes(id, get().edges);
  get().setNodes(old => {
    old.forEach(item => {
      if (childrenNodes.includes(item?.id)) {
        item.data?.inputs?.forEach(input => {
          if (
            input.schema.value.type === 'ref' &&
            input.schema.value.content.id === outputId
          ) {
            input.schema.value.content = {};
          }
        });
      }
    });
    return cloneDeep(old);
  });
  useFlowsManager.getState().canPublishSetNot();
};

// Function to switch node references
const switchNodeRef = (connection: Connection, oldEdge: Edge, get): void => {
  get().removeNodeRef(oldEdge.source, oldEdge.target);
};

// Function to add intent ID
const addIntentId = (connection: Edge, get): void => {
  const sourceNode = get().nodes?.find(item => item.id === connection.source);
  get().setNode(connection.source, cloneDeep(sourceNode));
};

// Function to handle connection
const onConnect = (connection: Connection, get): void => {
  let newEdges: Edge[] = [];
  get()?.takeSnapshot();
  get().setEdges((oldEdges: Edge[]) => {
    newEdges = addEdge(
      {
        ...connection,
        type: 'customEdge',
        markerEnd: {
          type: MarkerType.Arrow,
          color: '#6356EA',
        },
        data: {
          edgeType: useFlowsManager.getState().edgeType,
        },
      },
      oldEdges
    );
    return newEdges;
  });
};

// Function to load history
const loadHistory = (nodes: Node[], edges: Edge[], set): void => {
  set({
    nodes,
    edges,
  });
};

export {
  undo,
  setZoom,
  takeSnapshot,
  setHistorys,
  moveToPosition,
  setReactFlowInstance,
  onNodesChange,
  onEdgesChange,
  setNodes,
  setEdges,
  setNode,
  delayCheckNode,
  checkNode,
  copyNode,
  deleteNode,
  updateNodeNameStatus,
  reNameNode,
  paste,
  updateNodeRef,
  delayUpdateNodeRef,
  removeNodeRef,
  deleteNodeRef,
  switchNodeRef,
  addIntentId,
  onConnect,
  loadHistory,
};
