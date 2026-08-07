# 国际化 (i18n) 实现文档

## 概述

本项目使用 `react-i18next` 实现国际化，支持中文 (zh-ZH) 和英文 (en-En) 两种语言。经过重构，现在采用更高效的翻译键复用机制。

## 文件结构

```
src/locales/
├── zh-ZH/
│   ├── workflow.ts          # 中文翻译文件
│   └── index.ts             # 中文语言配置
├── en-En/
│   ├── workflow.ts          # 英文翻译文件
│   └── index.ts             # 英文语言配置
└── README.md               # 本文档
```

## 翻译键结构

### 1. 通用翻译键 (workflow.nodes.common)

所有节点都可以使用的通用翻译键，避免重复定义：

```typescript
workflow.nodes.common = {
  // 基础UI元素
  selectPlaceholder: '请选择',
  inputPlaceholder: '请输入',
  outputPlaceholder: '输出',
  input: '输入',
  output: '输出',
  reference: '引用',
  add: '添加',

  // 参数相关
  parameterName: '参数名',
  parameterValue: '参数值',
  variableName: '变量名',
  variableType: '变量类型',
  description: '描述',
  required: '是否必要',

  // 操作相关
  referenceVariable: '引用变量',
  addBranch: '添加分支',
  addOption: '添加选项',
  addIntentKeyword: '添加意图关键字',
  addSubItem: '添加子项',
  addPlugin: '添加插件',
  addAddress: '添加地址',

  // 提示和警告
  inputTest: '输入测试',
  outputResult: '输出结果',
  maxAddWarning: '最多添加30个插件或者MCP!',
  pluginLimitTip:
    '支持在已发布列表里同时勾选并添加多个插件或 MCP，最多添加 30 个。',
  mcpServerTip: '支持自定义添加MCP服务器地址，上限3个',
  knowledgeTypeTip: '知识库节点仅支持添加同类型文件',

  // 占位符文本
  variableDescriptionPlaceholder: '请输入变量的作用的描述语句',
  contentPlaceholder: '请输入内容，可以使用{{变量名}}方式引用输入参数',

  // 意图相关
  intentDescription: '意图描述',
};
```

### 2. 节点特定翻译键

每个节点只保留其特有的翻译键，通用文本使用 `common` 中的键：

#### 示例：LargeModelNode

```typescript
workflow.nodes.largeModelNode = {
  type: '大模型',
  prompt: '提示词',
  promptLibrary: '提示词库',
  systemPrompt: '系统提示词',
  userPrompt: '用户提示词',
  chatHistory: '对话历史', // 如果其他节点也用到，应该移到common
  outputFormat: '输出格式：',
  systemPromptPlaceholder: '大模型人设设置...',
  userPromptPlaceholder: '大模型人设设置...',
};
```

## 已国际化的组件

### 1. 核心工作流组件

#### InputParams (`src/components/WorkFlow/InputParams/index.tsx`)

- **使用的翻译键**: `workflow.nodes.common.*`
- **功能**: 处理节点输入参数配置
- **翻译内容**: 参数名、参数值、输入/引用选项、添加按钮

#### OutputParams (`src/components/WorkFlow/OutputParams/index.tsx`)

- **使用的翻译键**: `workflow.nodes.common.*`
- **功能**: 处理节点输出参数配置
- **翻译内容**: 参数名、变量名、参数值、变量类型、描述、是否必要、添加按钮

#### ModelSelect (`src/components/WorkFlow/ModelSelect/index.tsx`)

- **使用的翻译键**: `workflow.nodes.modelSelect.*`
- **功能**: 模型选择组件
- **翻译内容**: 回答模式、选择更多模型、模型思考过程

#### ModelParams (`src/components/WorkFlow/ModelSelect/components/ModelParams.tsx`)

- **使用的翻译键**: `workflow.nodes.modelSelect.*`
- **功能**: 模型参数设置组件
- **翻译内容**: 模型参数设置

#### FlowHeader (`src/pages/SpacePage/FlowDetail/components/FlowHeader.tsx`)

- **使用的翻译键**: `workflow.nodes.header.*`
- **功能**: 工作流详情页面头部组件
- **翻译内容**: 预览中、编辑中、已自动保存、试运行中、运行完成、运行失败、编排、分析

#### MultipleCanvasesTip (`src/pages/SpacePage/FlowDetail/components/MultipleCanvasesTip.tsx`)

- **使用的翻译键**: `workflow.nodes.multipleCanvasesTip.*`
- **功能**: 多窗口提示组件
- **翻译内容**: 在当前窗口继续编辑、确认、取消、多窗口提示信息、继续编辑

#### FlowArrange (`src/pages/SpacePage/FlowDetail/FlowArrange/index.tsx`)

