const translation = {
  prompt: `# Role
You are an experienced and creative Xiaohongshu copywriter with millions of fans across the network. You excel in creating unique and innovative copy.
# Task
Based on the given note topic, write a creative Xiaohongshu-style product recommendation copy. Add appropriate emoji expressions.
# Response Requirements
1. Please output in the format of title, body, and trending keywords.
2. Create the title using the "diode title method" to ensure it is appealing to the target audience.
3. Add appropriate emoji expressions.
4. Add trending keywords at the end: Create 5 - 6 trending keywords closely related to the topic for SEO purposes, presented in the format of #TrendingKeyword1 #TrendingKeyword2...
`,
  //header
  agentName: 'Agent Name',
  botStatus2: 'Released',
  botStatus3: 'Rejected',
  botStatus4: 'In Release',
  botStatus0: 'Unreleased',
  createAgent: 'Create',
  createAgentFirst: 'Click Create Agent first, then analyze',
  analyze: 'Analyze',

  // left
  defaultAvatar: 'Current avatar is default, please upload avatar',
  uploadAvatar: 'Upload Avatar',
  requiredInfoNotFilled: 'Required information not filled',
  saveSuccess: 'Save Success',
  saveFailed: 'Save Failed',
  create: 'Create',
  save: 'Save',
  agentBaseInfo: 'Basic Info',
  agentAppearanceVoice: 'Appearance and Voice',
  search: 'Search',
  config: 'Config',
  loading: 'Loading...',
  debugHistory: 'Conversation History',
  noDebugHistory: 'No debug history yet',
  currentConfigValid: 'Current config valid',
  debugHistoryPersistTip:
    'Start debugging with the current agent config. The session is saved to server-side debug history for this agent.',
  editAgentConfigTip:
    'Edit the current agent config. Saved changes apply to new debug sessions.',
  searchDebugHistory: 'Search debug history',
  searchDebugHistoryTip: 'Enter keywords to search this agent debug history',
  notSelectPrompt: 'Not selected prompt',
  completeComparison: 'Complete comparison',
  updatePublishSuccess: 'Update publish success',
  publishSuccess: 'Publish success',
  updatePublish: 'Update publish',
  publish: 'Publish',
  confirmLeavePrompt:
    'Are you sure you want to leave?\\nThe system may not save your changes.',
  settingCannotBeEmpty: 'Setting cannot be empty!',
  createAgentBeforePublish: 'Create agent first',
  inputHere: 'Input here',

  agentCategory: 'Agent Category',
  agentIntroduction: 'Agent Introduction',
  restoreDefaultDisplay: 'Restore Default Display',

  commonConfig: 'Common Config',
  promptEdit: 'Prompt Edit',
  promptComparison: 'Prompt Comparison',
  AIoptimization: 'AI Optimization',
  modelSelection: 'Model Selection',
  modelComparison: 'Model Comparison',
  sparkModel: 'Spark V4.0 Ultra',
  sparkX1Model: 'Spark X1',
  rolePlayModel: 'Role Play',
  pleaseSelectModel: 'Please select model',
  highOrderConfig: 'High Order Config',

  defaultPrompt: 'Default Prompt',

  //头像上传
  clickUpload: 'Click Upload',
  reUpload: 'Re-upload',
  onlyUploadImage: 'Only upload image',
  fileSizeCannotExceed5MB: 'File size cannot exceed 5MB',
  //AI生成
  aiGenerate: 'AI Generate',
  aiGenerateDesc:
    'Please fill in the agent name and function description to generate',
  modelComparisonDesc: 'You can compare up to four models',

  debugPreview: 'Debug Preview',
  addModel: 'Add Model',
  model: 'Model',
  clearHistory: 'Clear History',
  inputContent: 'Input Content',
  pleaseEnterContent: 'Please enter content',
  send: 'Send',
  comparePrompt: 'Compare Prompt',
  selected: 'Selected',
  select: 'Select',
  memory: {
    mem0Title: 'Cloud Memory',
    mem0Description:
      'Long-term memory service currently used for Agent conversations',
    connected: 'Connected',
    zepTitle: 'Session Memory',
    zepDescription:
      'Reserved provider slot that can reuse this settings panel later',
    langMemTitle: 'Framework Memory',
    langMemDescription:
      'Reserved provider slot that does not affect the current Mem0 settings',
    pendingConnection: 'Pending',
    apiKeyRequired: 'Please enter the Mem0 API Key',
    saveConfigFailed: 'Failed to save memory settings',
    deleted: 'Deleted',
    deleteFailed: 'Failed to delete memory',
    cleared: 'Cleared',
    clearFailed: 'Failed to clear memories',
    createAgentFirst: 'Please create the agent first',
    pendingSave: 'Pending save',
    configured: 'Configured',
    notConfigured: 'Not configured',
    highScoreHint:
      'The current threshold is high. Common Mem0 scores are around 0.1-0.4, so retrieval may return no results.',
    scoreHint:
      'Around 0.1 is recommended. Set 0 to avoid filtering low-score results.',
    service: 'Memory Service',
    futureProviderSlot: 'Future provider slot',
    mem0CloudMemory: 'Mem0 Cloud Memory',
    mem0CloudMemoryDesc:
      'Long-term memory writing, retrieval, and management for Agent conversations.',
    enabled: 'Enabled',
    disabled: 'Disabled',
    connectionConfig: 'Connection Settings',
    keyPrivacyTip:
      'The key is only used by the server and is never shown in plaintext.',
    enableMem0: 'Enable Mem0',
    enableMem0Desc:
      'When enabled, memory is written after an Agent conversation completes.',
    saved: 'Saved',
    replace: 'Replace',
    apiKeyPlaceholder: 'Enter Mem0 API Key',
    cancelReplace: 'Cancel replace',
    retrievalPolicy: 'Retrieval Policy',
    retrievalPolicyDesc:
      'Controls long-term memories injected before each Agent response.',
    autoSearch: 'Auto Retrieval',
    autoSearchDesc:
      'Search memories by the current question before each user request.',
    searchTopK: 'Results',
    minScore: 'Score Threshold',
    memoryList: 'Memory List',
    clearMemories: 'Clear Memories',
    clearConfirm: 'Clear Mem0 memories under the current agent scope?',
    clear: 'Clear',
    noMemories: 'No memories yet',
    deleteMemory: 'Delete Memory',
    deleteConfirm: 'Delete this memory?',
    delete: 'Delete',
    score: 'score',
  },

  //能力开发
  CapabilityDevelopment: {
    backgroundImage: 'Background Image',
    horizontalScreenDisplay: 'Horizontal Screen Display',
    verticalScreenDisplay: 'Vertical Screen Display',
    viewActualVerticalScreenEffect: 'View actual vertical screen effect',
    modify: 'Modify',
    upload: 'Upload',
    requireCreativeNovelty: 'Require creative novelty',
    pleaseWriteACreativeCommercialCopywriting:
      'Please write a creative commercial copywriting',
    youAreAComprehensiveCopywriter: 'You are a comprehensive copywriter',
    selectPronouncer: 'Select Pronouncer',
    pleaseFillInAgentNameFunctionDescriptionAndAgentInstruction:
      'Please fill in the agent name, function description, and agent instruction',
    generateFailedPleaseTryAgainLater:
      'Generate failed, please try again later!',
    capability: 'Capability',
    internetSearch: 'Internet Search',
    AIDraw: 'AI Draw',
    codeGeneration: 'Code Generation',
    officialPlugins: 'Official Plugins',
    personalPlugins: 'Personal Plugins',
    knowledgeBase: 'Knowledge Base',
    addKnowledgeBase: 'Add Knowledge Base',
    selectToAssociateTheDataset: 'Select to associate the dataset',
    refresh: 'Refresh',
    personalVersion: 'Personal Version',
    stardust: 'Stardust',
    spark: 'Spark',
    character: 'Character',
    youHaveNotCreatedAnyDatasets: 'You have not created any datasets',
    createNewDataset: 'Create New Dataset',
    cancel: 'Cancel',
    confirm: 'Confirm',
    goCreate: 'Go Create',
    addDataset: 'Add Dataset',
    characterCount: 'Character Count',
    conversationEnhancement: 'Conversation Enhancement',
    openingStatement: 'Opening Statement',
    pleaseFillInIntroductionAndName: 'Please fill in introduction and name',
    aiGenerated: 'AI Generated',
    generating: 'Generating',
    pleaseEnterOpeningStatement: 'Please enter opening statement',
    inputExample: 'Input Example',
    femaleBabyWithSurnameZhang: 'Female baby with surname Zhang',
    nameWithSurnameSong: 'Name with surname Song',
    liNameWithSurname: 'Li name with surname',
    roleSound: 'Role Sound',
    supportMultiRoundConversation: 'Support Multi Round Conversation',
    iHaveAgreed: 'I have agreed',
    xunfeiOpenPlatformServiceAgreement:
      'Xunfei Open Platform Service Agreement',
    privacyAgreement: 'Privacy Agreement',
    personality: 'Character Personality',
    personalityInfo: 'Personality Info',
    scenarioInfo: 'Scenario Info',
    personalityLibrary: 'Premium Personality Library',
    personalityDescription: 'Please enter character personality',
    aiGenerate: 'AI Generate',
    aiPolish: 'AI Polish',
    companionScenario: 'Companion Scenario',
    trainingScenario: 'Training Scenario',
    companionScenarioDesc:
      'Suitable for casual companionship and entertainment',
    trainingScenarioDesc:
      'Suitable for interviews, work, and learning practice',
    scenarioDescription: 'Content should be within 500 words',
    personalityLibraryTitle: 'Premium Personality Library',
    personalityDetail: 'Detail',
    back: 'Back',
    select: 'Select',
    imageLoadError: 'Image load failed',
    // AI personality parameter validation prompts
    aiPersonalityBotNameRequired: 'Please fill in the agent name',
    aiPersonalityBotTypeRequired: 'Please select the agent category',
    aiPersonalityBotDescRequired: 'Please fill in the agent description',
    aiPersonalityPromptRequired: 'Please fill in the agent prompt',
    personalityRequired: 'Please enter character personality information',
    sceneInfoRequired: 'Please enter scene description information',
  },
  promptTry: {
    promptTry: 'Please complete the verification',
    pluginNeedUserAuthorizationInfo:
      'Plugin needs user authorization information',
    answerPleaseTryAgainLater: 'Answer in progress, please try again later',
    pleaseEnterQuestion: 'Please enter the question',
    end: 'End',
    networkError:
      'Network seems to have a problem, you can refresh the page to try again.',
    youHaveNotUploadedDescriptionFileOrInterfaceDocument:
      'You have not uploaded the description file or interface document',
    youUploadedInterfaceDocumentButItHasNotBeenVerified:
      'You uploaded the interface document but it has not been verified',
    pleaseUploadDescriptionFileAndInterfaceDocumentAndVerify:
      'Please upload the description file and interface document and verify',
    pleaseUploadInterfaceDocumentAndVerify:
      'Please upload the interface document and verify',
    stopOutput: 'Stop',
    answerInProgress: 'Answer in progress...',
    hereIsTheAgentName: 'Here is the agent name',
    hereIsTheAgentIntroduction: 'Here is the agent introduction',
    clearHistory: 'Clear History',
    send: 'Send',
  },
};

export default translation;
