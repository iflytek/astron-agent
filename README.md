# Feature: Support Drag-and-Drop Canvas for "ChatClaw" Application and Visual Fine-tuning

## Overview
Add an "OpenClaw Node" component to the Astron Agent workflow canvas. Enable users to build ChatClaw apps with zero/low code by dragging, dropping, and configuring the node's input/output parameters and pre/post conditions. Provide a ready-to-use "ChatClaw" template with trigger-plan-execute-respond flow.

## Key Components
- **OpenClawNode**: A visual node in the canvas representing an OpenClaw skill.
- **Configuration Panel**: Side panel for setting parameters, conditions, and chaining logic.
- **ChatClaw Template**: Pre-built workflow for quick deployment.

## Success Criteria
1. Users can create a workflow with an OpenClaw node via drag-and-drop.
2. The typical flow (trigger → AI plan → OpenClaw action → result → AI reply) works end-to-end.