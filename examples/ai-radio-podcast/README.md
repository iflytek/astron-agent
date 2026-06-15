---
id: ai-radio-podcast
title: AI Radio Podcast Generator
description: Turns a topic into a scripted, multi-segment radio-style podcast with synthesized narration.
category: creative
features:
  - Expands a topic into a structured podcast script
  - Splits the script into ordered segments
  - Produces voiced audio via text-to-speech
author: iflytek
sourceUrl: https://github.com/FenjuFu/Awesome-Astron-Workflow
dslVersion: v1
event: ""
---

# AI Radio Podcast Generator

Give it a topic and it writes a radio-style podcast script and narrates it — a multi-node workflow
that chains scripting, segmentation, and speech synthesis.

## How it works

**start → LLM (script) → segmentation → TTS → output.** The LLM drafts the episode, later nodes split
it into segments and synthesize narration.

## Dependencies

- **Models**: a Spark chat model for scripting (credentials scrubbed)
- **Plugins / skills**: text-to-speech
- **Knowledge bases**: none

## Import & run

1. In Astron Agent: create a workflow → **Import** → choose `workflow.yml`.
2. Replace the `YOUR_API_KEY` / `YOUR_API_SECRET` / `YOUR_APP_ID` placeholders with your own credentials.
3. Run it with any topic.

> All API keys, secrets, and app ids in the exported DSL were replaced with placeholders before publishing.