- **使用的翻译键**: `workflow.nodes.header.*`
- **功能**: 工作流编排页面主组件
- **翻译内容**: 对话、导出、对比调试、历史版本、高级配置、调试、发布、更新发布、调试通过后即可发布、发布前需要进行调试、取消

#### OperationResult (`src/components/Drawer/WorkFlow/OperationResult.tsx`)

- **使用的翻译键**: `workflow.nodes.operationResult.*`
- **功能**: 操作结果抽屉组件
- **翻译内容**: 异常节点、重新运行、异常子节点

#### FlowChatResult (`src/components/Drawer/WorkFlow/FlowChatResult.tsx`)

- **使用的翻译键**: `workflow.nodes.flowChatResult.*`
- **功能**: 流程聊天结果抽屉组件
- **翻译内容**: 运行结果、收起、输入、原始输出、输出、回答内容、暂无运行结果、复制成功

#### Store Files

- **useFlowStore.tsx** (`src/store/useFlowStore.tsx`)
  - **使用的翻译键**: `workflow.nodes.common.*`
  - **功能**: 工作流状态管理
  - **翻译内容**: 固定节点

- **useIteratorFlowStore.tsx** (`src/store/useIteratorFlowStore.tsx`)
  - **使用的翻译键**: `workflow.nodes.common.*`
  - **功能**: 迭代工作流状态管理
  - **翻译内容**: 开始和结束节点不能删除

- **useFlowsManager.tsx** (`src/store/useFlowsManager.tsx`)
  - **使用的翻译键**: `workflow.nodes.flow.*`
  - **功能**: 工作流管理器状态管理
  - **翻译内容**: 意图数字列表、节点校验失败消息、循环依赖检测消息、条件判断消息等

- **SelectPrompt.tsx** (`src/components/Modal/WorkFlow/SelectPrompt.tsx`)
  - **使用的翻译键**: `workflow.nodes.selectPrompt.*`
  - **功能**: 选择提示词模板弹窗
  - **翻译内容**: 弹窗标题、标签页、搜索框、按钮文本、状态文本等

- **CodeIDEA.tsx** (`src/components/Drawer/WorkFlow/CodeIDEA.tsx`)
  - **使用的翻译键**: `workflow.nodes.codeIDEA.*`
  - **功能**: 代码IDE编辑器抽屉组件
  - **翻译内容**: 语言标签、Python包信息、AI代码功能、输入测试、输出结果、运行状态等

- **ParameterModal.tsx** (`src/components/Modal/WorkFlow/ParameterModal.tsx`)
  - **使用的翻译键**: `workflow.nodes.parameterModal.*` 和 `common.*`
  - **功能**: 参数配置模态框组件
  - **翻译内容**: Top K参数配置、描述文本、保存/取消按钮（使用common中的通用翻译）

- **RelatedKnowledgeModal.tsx** (`src/components/Modal/WorkFlow/RelatedKnowledgeModal.tsx`)
  - **使用的翻译键**: `workflow.nodes.relatedKnowledgeModal.*`
  - **功能**: 相关知识库选择模态框组件
  - **翻译内容**: 模态框标题、版本选择、排序选项、搜索框、按钮文本、提示信息等

- **reactflowUtils.ts** (`src/utils/reactflowUtils.ts`)
  - **使用的翻译键**: `workflow.nodes.validation.*`
  - **功能**: 工作流工具函数库
  - **翻译内容**: 各种验证错误消息，包括值不能为空、值不能重复、URL格式错误、变量命名冲突、知识库验证、代码验证等
  - **注意**: 节点类型名称（如 '工具'、'大模型'、'问答节点' 等）保持中文不变，因为这些是系统内部标识符

### 2. 自定义节点

- **StartNode** (`src/custom-nodes/StartNode/index.tsx`)
  - **使用的翻译键**: `workflow.nodes.startNode.*`
  - **功能**: 开始节点
  - **翻译内容**: 节点类型、输入参数等

- **EndNode** (`src/custom-nodes/EndNode/index.tsx`)
  - **使用的翻译键**: `workflow.nodes.endNode.*`
  - **功能**: 结束节点
  - **翻译内容**: 节点类型、回答模式、返回参数等

- **LargeModelNode** (`src/custom-nodes/LargeModelNode/index.tsx`)
  - **使用的翻译键**: `workflow.nodes.largeModelNode.*`
  - **功能**: 大模型节点
  - **翻译内容**: 节点类型、提示词、系统提示词等

- **AgentNode** (`src/custom-nodes/AgentNode/index.tsx`)
  - **使用的翻译键**: `workflow.nodes.agentNode.*`
  - **功能**: 智能体节点
  - **翻译内容**: 节点类型、提示词、MCP服务器配置等

