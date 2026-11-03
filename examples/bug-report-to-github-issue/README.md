---
id: bug-report-to-github-issue
title: Bug Report to GitHub Issue
description: Turns a messy bug report into a clean, reproducible GitHub issue and lists what the reporter still needs to tell you.
category: productivity
features:
  - Rewrites a chat message, pasted log or hurried note as a structured GitHub issue
  - Fills title, environment, steps to reproduce, expected and actual behavior
  - Keeps error messages and logs verbatim instead of paraphrasing them
  - Marks unknown fields as "Not provided" and turns them into questions for the reporter
author: modelpath-dev
sourceUrl: ""
dslVersion: v1
event: ""
---

# Bug Report to GitHub Issue

Bug reports usually arrive as a few lines in a chat, a screenshot caption, or a log dump with
"it broke" on top. Paste that in and this workflow gives you back a GitHub issue in Markdown that
a maintainer can act on, plus a short list of questions for whatever the report left out.

Example input:

```
hey the export button does nothing on the reports page since yesterday's update,
console says TypeError: Cannot read properties of undefined (reading 'rows').
chrome on mac
```

The output has a title, summary, environment (Chrome on macOS, everything else "Not provided"),
steps to reproduce, expected and actual behavior, the `TypeError` line copied as is, and questions
such as which app version the update installed and whether it happens for every report.

## How it works

**start → LLM → end.** The user's message goes straight to one LLM node. Its system prompt fixes
the issue sections and the rules that keep the output honest:

- never invent versions, file names, commands, error text or steps;
- write "Not provided" for anything the report does not say, and ask about it under
  **Missing information**;
- copy error messages and log lines verbatim, in a code block;
- write the issue in English whatever language the report came in.

To fit your own tracker, edit the section list in the system prompt (for example add
**Severity** or **Affected users**), or swap the output format for Jira or Linear Markdown.

## Dependencies

- **Models**: any chat model. The export uses a MaaS chat model; credentials were scrubbed and the
  app id is the `YOUR_APP_ID` placeholder.
- **Plugins / skills**: none
- **Knowledge bases**: none

## Import & run

1. In Astron Agent: create a workflow → **Import** → choose `workflow.yml` from this directory.
2. Open the **Issue Writer** LLM node, pick a model you have access to, and replace `YOUR_APP_ID`
   with your own credentials if the node still shows it.
3. Run it with a bug report as input and paste the result into a new GitHub issue.

## Notes

- The workflow only formats what it is given. It does not search your code or past issues, so the
  "Missing information" questions are the part to send back to the reporter before triaging.
- A lower temperature (0.2 to 0.5) gives more consistent section wording if you run many reports.
