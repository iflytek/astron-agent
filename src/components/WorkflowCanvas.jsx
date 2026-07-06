import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import OpenClawNode from './OpenClawNode';
import NodeConfigPanel from './NodeConfigPanel';

const nodeTypes = {
  openClaw: OpenClawNode,
};

const initialNodes = [
  { id: 'trigger', type: 'input', position: { x: 250, y: 25 }, data: { label: 'Trigger' } },
  { id: 'planner', type: 'default', position: { x: 250, y: 150 }, data: { label: 'Planner' } },
  { id: 'openclaw', type: 'openClaw', position: { x: 250, y: 275 }, data: { label: 'OpenClaw Action', config: {} } },
  { id: 'result', type: 'default', position: { x: 250, y: 400 }, data: { label: 'Result' } },
  { id: 'reply', type: 'output', position: { x: 250, y: 525 }, data: { label: 'AI Reply' } },
];

const initialEdges = [
  { id: 'e1-2', source: 'trigger', target: 'planner', animated: true },
  { id: 'e2-3', source: 'planner', target: 'openclaw', animated: true },
  { id: 'e3-4', source: 'openclaw', target: 'result', animated: true },
  { id: 'e4-5', source: 'result', target: 'reply', animated: true },
];

export default function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const panelRef = useRef(null);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNodeConfig = useCallback((nodeId, config) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, config } };
        }
        return n;
      })
    );
  }, [setNodes]);

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex' }}>
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background variant="dots" gap={16} size={1} />
        </ReactFlow>
      </div>
      {selectedNode && selectedNode.type === 'openClaw' && (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={(config) => updateNodeConfig(selectedNode.id, config)}
          ref={panelRef}
        />
      )}
    </div>
  );
}
