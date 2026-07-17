# Astron Agent Workflow Examples

A community-contributed gallery of **reusable Astron Agent workflows**. Every example is a real,
importable workflow you can drop into Astron Agent, run, and adapt.

> **Examples vs. Cases** — this directory is **not** the enterprise [case studies](https://iflytek.github.io/astron-agent/cases/).
> Cases are curated, verified customer success stories maintained by the team. Examples here are
> **open community contributions**: anyone can submit a workflow via pull request.

[中文贡献指南见下方](#中文)

## What an example contains

One self-contained directory per example, named by a short kebab-case id:

```
examples/
├── README.md                 # this file — spec + contribution guide
├── TEMPLATE/                 # copy this to start a new example
│   ├── README.md             # metadata (frontmatter) + description
│   └── workflow.yml          # the exported Astron DSL
└── <example-id>/
    ├── README.md             # required — metadata + how to use
    ├── workflow.yml          # required — exported workflow DSL (.yml)
    └── preview.png           # optional — screenshot of the canvas or result
```

- **`workflow.yml`** — export it from Astron Agent (workflow → Export). The DSL already carries the
  workflow's `flowMeta` (name, description) and `flowData` (nodes/edges).
- **`README.md`** — a metadata header (YAML frontmatter) plus a human description. The frontmatter
  fields align with the gallery schema so the docs site can render each example as a card.
- **`preview.png`** — optional but recommended; a screenshot makes the gallery card far more useful.

## Metadata (README frontmatter)

```yaml
---
id: ai-resume-assistant            # unique, kebab-case, matches the directory name
title: AI Resume Assistant         # display name
description: One-sentence summary of what the workflow does.
category: productivity             # productivity | creative | learning | entertainment | health | finance | other
features:                          # 3–5 short bullet points
  - Parses a resume into structured fields
  - Scores it against a target job description
  - Suggests concrete rewrites
author: your-github-handle         # GitHub username of the contributor
sourceUrl: ""                      # optional — blog post / video / discussion that explains it
dslVersion: v1                     # the DSL version the workflow was exported with
event: ""                          # optional — e.g. "Astron Training Camp · Cohort #1"
---
```

The body below the frontmatter should cover: what it does, the nodes/skills it uses, any external
dependencies (models, plugins, knowledge bases), and how to import & run it.

## How to contribute

1. **Copy the template**: `cp -r examples/TEMPLATE examples/<your-example-id>`
2. **Add your workflow**: replace `workflow.yml` with your exported DSL, and (optionally) add `preview.png`.
3. **Fill the metadata**: edit `README.md` frontmatter + write the description.
4. **Scrub secrets** (required — see below).
5. **Open a pull request** against `main`:
   ```bash
   git checkout -b examples/<your-example-id>
   git add examples/<your-example-id>
   git commit -s -m "examples: add <your-example-id>"   # -s adds the DCO sign-off (required)
   git push origin examples/<your-example-id>
   ```

### Quality bar

An example is merged when it:

- **Imports and runs** in a current Astron Agent instance (state the version if it matters).
- **Contains no secrets.** ⚠️ Exported DSL can embed API keys, tokens, personal endpoints, OSS URLs,
  or phone numbers. **Remove or replace them with placeholders** (e.g. `YOUR_API_KEY`) before
  committing. PRs containing live credentials will be rejected.
- Has a **clear description** and lists its external dependencies (models, plugins, knowledge bases).
- Uses a **unique `id`** that matches its directory name.

## Gallery rendering (planned)

The docs site will expose an `/examples` page that reads each example's frontmatter and renders a
filterable card gallery (grouped by `category`), mirroring the existing
[Awesome-Astron-Workflow](https://github.com/FenjuFu/Awesome-Astron-Workflow) showcase. Keeping the
frontmatter schema aligned lets the two sources converge later. Until then, browse examples directly
in this directory.

---

<a id="中文"></a>

## 中文

社区共建的 **可复用 Astron Agent 工作流** 示例库。每个示例都是可直接导入、运行、二次开发的真实工作流。

> **示例 vs 案例**:本目录**不是**企业[案例](https://iflytek.github.io/astron-agent/cases/)。案例是团队维护、经核实的企业成功故事;这里的示例是**开放的社区贡献**,任何人都能通过 PR 提交工作流。

### 目录规范

一示例一目录,用短横线小写 id 命名;每个目录包含:

- **`workflow.yml`(必需)**— 从 Astron Agent 导出的工作流 DSL(工作流 → 导出)。
- **`README.md`(必需)**— YAML frontmatter 元数据(字段见上方英文表)+ 文字说明。
- **`preview.png`(可选,推荐)**— 画布或结果截图,让 gallery 卡片更直观。

### 如何贡献

1. 复制模板:`cp -r examples/TEMPLATE examples/<示例-id>`
2. 放入你导出的 `workflow.yml`(可选加 `preview.png`)
3. 填好 `README.md` 的 frontmatter 与说明
4. **清理密钥**(必需,见下)
5. 提 PR(commit 用 `-s` 加 DCO 签名)

### 合并门槛

- **能导入并运行**(必要时注明 Astron Agent 版本)
- **不含任何密钥**:⚠️ 导出的 DSL 可能内嵌 API Key、token、个人端点、OSS 地址、手机号等,提交前务必删除或替换为占位符(如 `YOUR_API_KEY`)。含真实凭据的 PR 会被拒绝。
- **说明清晰**,列出依赖的模型 / 插件 / 知识库
- **id 唯一**且与目录名一致
