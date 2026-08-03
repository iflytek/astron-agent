# Upstream attribution

This package adapts [zwppt-mcp](https://github.com/Alex-Smith-1234/zwppt-mcp) at
commit `d6fd686b4b6d30af064671163d1425f3d3638946`.

Adapted upstream tools:

- `get_theme_list`
- `create_ppt_task`
- `get_task_progress`
- `create_outline`
- `create_outline_by_doc`
- `create_ppt_by_outline`

Local adaptations add a managed Redis credential fallback and FastMCP SSE
transport/path integration.
