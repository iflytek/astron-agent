const transition = {
  promptIndex: {
    title: '提示词工程',
    search: {
      name: '任务名称',
      input: '请输入',
      status: '状态',
      unpublished: '未发布',
      published: '已发布',
    },
    table: {
      index: '序号',
      type: '类型',
      promptKey: 'Prompt KEY',
      promptName: 'Prompt名称',
      status: '状态',
      latestVersion: '最新版本',
      commitTime: '最近提交时间',
      createTime: '创建时间',
      action: '操作',
      prompt: 'prompt',
      promptGroup: 'prompt组',
      published: '已发布',
      unpublished: '未发布',
      noData: '--',
    },
    actions: {
      edit: '编辑',
      evaluate: '评测',
      delete: '删除',
      confirmDelete: '确认删除吗?',
      createPromptGroup: '创建Prompt组',
      createPrompt: '创建Prompt',
      totalData: '共有 {{total}} 条数据',
    },
    messages: {
      workflowDeleted: '工作流已被删除',
      multiParams: '工作流中输入存在多参数',
      notDebugged: '工作流未调试成功',
      noLLMNode: '工作流中没有大模型节点',
    },
  },
  createPromptModal: {
    title: {
      create: '创建Prompt',
      edit: '编辑Prompt',
    },
    fields: {
      promptKey: 'Prompt KEY：',
      promptName: 'Prompt名称：',
      promptKeyPlaceholder: '请输入Prompt KEY',
      promptNamePlaceholder: '请输入Prompt名称',
    },
    validation: {
      requiredPromptKey: '请输入Prompt KEY',
      promptKeyRule:
        '仅支持英文字母、数字、"-"、"_"、"."，且仅支持英文字母开头',
      requiredPromptName: '请输入Prompt名称',
      promptNameRule:
        '仅支持英文字母、数字、中文，"-"，"_"，"."，且仅支持英文字母、数字、中文开头',
    },
    buttons: {
      cancel: '取消',
      confirm: '确认',
      save: '保存',
    },
  },
  createPromptGroupModal: {
    title: '创建Prompt组',
    description:
      '通过构建工作流来串联多个提示词（Prompt），并开展prompt组的调试工作',
    tooltips: {
      workflowNotDebugged: '工作流未调试成功',
      noLLMNode: '工作流中没有大模型节点',
      multipleParams: '工作流中输入存在多参数',
    },
    fields: {
      promptKey: 'Prompt KEY：',
      promptName: 'Prompt组名称：',
      workflow: '工作流：',
      promptKeyPlaceholder: '请输入Prompt KEY',
      promptNamePlaceholder: '请输入Prompt组名称',
      workflowPlaceholder: '请选择工作流',
    },
    validation: {
      requiredPromptKey: '请输入Prompt KEY',
      promptKeyRule:
        '仅支持英文字母、数字、"-"、"_"、"."，且仅支持英文字母开头',
      requiredPromptName: '请输入Prompt组名称',
      promptNameRule:
        '仅支持英文字母、数字、中文，"-"，"_"，"."，且仅支持英文字母、数字、中文开头',
      requiredWorkflow: '请选择工作流',
    },
    buttons: {
      cancel: '取消',
      confirm: '确认',
    },
  },
};

export default transition;
