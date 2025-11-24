import {
  Connection,
  Edge,
  Node,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
  Viewport,
} from 'reactflow';

export type FlowState = {
  template?: string;
  input_keys?: object;
  memory_keys?: Array<string>;
  handle_keys?: Array<string>;
};

export type NodeType = Node & {
  nodeType: string;
};

export type FlowStoreType = {
  loadHistory: (nodes: NodeType[], edges: Edge[]) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  reactFlowInstance: ReactFlowInstance | null;
  setReactFlowInstance: (newState: ReactFlowInstance) => void;
  flowState: FlowState | undefined;
  nodes: NodeType[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  deleteNodeRef: (nodeId: string, outputId: string) => void;
  setNodes: (
    update: NodeType[] | ((oldState: NodeType[]) => NodeType[])
  ) => void;
  setEdges: (
    update: Edge[] | ((oldState: Edge[]) => Edge[]),
    noNeedTakeSnapshot?: boolean
  ) => void;
  setNode: (
    id: string,
    update: NodeType | ((oldState: NodeType) => NodeType)
  ) => void;
  delayCheckNode: (id: string) => void;
  checkNode: (id: string) => boolean;
  deleteNode: (nodeId: string) => void;
  paste: (selection: { nodes: NodeType[]; edges: Edge[] }) => void;
  onConnect: (connection: Connection) => void;
  removeNodeRef: (
    souceId: string,
    targetId: string,
    inputEdges?: Edge[]
  ) => void;
  updateNodeRef: (id: string) => void;
  delayUpdateNodeRef: (id: string) => void;
  switchNodeRef: (connection: Connection, oldEdge: Edge) => void;
  moveToPosition: (viewport: Viewport) => void;
  updateNodeNameStatus: (id: string, labelInput?: string) => void;
  reNameNode: (id: string, value: string) => void;
  copyNode: (id: string) => void;
  takeSnapshot: (flag?: boolean) => void;
  undo: () => void;
  historys: History[];
  setHistorys: (
    update: History[] | ((oldState: History[]) => History[])
  ) => void;
};
