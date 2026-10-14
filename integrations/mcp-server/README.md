# Astron Agent MCP Server

An [MCP](https://modelcontextprotocol.io) server that lets any MCP client (Claude, goose, Cline, Cursor and others) call iFlytek Spark models and workflows published from [Astron Agent](https://github.com/iflytek/astron-agent).

<!-- mcp-name: io.github.iflytek/astron-agent -->

## Tools

| Tool | What it does | Needs |
| --- | --- | --- |
| `spark_chat` | Sends one chat turn to a Spark model through the OpenAI-compatible Spark HTTP API and returns the reply. | `SPARK_API_PASSWORD` |
| `astron_run_workflow` | Runs a workflow that was published as an API in Astron Agent and returns its output. | `ASTRON_BASE_URL`, `ASTRON_API_KEY`, `ASTRON_API_SECRET` |
| `astron_resume_workflow` | Continues a workflow that paused for user input (`status: interrupted`). | same as above |

`astron_run_workflow` calls the public workflow API described in [Integrate Astron Agent into Your Application](../../docs/guide/integration.md). The keys of `parameters` must match the workflow's Start node. A workflow can use models, knowledge bases, tools and RPA robots, so a run can have side effects depending on how it was built.

All three tools are always listed. A tool whose credentials are missing returns an error that names the variables to set, so you can configure only Spark, only Astron, or both.

## Configuration

| Variable | Required for | Default | Description |
| --- | --- | --- | --- |
| `SPARK_API_PASSWORD` | `spark_chat` | | APIPassword from the [iFlytek open platform console](https://console.xfyun.cn) (HTTP service authentication). |
| `SPARK_MODEL` | | `4.0Ultra` | Default model: `4.0Ultra`, `generalv3.5`, `max-32k`, `generalv3`, `pro-128k` or `lite`. |
| `SPARK_BASE_URL` | | `https://spark-api-open.xf-yun.com/v1` | OpenAI-compatible base URL. |
| `ASTRON_BASE_URL` | workflow tools | | Gateway address of your Astron Agent deployment, e.g. `https://astron.example.com`. |
| `ASTRON_API_KEY` | workflow tools | | API Key of the application selected when publishing the workflow. |
| `ASTRON_API_SECRET` | workflow tools | | API Secret of that application. |
| `ASTRON_FLOW_ID` | | | Flow ID used when a call does not pass `flow_id`. |
| `ASTRON_WORKFLOW_TIMEOUT_SECONDS` | | `600` | Overall deadline for one workflow run or resume. |

Get the Astron values from **Publish → Publish as API** in the workflow editor. Keep the API Secret and APIPassword out of source control.

## Use it from an MCP client

Most clients accept a JSON block like this (Claude Desktop, Cursor, Cline):

```json
{
  "mcpServers": {
    "astron-agent": {
      "command": "uvx",
      "args": ["astron-agent-mcp"],
      "env": {
        "SPARK_API_PASSWORD": "your-api-password",
        "ASTRON_BASE_URL": "https://astron.example.com",
        "ASTRON_API_KEY": "your-api-key",
        "ASTRON_API_SECRET": "your-api-secret",
        "ASTRON_FLOW_ID": "your-flow-id"
      }
    }
  }
}
```

Claude Code:

```bash
claude mcp add astron-agent -e SPARK_API_PASSWORD=your-api-password -- uvx astron-agent-mcp
```

To run the current source before a release is on PyPI, replace `uvx astron-agent-mcp` with:

```bash
uvx --from "git+https://github.com/iflytek/astron-agent#subdirectory=integrations/mcp-server" astron-agent-mcp
```

### Streamable HTTP

The default transport is stdio. To serve over Streamable HTTP instead:

```bash
astron-agent-mcp --transport streamable-http --host 127.0.0.1 --port 8000
```

The endpoint is `http://127.0.0.1:8000/mcp`. The server has no authentication of its own and uses the credentials from its environment for every caller, so keep it on localhost or put it behind an authenticating proxy.

## Development

```bash
cd integrations/mcp-server
uv sync
uv run pytest
uv run ruff check . && uv run ruff format --check .
uv run mypy src
```

Try the tools interactively with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector uv run astron-agent-mcp
```

## Release

Releases are published by `.github/workflows/publish-mcp-server.yml` when a `mcp-server-v<version>` tag is pushed. The tag must match `__version__` in `src/astron_agent_mcp/__init__.py` and `version` in `server.json`. The workflow builds the package, publishes it to PyPI with trusted publishing, then publishes `server.json` to the [official MCP Registry](https://registry.modelcontextprotocol.io) under `io.github.iflytek/astron-agent` using GitHub OIDC.

One-time setup for maintainers: on PyPI, add a trusted publisher for project `astron-agent-mcp` with owner `iflytek`, repository `astron-agent`, workflow `publish-mcp-server.yml` and environment `pypi`.

## License

Apache-2.0
