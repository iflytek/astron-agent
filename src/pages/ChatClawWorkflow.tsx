import React, { useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import OpenClawNode from '../components/OpenClawNode';

const nodeTypes: NodeTypes = {
  openclaw: OpenClawNode,
};

const initialNodes = [
  {
    id: 'trigger',
    type: 'input',
    position: { x: 250, y: 25 },
    data: { label: 'User Message Trigger' },
  },
  {
    id: 'planner',
    type: 'default',
    position: { x: 250, y: 150 },
    data: { label: 'AI Planner' },
  },
  {
    id: 'openclaw',
    type: 'openclaw',
    position: { x: 250, y: 300 },
    data: { skillId: '', inputParams: {}, preConditions: [], postConditions: [] },
  },
  {
    id: 'response',
    type: 'output',
    position: { x: 250, y: 450 },
    data: { label: 'AI Response' },
  },
];

const initialEdges = [
  { id: 'e-trigger-planner', source: 'trigger', target: 'planner', animated: true },
  { id: 'e-planner-openclaw', source: 'planner', target: 'openclaw', animated: true },
  { id: 'e-openclaw-response', source: 'openclaw', target: 'response', animated: true },
];

const ChatClawWorkflow: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

export default ChatClawWorkflow;
