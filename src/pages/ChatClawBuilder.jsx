import React from 'react';
import CanvasIntegration from '../components/workflow/CanvasIntegration';

const ChatClawBuilder = () => {
  return (
    <div style={{ padding: 24 }}>
      <h1>ChatClaw Application Builder</h1>
      <p>Drag and drop nodes to create your OpenClaw workflow.</p>
      <CanvasIntegration />
    </div>
  );
};

export default ChatClawBuilder;