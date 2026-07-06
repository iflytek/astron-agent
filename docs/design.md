# ChatClaw Feature Design

## Overview
Provide drag-and-drop canvas support for building ChatClaw applications with visual fine-tuning of OpenClaw skills.

## Components
- **OpenClawNode**: Custom node for OpenClaw skill execution.
- **NodeConfigPanel**: Visual configuration for input/output parameters, pre/post conditions.
- **ChatClawTemplate**: Pre-built workflow template with trigger -> plan -> action -> reply loop.

## Workflow
1. User message triggers workflow.
2. AI assistant node plans action.
3. OpenClaw node executes skill.
4. Result processed by AI assistant node.
5. AI assistant replies to user.

## Success Criteria
- Users can create workflow with OpenClaw node via drag-and-drop.
- Complete flow from message to reply works.