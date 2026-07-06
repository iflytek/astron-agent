# Feature: Drag-and-Drop Canvas for ChatClaw Application

## Overview
Enable low-code creation of ChatClaw applications using a visual drag-and-drop canvas. This feature leverages Astron Agent's existing workflow orchestration capabilities and adds a dedicated "OpenClaw Node" component.

## Components
1. **Workflow Canvas**: Extend the existing drag-and-drop canvas to include an "OpenClaw Node" palette item.
2. **Node Configuration Panel**: Allow users to configure OpenClaw Skill parameters, input/output mappings, pre/post conditions via UI.
3. **ChatClaw Template**: Provide a pre-built template with a typical flow: Trigger → Planner → OpenClaw Action → Response.

## Architecture
- Frontend: React-based canvas (e.g., React Flow) with custom node types.
- Backend: YAML/JSON workflow definitions that are executed by the Astron Agent runtime.
- Integration: OpenClaw API calls wrapped as a reusable action node.

## Implementation Steps
1. Define the OpenClaw node schema (inputs, outputs, parameters).
2. Create a React Flow custom node component.
3. Add a configuration panel that dynamically renders fields based on the skill.
4. Implement template generation logic.
5. Test end-to-end with a sample skill.