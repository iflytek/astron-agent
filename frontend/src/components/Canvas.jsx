import React, { useState, useCallback } from 'react';
import ReactFlow, { addEdge, Background, Controls } from 'react-flow-renderer';
import OpenClawNode from './OpenClawNode';

const nodeTypes = { openclaw: OpenClawNode };

const initialNodes = [
  { id: 'trigger', type: 'input', position: { x: 250, y: 0 }, data: { label: 'User Message' } },
  { id: 'plan', type: 'default', position: { x: 250, y: 100 }, data: { label: 'AI Planning' } },
  { id: 'action', type: 'openclaw', position: { x: 250, y: 200 }, data: { skill: '', params: '' } },
  { id: 'reply', type: 'output', position: { x: 250, y: 300 }, data: { label: 'AI Reply' } },
];

const initialEdges = [
  { id: 'e1-2', source: 'trigger', target: 'plan' },
  { id: 'e2-3', source: 'plan', target: 'action' },
  { id: 'e3-4', source: 'action', target: 'reply' },
];

const Canvas = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  return (
    <div style={{ height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default Canvas;
