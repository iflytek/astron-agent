# Astron Agent - ChatClaw Workflow Builder

## Overview
This feature enables developers to build "ChatClaw" applications using a drag-and-drop canvas within Astron Agent. It leverages low-code visual workflow orchestration to fine-tune OpenClaw skills.

## Quick Start
1. Clone the repository.
2. Install dependencies: `cd frontend && npm install`.
3. Start the backend: `cd backend && npm install && node server.js` (requires Express setup).
4. Start the frontend: `npm start`.
5. Open `http://localhost:3000`.

## Usage
- Drag nodes from the sidebar onto the canvas.
- Use the **Add OpenClaw Node** button to add an OpenClaw skill block.
- Connect nodes by dragging from source handles to target handles.
- Configure node properties (input, output, conditions) in the node panel.
- Save your workflow to the backend via API.

## Architecture
- **Frontend**: React + ReactFlow provides the drag-and-drop canvas.
- **Backend**: Express.js REST API for workflow persistence.
- **Node Types**: Input (Trigger), Default (Planner), OpenClaw, Output (Response).

## Success Criteria
- Users can create a workflow with an OpenClaw node using zero to low code.
- The typical flow (Trigger → Planner → OpenClaw → Response) functions end-to-end.

## Business Value
Reduces development effort, enables cross-platform capability sharing, and accelerates deployment of intelligent chatbots and automation assistants.
