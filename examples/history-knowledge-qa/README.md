---
id: history-knowledge-qa
title: History Knowledge Q&A Assistant
description: A personal history advisor that answers questions about world events, cultural evolution, and key historical figures.
category: learning
features:
  - Answers open-ended questions across global history
  - Covers ancient civilizations through modern turning points
  - Ships with example prompts and a guided prologue
author: iflytek
sourceUrl: https://github.com/FenjuFu/Awesome-Astron-Workflow
dslVersion: v1
event: ""
---

# History Knowledge Q&A Assistant

A conversational agent that acts as a personal history advisor — ask it about historical events,
cultural change, or notable figures and it returns accurate, sourced answers.

## How it works

A single-turn chat workflow: **start → LLM** with a history-tutor system prompt and a curated set of
example questions (a guided prologue). No external knowledge base is required.

## Dependencies

- **Models**: a Spark chat model (credentials scrubbed — see below)
- **Plugins / skills**: none
- **Knowledge bases**: none

## Import & run

1. In Astron Agent: create a workflow → **Import** → choose `workflow.yml`.
2. Replace the `YOUR_APP_ID` placeholders with your own Spark credentials.
3. Run it.

> Credentials in the exported DSL were replaced with `YOUR_APP_ID` placeholders before publishing.
