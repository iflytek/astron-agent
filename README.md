# ChatClaw Feature - Astron Agent

This deliverable includes:
- A React Flow custom node component (`OpenClawNode`) for the drag-and-drop canvas.
- A backend node executor (`openclaw-node.js`) that handles skill execution with precondition/postcondition evaluation.
- A sample template (`chatclaw-template.json`) demonstrating the "Trigger-Plan-Execute-Reply" flow.

## Usage
1. Place the `OpenClawNode` component into your React Flow nodeTypes.
2. Register the `openclaw-node` in the workflow engine (or use as a reference for your implementation).
3. Load the template to create a new ChatClaw application.

## Configuration
- Set `OPENCLAW_API_KEY` environment variable for API access.
- Adjust skill ID and input/output mappings as needed.

## Success Criteria
- Developers can drag OpenClaw nodes onto the canvas and configure them.
- The template flow runs end-to-end: user message triggers planner -> OpenClaw executes -> AI replies.
