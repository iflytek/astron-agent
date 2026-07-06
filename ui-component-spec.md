# OpenClaw Node UI Component Specification

## Frontend Framework
- React 18+
- React Flow (for drag-and-drop canvas)
- Ant Design (for configuration panel)

## Custom Node: OpenClaw Node
- **Appearance**: Icon representing OpenClaw, distinct color (e.g., orange).
- **Handles**: Input on top, output on bottom.
- **Configuration Panel**: Opens on double-click or right-click.

### Configuration Panel Properties
1. **Skill ID**: Dropdown or text input (auto-fetched from backend API).
2. **Parameters**: Dynamic form fields generated from the skill's schema (obtained via API).
3. **Preconditions**: List of conditions (e.g., if input contains 'x', then skip).
4. **Postconditions**: List of actions after execution (e.g., transform output).
5. **Test Button**: Execute locally with sample data to verify configuration.

## Template Generation
- On canvas initialization, offer "New from Template" with ChatClaw template.
- Template generates nodes and edges as per the workflow-spec.json.

## Data Flow
- All node configurations are stored in the workflow JSON.
- On save, the workflow is serialized and sent to backend for persistence.
- Backend validates the schema before execution.