import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

const OpenClawNode = ({ data, isConnectable }) => {
  return (
    <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px', background: '#f0f8ff' }}>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <div>
        <strong>OpenClaw Skill</strong>
        <div style={{ fontSize: '12px', color: '#666' }}>{data.label}</div>
        <div style={{ marginTop: '5px' }}>
          <label>Input: </label>
          <input type="text" defaultValue={data.input || ''} style={{ width: '100%' }} />
        </div>
        <div style={{ marginTop: '5px' }}>
          <label>Output: </label>
          <span>{data.output || '—'}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};

const nodeTypes = { openClaw: OpenClawNode };

const initialNodes = [
  {
    id: 'trigger',
    type: 'input',
    position: { x: 50, y: 100 },
    data: { label: 'User Trigger' },
  },
  {
    id: 'planner',
    type: 'default',
    position: { x: 250, y: 100 },
    data: { label: 'AI Planner' },
  },
  {
    id: 'openclaw',
    type: 'openClaw',
    position: { x: 450, y: 100 },
    data: { label: 'OpenClaw Action', input: 'query', output: '' },
  },
  {
    id: 'response',
    type: 'output',
    position: { x: 650, y: 100 },
    data: { label: 'AI Response' },
  },
];

const initialEdges = [
  { id: 'e-trigger-planner', source: 'trigger', target: 'planner' },
  { id: 'e-planner-openclaw', source: 'planner', target: 'openclaw' },
  { id: 'e-openclaw-response', source: 'openclaw', target: 'response' },
];

const WorkflowCanvas = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nodeName, setNodeName] = useState('');
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode = {
        id: `node_${Date.now()}`,
        type,
        position,
        data: { label: `${type} node` },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  const addOpenClawNode = () => {
    const newNode = {
      id: `openclaw_${Date.now()}`,
      type: 'openClaw',
      position: { x: 400, y: 200 },
      data: { label: 'New OpenClaw Skill', input: '', output: '' },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', background: '#eee' }}>
        <button onClick={addOpenClawNode}>Add OpenClaw Node</button>
      </div>
      <div ref={reactFlowWrapper} style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
};

export default WorkflowCanvas;