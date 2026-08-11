---
name: 🌸 HER Hack-Astron 出题
about: 社区合作方 / 公益·行业组织 / 开源社区 用于发布一期 HER Hack-Astron 赛题
title: 'HER Hack-Astron #出题｜赛题名称'
labels: ['HER Hack-Astron']
---

<!--
本模板供 HER Hack-Astron 合作方出题使用，结构参考首期赛题 #1482。
使用方式：把下方 {{...}} 占位内容替换为你的赛题信息，删除本段说明和其他说明性注释后发布。
出题 / 合作 / 发奖咨询：ifly_opensource@iflytek.com（或企业微信小助手，见文末）。
-->

> **提交后请等待赛题确认：** 新建 Issue 时请保留标题格式 `HER Hack-Astron #出题｜赛题名称`。Issue 提交后仅作为出题申请，须由 @FenjuFu 审核、确定期号并将标题改为 `HER Hack-Astron #期号｜赛题名称` 后，方成为正式赛题。
>
> **关联活动标签：** 创建出题 Issue 时请关联 `HER Hack-Astron` 标签。通过本模板创建时会自动添加该标签，无需手动选择；如果提交者看不到标签入口，则由仓库维护者补充。

围绕 **{{场景关键词 A}}** 与 **{{场景关键词 B}}** 场景，基于 Astron Agent 开发一个可运行、可演示、可复用的智能体，并通过 PR 提交到仓库 `examples/` 目录。

欢迎你把创意做成真正可导入的工作流，帮助更多开发者快速复用和二次开发。

### 出题方 / 命题背景

- 出题组织：{{组织名称，如高校 / 公益组织 / 行业组织 / 开源社区}}
- 命题背景：{{一句话说明为什么出这道题、想解决什么真实问题}}

## 赛题方向

请围绕以下主题之一或组合方向进行创作：

- {{方向 1}}
- {{方向 2}}
- {{方向 1 + 方向 2 的融合场景}}

### 参考方向示例

- {{示例智能体 1}}
- {{示例智能体 2}}
- {{示例智能体 3}}
- {{面向特定人群（青少年 / 职场人 / 独居人群 / 老人等）的场景}}

不限制具体实现形式，但需与赛题方向明确相关。

## 参赛要求

### 参赛方式

自带电脑即可参赛，可使用以下任一版本完成作品：

1. 本地部署的 Astron Agent 开源版
2. 云端部署的开源版本：<https://astron-agent-nginx.zeabur.app/>
3. SaaS 版本：<https://agent.xfyun.cn/agentbuilder>

### 组队要求

- 以团队形式参赛，建议 1-3 人组队，每队提交 1 个作品
- **唯一硬性门槛：本 PR 代码改动记录中，女性贡献者占比 ≥ 50%，方为有效参与**
  - 不要求全员女性，也不限制男性参与，重在提升女性在 AI 开源中的**参与率**
  - 占比以 PR 中实际有 commit / `Co-authored-by:` 记录的贡献者为准，挂名不计入
  - 女性身份以 GitHub Profile 公开展示的代词 **she/her** 为准，无需提交任何隐私材料

## 提交方式

请将作品提交到本仓库的 `examples/` 目录，并通过 Pull Request 方式提交。

提交路径：
- <https://github.com/iflytek/astron-agent/tree/main/examples>

### 提交规则

1. Fork 本项目
2. 基于 `examples/TEMPLATE` 创建你的作品目录
3. 补充工作流文件与说明文档（让每位实际贡献者都在 commit / `Co-authored-by:` 中留下代码改动记录）
4. 发起 PR

## PR 标题建议

```txt
[HER Hack-Astron #期号] 智能体名称 + 最亮点功能
```

## PR 描述建议包含

- 使用的产品版本
- 实现的智能体功能
- 适用场景 / 目标用户
- 是否依赖模型、插件、知识库或外部服务
- 演示截图或结果说明
- 队伍名称 + 有代码改动记录的贡献者（@GitHub 账号，女性成员标注 she/her）+ 女性贡献者占比

## 作品目录建议

请在 `examples/` 下新增一个独立目录，例如：

```txt
examples/
└── your-agent-name/
    ├── README.md
    ├── workflow.yml
    └── preview.png   # 可选，建议提供
```

其中：

- `workflow.yml`：从 Astron Agent 导出的工作流 DSL
- `README.md`：作品说明，建议写清楚功能、依赖、使用方式
- `preview.png`：可选，建议附上工作流画布或效果截图

## 评选标准

### 1. 技术实现难度

版本选择的得分优先级如下：

1. 本地部署的 Astron Agent 开源版
2. 云端部署的开源版本：<https://astron-agent-nginx.zeabur.app/>
3. SaaS 版本：<https://agent.xfyun.cn/agentbuilder>

### 2. 智能体功能的实用性、体验与创新性

重点关注：

- 是否真正解决场景问题
- 交互体验是否自然、完整
- 是否有创新设计
- 是否便于复用与扩展

<!-- 出题方可在此追加与本赛题相关的专项评分维度（如公益价值、行业契合度等）。 -->

## 奖项设置

### 优胜奖（1 名）

- 现金奖励：500 元
- 荣誉称号：HER Hack-Astron Weekly Champion

### 优秀贡献奖（若干）

- 奖励内容：Astron 周边礼包

奖品示例：

- 电子产品
- 帆布袋
- 虚拟会员
- Token
- 咖啡券
- ......

<!-- 获奖者名单公布后，请通过邮箱 ifly_opensource@iflytek.com 或企业微信小助手发送领奖信息。 -->

## 备赛资料

- 教学视频：<https://www.aidaxue.com/course/search?search=astron>
- 项目文档：<https://github.com/iflytek/astron-agent>
- 在线答疑：<https://www.awesome-astron-workflow.dev/chat>
- 开源智能体参考：<https://www.awesome-astron-workflow.dev/#workflows>
- 在线智能体参考：<https://agent.xfyun.cn/agentbuilder>
- 群聊支持：<https://github.com/iflytek/astron-agent/blob/main/docs/imgs/WeCom_Group.png>

## 注意事项

- 请确保提交内容与赛题方向相关
- 请勿提交包含真实密钥、Token、账号、私有地址等敏感信息的工作流
- 请保证作品可导入、可复现、可说明
- 作品说明越完整，越有助于评审和社区复用

欢迎大家提交有温度、有创意、能落地的智能体作品。

---

## 联系与领奖方式

- 出题 / 合作咨询邮箱：ifly_opensource@iflytek.com
- 获奖者领奖：名单公布后，通过上述邮箱或企业微信小助手发送领奖信息
- 企业微信交流群二维码：<https://github.com/iflytek/astron-agent/blob/main/docs/imgs/WeCom_Group.png>

