import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import WorkflowCanvas from './components/WorkflowCanvas';

export default function App() {
  return (
    <ReactFlowProvider>
      <div style={{ fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ padding: '10px 20px', margin: 0, background: '#1e3a8a', color: '#fff' }}>Astron Agent - ChatClaw Builder</h1>
        <WorkflowCanvas />
      </div>
    </ReactFlowProvider>
  );
}
