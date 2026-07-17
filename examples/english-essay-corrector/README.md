---
id: english-essay-corrector
title: English Essay Corrector
description: Reviews an English essay and returns corrections, scoring, and rewrite suggestions.
category: learning
features:
  - Checks grammar, spelling, and word choice
  - Gives an overall score with reasoning
  - Suggests concrete rewrites
author: iflytek
sourceUrl: https://github.com/FenjuFu/Awesome-Astron-Workflow
dslVersion: v1
event: ""
---

# English Essay Corrector

Paste an English essay and get back corrections, a score, and rewrite suggestions — a compact,
single-LLM workflow that's a good starting point for any "review-and-grade" use case.

## How it works

**start → LLM → output.** The LLM is prompted as an English writing examiner; the input essay is
passed straight through and the model returns structured feedback.

## Dependencies

- **Models**: a Spark chat model (credentials scrubbed)
- **Plugins / skills**: none
- **Knowledge bases**: none

## Import & run

1. In Astron Agent: create a workflow → **Import** → choose `workflow.yml`.
2. Replace the `YOUR_APP_ID` placeholder with your own Spark credentials.
3. Run it with an essay as input.

> Credentials in the exported DSL were replaced with placeholders before publishing.
