const transition = {
  promptIndex: {
    title: 'Prompt Engineering',
    search: {
      name: 'Task name',
      input: 'Search',
      status: 'Status',
      unpublished: 'Unpublished',
      published: 'Published',
    },
    table: {
      index: 'No.',
      type: 'Type',
      promptKey: 'Prompt KEY',
      promptName: 'Prompt Name',
      status: 'Status',
      latestVersion: 'Latest Version',
      commitTime: 'Last Commit Time',
      createTime: 'Creation Time',
      action: 'Actions',
      prompt: 'prompt',
      promptGroup: 'prompt group',
      published: 'Published',
      unpublished: 'Unpublished',
      noData: '--',
    },
    actions: {
      edit: 'Edit',
      evaluate: 'Evaluate',
      delete: 'Delete',
      confirmDelete: 'Confirm deletion?',
      createPromptGroup: 'Create Prompt Group',
      createPrompt: 'Create Prompt',
      totalData: 'Total: {{total}} items',
    },
    messages: {
      workflowDeleted: 'Workflow has been deleted',
      multiParams: 'Multiple input parameters exist in the workflow',
      notDebugged: 'Workflow not debugged successfully',
      noLLMNode: 'No LLM node in workflow',
    },
  },
  createPromptModal: {
    title: {
      create: 'Create Prompt',
      edit: 'Edit Prompt',
    },
    fields: {
      promptKey: 'Prompt KEY:',
      promptName: 'Prompt Name:',
      promptKeyPlaceholder: 'Please enter Prompt KEY',
      promptNamePlaceholder: 'Please enter Prompt Name',
    },
    validation: {
      requiredPromptKey: 'Please enter Prompt KEY',
      promptKeyRule:
        'Only letters, numbers, "-", "_", "." are allowed, and must start with a letter',
      requiredPromptName: 'Please enter Prompt Name',
      promptNameRule:
        'Only letters, numbers, Chinese characters, "-", "_", "." are allowed, and must start with a letter, number or Chinese character',
    },
    buttons: {
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
    },
  },
  createPromptGroupModal: {
    title: 'Create Prompt Group',
    description:
      'Connect multiple prompts through workflow and conduct debugging',
    tooltips: {
      工作流未调试成功: 'Workflow not debugged successfully',
      工作流中没有大模型节点: 'No LLM node in workflow',
      工作流中输入存在多参数: 'Multiple input parameters exist in workflow',
    },
    fields: {
      promptKey: 'Prompt KEY:',
      promptName: 'Prompt Group Name:',
      workflow: 'Workflow:',
      promptKeyPlaceholder: 'Please enter Prompt KEY',
      promptNamePlaceholder: 'Please enter Prompt Group Name',
      workflowPlaceholder: 'Please select workflow',
    },
    validation: {
      requiredPromptKey: 'Please enter Prompt KEY',
      promptKeyRule:
        'Only letters, numbers, "-", "_", "." are allowed, and must start with a letter',
      requiredPromptName: 'Please enter Prompt Group Name',
      promptNameRule:
        'Only letters, numbers, Chinese characters, "-", "_", "." are allowed, and must start with a letter, number or Chinese character',
      requiredWorkflow: 'Please select workflow',
    },
    buttons: {
      cancel: 'Cancel',
      confirm: 'Confirm',
    },
  },
};

export default transition;
