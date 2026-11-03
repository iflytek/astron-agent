---
id: memcode-memory-search
title: Memcode Memory Search
description: Retrieve approved personal memory from Memcode through an Astron MCP workflow node.
category: productivity
features:
  - Searches selected memories across sessions
  - Uses an external Streamable HTTP MCP server
  - Keeps memory access opt-in
author: vivekgupta-memcode
sourceUrl: https://github.com/iflytek/astron-agent/issues/1684
dslVersion: v1
event: ""
---

# Memcode Memory Search

This example passes a user query from the Start node to Memcode's
`search_memories` tool through Astron Agent's MCP node, then returns the
tool result. It does not save conversation transcripts or run automatically
on every message.

## Status

This is a draft integration example. Astron Agent currently cannot complete
Memcode's OAuth sign-in for a remote MCP server. Its Bearer credential support
is being developed in [#1663](https://github.com/iflytek/astron-agent/pull/1663).
Memcode's hosted MCP accepts OAuth access tokens, which expire and require
refresh. A static API key must not be placed in this workflow or sent to the
hosted MCP endpoint. Until Astron can obtain and refresh a user-scoped OAuth
token, this workflow cannot run end to end against the hosted endpoint.

## How it works

**Start → MCP `search_memories` → End.** The MCP node uses
`https://mcp.memcode.in/mcp`. It sends the current query with
`mode: memories` and `top_k: 5`. Memcode derives the memory owner from the
authenticated caller; no user ID is supplied by the workflow.

## Dependencies

- **Models**: none
- **Plugins / skills**: Astron Agent's Streamable HTTP MCP client and
  [Memcode MCP](https://memcode.in/docs?product=mcp)
- **Knowledge bases**: none
- **Authentication**: a user-scoped OAuth flow with token refresh is required.
  This is not yet provided by Astron Agent's MCP client.

## Import and run

1. In Astron Agent, create a workflow and import `workflow.yml`.
2. Register the Memcode MCP URL and select `search_memories` when Astron's
   MCP client supports the required OAuth sign-in and token refresh.
3. Run the workflow with a query such as “What writing style did I choose?”
4. Confirm the returned memory belongs to the authenticated user.

Do not paste an API key or an expiring OAuth access token into the exported DSL.
Do not run this against another user's account. This example is for explicit
retrieval only; users decide separately what to save to Memcode.
