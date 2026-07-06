import React, { useCallback } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import OpenClawNode from './nodes/OpenClawNode';
import { chatClawTemplate } from './templates/ChatClawTemplate';
import { Button, message } from 'antd';

const nodeTypes = {
  openClaw: OpenClawNode,
};

const CanvasIntegration = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const loadTemplate = () => {
    const { nodes: templateNodes, edges: templateEdges } = chatClawTemplate;
    setNodes(templateNodes);
    setEdges(templateEdges);
    message.success('ChatClaw template loaded.');
  };

  const saveWorkflow = () => {
    const workflowData = { nodes, edges };
    console.log('Saved workflow:', workflowData);
    message.success('Workflow saved.');
  };

  return (
    <div style={{ height: '80vh', width: '100%' }}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <Button type="primary" onClick={loadTemplate}>Load ChatClaw Template</Button>
        <Button onClick={saveWorkflow}>Save Workflow</Button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

export default CanvasIntegration;