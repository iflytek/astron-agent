import { Edge, EdgeChange, Node, NodeChange, Connection } from 'reactflow';
import { create } from 'zustand';
import { FlowStoreType } from '../types/zustand/flow';
import {
  initialStatus,
  setZoom,
  undo,
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
  updateNodeNameStatus,
  takeSnapshot,
  setHistorys,
  delayUpdateNodeRef,
  removeNodeRef,
  deleteNodeRef,
  onConnect,
  loadHistory,
  deleteNode,
  reNameNode,
  updateNodeRef,
  switchNodeRef,
  addIntentId,
  paste,
} from './flow-function';

// this is our useStore hook that we can use in our components to get parts of the store and call actions
const useFlowStore = create<FlowStoreType>((set, get) => ({
  ...initialStatus,
  flowState: undefined,
  reactFlowInstance: null,
  setZoom: (zoom: number): void => setZoom(zoom, set),
  undo: (): void => undo(get),
  takeSnapshot: (): void => takeSnapshot(get),
  setHistorys: (change: unknown): void => setHistorys(change, get, set),
  moveToPosition: (viewport: unknown): void => moveToPosition(viewport),
  setReactFlowInstance: (newState: unknown): void =>
    setReactFlowInstance(newState, set),
  onNodesChange: (changes: NodeChange[]): void =>
    onNodesChange(changes, get, set),
  onEdgesChange: (changes: EdgeChange[]): void =>
    onEdgesChange(changes, get, set),
  setNodes: (change: unknown): void => setNodes(change, get, set),
  setEdges: (change: unknown): void => setEdges(change, get, set),
  setNode: (id: string, change: Node | ((oldState: Node) => Node)): void =>
    setNode(id, change, get, set),
  delayCheckNode: (nodeId: string): void => delayCheckNode(nodeId, get),
  checkNode: (nodeId: string): boolean => checkNode(nodeId, get),
  copyNode: (nodeId: string): void => copyNode(nodeId, get),
  deleteNode: (nodeId: string): void => deleteNode(nodeId, get),
  updateNodeNameStatus: (
    nodeId: string,
    labelInputId: string | undefined
  ): void => updateNodeNameStatus(nodeId, labelInputId, get),
  reNameNode: (nodeId: string, value: string): void =>
    reNameNode(nodeId, value, get),
  paste: (): Promise<void> => paste(get),
  updateNodeRef: (id: string): void => updateNodeRef(id, get),
  delayUpdateNodeRef: (id: string): void => delayUpdateNodeRef(id, get),
  removeNodeRef: (
    souceId: string,
    targetId: string,
    inputEdges?: Edge[]
  ): void => removeNodeRef(souceId, targetId, inputEdges, get),
  deleteNodeRef: (id: string, outputId: string): void =>
    deleteNodeRef(id, outputId, get),
  switchNodeRef: (connection: Connection, oldEdge: Edge, get): void =>
    switchNodeRef(connection, oldEdge, get),
  addIntentId: (connection: Edge): void => addIntentId(connection, get),
  onConnect: (connection: Connection): void => onConnect(connection, get),
  loadHistory: (nodes: Node[], edges: Edge[]): void =>
    loadHistory(nodes, edges, set),
}));

export default useFlowStore;