- **ToolNode** (`src/custom-nodes/ToolNode/index.tsx`)
  - **使用的翻译键**: `workflow.nodes.common.*`
  - **功能**: 工具节点
  - **翻译内容**: 输入、输出、引用等通用标签

- **KnowledgeNode** (`src/custom-nodes/KnowledgeNode/index.tsx`)
  - **使用的翻译键**: `workflow.nodes.knowledgeNode.*`
  - **功能**: 知识库节点
  - **翻译内容**: 节点类型、知识库、参数设置等

- **KnowledgeProNode** (`src/custom-nodes/KnowledgeProNode/index.tsx`)
  - **使用的翻译键**: `workflow.nodes.knowledgeProNode.*`
  - **功能**: 知识库 Pro 节点
  - **翻译内容**: 节点类型、策略选择、知识库、参数设置、回答规则等

- **KnowledgeProNode/ParameterModal** (`src/custom-nodes/KnowledgeProNode/components/ParameterModal.tsx`)
  - **使用的翻译键**: `workflow.nodes.knowledgeProNode.parameterModal.*` 和 `common.*`
  - **功能**: 知识库 Pro 节点参数配置模态框
  - **翻译内容**: Top K 参数配置、描述文本、示例说明、保存/取消按钮（使用common中的通用翻译）

- **TextJoinerNode** (`src/custom-nodes/TextJoinerNode/index.tsx`)
  - **使用的翻译键**: `workflow.nodes.textJoinerNode.*`
  - **功能**: 文本拼接节点
  - **翻译内容**: 节点类型、拼接规则、分隔符等

- **MessageNode** (`src/custom-nodes/MessageNode/index.tsx`)
  - **使用的翻译键**: `workflow.nodes.messageNode.*`
  - **功能**: 消息节点
  - **翻译内容**: 节点类型、回答内容、格式等

- **QuestionAnswerNode** (`src/custom-nodes/QuestionAnswerNode/index.tsx`)
  - **使用的翻译键**: `workflow.nodes.questionAnswerNode.*`
  - **功能**: 问答节点
  - **翻译内容**: 节点类型、问题占位符、输入、提问内容、回答模式、直接回复、选项回复、设置选项内容、从用户回复中提取字段等

- **QuestionAnswerNode/OutputParams** (`src/custom-nodes/QuestionAnswerNode/components/OutputParams.tsx`)
  - **使用的翻译键**: `workflow.nodes.questionAnswerNode.*`
  - **功能**: 问答节点输出参数组件
  - **翻译内容**: 变量名、变量类型、描述、参数抽取、默认值、是否必要、添加、占位符文本等

- **QuestionAnswerNode/FixedOptions** (`src/custom-nodes/QuestionAnswerNode/components/FixedOptions.tsx`)
  - **使用的翻译键**: `workflow.nodes.questionAnswerNode.*`
  - **功能**: 问答节点固定选项组件
  - **翻译内容**: 选项、选项类型、选项内容、添加选项、其他、其他选项描述、占位符文本等

- **QuestionAnswerNode/AnswerSettings** (`src/custom-nodes/QuestionAnswerNode/components/AnswerSettings.tsx`)
  - **使用的翻译键**: `workflow.nodes.questionAnswerNode.*`
  - **功能**: 问答节点回答设置组件
  - **翻译内容**: 回答设置、用户是否必须回答、对话超时设置、提示信息等

- **DecisionMakingNode** (`src/custom-nodes/DecisionMakingNode/index.tsx`)
  - **使用的翻译键**: `workflow.nodes.decisionMakingNode.*`
  - **功能**: 决策节点
  - **翻译内容**: 节点类型、意图、意图描述、默认意图、高级配置等

- **DecisionMakingNode/InputParams** (`src/custom-nodes/DecisionMakingNode/components/InputParams.tsx`)
  - **使用的翻译键**: `workflow.nodes.common.*`
  - **功能**: 决策节点输入参数组件
  - **翻译内容**: 参数名、参数值、输入、引用、添加等

- **DecisionMakingNode/NodeTransformationModal** (`src/custom-nodes/DecisionMakingNode/components/NodeTransformationModal.tsx`)
  - **使用的翻译键**: `workflow.nodes.decisionMakingNode.*`
  - **功能**: 决策节点切换弹窗
  - **翻译内容**: 决策节点切换、确认消息、确认、取消等

- **IfElseNode** (`src/custom-nodes/IfElseNode/index.tsx`)
  - **使用的翻译键**: `workflow.nodes.ifElseNode.*`
  - **功能**: 分支器节点
  - **翻译内容**: 节点类型等

- **IteratorNode** (`src/custom-nodes/IteratorNode/index.tsx`)
  - **使用的翻译键**: `workflow.nodes.iteratorNode.*`
