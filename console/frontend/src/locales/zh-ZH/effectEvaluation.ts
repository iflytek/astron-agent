export default {
  // 新增的搜索相关key
  confirmSubmitScoringResults: '确认提交评分结果',
  pleaseSelectDimensionScore: '请选择维度得分',
  pleaseSelectNode: '请选择节点',
  manualEvaluationTitle: '人工测评',
  allModes: '全部模式',
  manualEvaluation: '人工测评',
  automaticEvaluation: '自动测评',
  allTypes: '全部类型',
  agentInstructionType: '智能体-指令型',
  agentWorkflow: '智能体-工作流',
  prompt: '提示词',
  evaluationMode: '测评模式',
  evaluationType: '测评类型',
  taskName: '任务名称',
  createTask: '创建任务',
  debugRequiredForTaskCreation: '创建任务需要调试',
  debugRequiredDescription: '当前工作流未调试成功，请先调试后再创建任务',

  // 新增的头部导航相关key
  evaluationTask: '测评任务',
  evaluationSetManagement: '测评集管理',
  evaluationDimensionsManagement: '测评维度管理',

  // 新增的表格相关key
  unknownMode: '未知模式',
  manualAndAutomaticEvaluation: '人工测评、自动测评',
  unknownCombination: '未知组合',
  running: '运行中',
  completed: '已完成',
  runFailed: '运行失败',
  marked: '已标注',
  manualScore: '人工评分',
  pendingScore: '待评分',
  terminating: '终止中',
  creating: '创建中',
  pending: '待处理',
  details: '详情',
  scoring: '评分',
  terminate: '终止',
  more: '更多',
  confirmRecreate: '确认重新创建',
  reservedMode: '预留模式',
  confirmDeleteEvaluationTask: '确认删除该测评任务',
  currentTaskRunning: '当前任务运行中',
  scoringCompleted: '评分已完成',
  currentTaskRunFailed: '当前任务运行失败',
  currentTaskPendingScore: '当前任务待评分',
  currentTaskTerminating: '当前任务终止中',
  currentTaskPaused: '当前任务已暂停',
  terminateOperationWarning: '终止操作警告',
  totalDataItems: '共 {{count}} 项数据',

  // 新增的基本表格键
  status: '状态',
  createTime: '创建时间',
  operations: '操作',
  evaluationSet: '测评集',
  evaluationObject: '测评对象',
  taskMode: '任务模式',

  // 新增的调试预览相关key
  promptConfiguration: 'prompt配置',
  promptText: 'prompt：',
  rerun: '重新运行',
  clickRunToDisplay: '点击运行后展示',
  runFailedPleaseTryAgain: '运行失败，请尝试重新运行',
  displayScoreAndReasonAfterRun: '运行后展示得分分数及得分原因',

  // 新增的缺失key
  debugPreview: '调试预览',
  currentModel: '当前模型',
  aiOptimize: 'AI优化',
  userInput: '用户输入',
  run: '运行',
  thinking: '思考中',
  evaluationResult: '测评结果',
  score: '分',
  scoreReason: '得分原因',
  pleaseEnterDimensionNameForOptimization:
    '为了更精准地为您优化内容，请先输入具体的维度名称',
  workflowNotDebuggedSuccessfully: '工作流未调试成功',
  currentVersionNotPublishedSuccessfully: '当前版本发布未成功',
  previous: '上一条',
  next: '下一条',

  // 新增testData相关key
  testData: {
    serialNumber: '序号',
    sid: '序号',
    question: '问题',
    answer: '答案',
    moreAnswer: '答案_{{key}}',
    expectedAnswer: '期望答案',
    performanceTimeCost: '性能耗时',
    firstFrameCost: '首帧耗时',
    status: '状态',
    f1Score: 'F1分数',
    precision: '精确率',
    recall: '召回率',
    poor: '差',
    general: '一般',
    better: '较好',
    excellent: '优秀',
    all: '全部',
    terminated: '已终止',
    effectScore: '人工打分',
    scoringFailed: '评分失败',
    notScored: '未评分',
    scoringReason: '评分原因',
    notFilled: '未填写',
    intelligentScoring: '智能评分',
    intelligentScoringReason: '智能评分原因',
    manualScoring: '人工评分',
    manualScoringReason: '人工评分原因',
    evaluationDimension: '测评维度',
    operations: '操作',
    view: '查看',
    alreadyFirstDataOnThisPage: '已经是本页第一条数据',
    alreadyLastDataOnThisPage: '已经是本页最后一条数据',
    totalDataItems: '共 {{count}} 项数据',
    previous: '上一页',
    next: '下一页',
    enterScoringReason: '请输入评分原因',
  },

  dimensions: {
    create: {
      // 页面标题和导航
      newDimension: '新建维度',
      dimensionName: '维度名称：',
      dimensionDescription: '维度描述：',
      promptPreview: 'prompt预览：',
      promptPreviewAndEdit: 'prompt预览与编辑',

      // 表单验证消息
      pleaseEnterDimensionName: '请输入维度名称',
      dimensionNameLengthLimit: '维度名称长度不能超过50个字符',
      pleaseEnter: '请输入',
      pleaseEnterDimensionDescription: '请输入维度描述',

      // 场景类型相关
      sceneType: '场景类型：',
      sceneTypeSelection: '场景类型选择',
      sceneTypeSelectionDesc:
        '如果一个维度适用于多个任务场景，场景类型支持多选，最多选择3个',
      pleaseSelectEvaluationScene: '请选择测评场景',
      newType: '新建类型',
      pleaseEnterType: '请输入类型',
      sceneType1: '场景类型1',
      evaluationSceneNameExists: '测评场景名称已存在!!!',

      // 调试和AI优化
      debugPreview: '调试预览',
      aiOptimize: 'AI优化',
      debugPreviewSuccessRequired: '调试预览成功后才能提交',
      promptCannotBeEmpty: 'prompt不能为空！',
      enterDimensionNameForOptimization:
        '为了更精准地为您优化内容，请先输入具体的维度名称',
      debugPreviewSuccessCallback: '调试预览成功回调',

      // 按钮文本
      cancel: '取消',
      submit: '提交',

      // 其他
      noSubVariables: '该变量无子变量',
    },
    search: {
      // 搜索表单
      selectSceneType: '选择场景类型',
      pleaseEnterEvaluationDimensionName: '请输入评估维度名称',

      // 按钮文本
      reset: '重置',
      query: '查询',
      batchImport: '批量导入',
      newDimension: '新建维度',
    },
    table: {
      // 表格列标题
      serialNumber: '序号',
      evaluationDimensionName: '评估维度名称',
      sceneType: '场景类型',
      dimensionDescription: '维度描述信息',
      updateTime: '更新时间',
      creator: '创建人',
      operation: '操作',

      // 操作按钮
      viewDetails: '查看详情',
      edit: '编辑',
      delete: '删除',

      // 确认对话框
      confirmDeleteDimension: '确认删除该测评维度吗？',
      confirm: '确认',
      cancel: '取消',

      // 其他文本
      official: '官方',
      totalDataCount: '共 {{total}} 项数据',
    },
    import: {
      // 模态框标题
      title: '测评维度',

      // 文件上传相关
      downloadTemplate: '下载模板',
      dragFileHere: '拖拽文件至此，或者',
      selectFile: '选择文件',
      fileFormatDescription: '文件格式为XLSX，文件大小支持2MB。',

      // 文件验证消息
      fileSizeExceeded: '上传文件大小不能超出2M！',
      pleaseUploadXlsxFile: '请上传.xlsx文件',

      // 上传成功消息
      importSuccess: '导入成功',

      // 按钮文本
      cancel: '取消',
      confirm: '确定',
    },
  },
  dataset: {
    search: {
      // 搜索表单
      evaluationSetName: '测评集名称',
      evaluationSetNamePlaceholder: '测评集名称',
      trainingSetName: '训练集名称',
      trainingSetNamePlaceholder: '训练集名称',
      associatedAppName: '关联应用名称：',
      associatedAppNamePlaceholder: '请输入',

      // 按钮文本
      reset: '重置',
      query: '查询',
      newEvaluationSet: '新建测评集',
    },
    table: {
      // 表格列标题
      serialNumber: '序号',
      evaluationSetName: '测评集名称',
      trainingSetName: '训练集名称',
      associatedAppName: '关联应用名称',
      latestVersion: '最新版本',
      versionCount: '版本数',
      versionUpdateTime: '版本更新时间',
      operation: '操作',

      // 操作按钮
      viewDetails: '查看详情',
      download: '下载',
      addVersion: '新增版本',
      delete: '删除',

      // 确认对话框
      confirmDeleteEvaluationSet: '确认删除该测评集吗？',
      confirmDeleteTrainingSet: '确认删除该训练集吗？',
      confirm: '确认',
      cancel: '取消',

      // 其他文本
      totalDataCount: '共 {{total}} 项数据',
    },
    modal: {
      // 模态框标题
      download: '下载',

      // 版本选择相关
      selectEvaluationSetVersion: '选择测评集版本',
      selectTrainingSetVersion: '选择训练集版本',
      pleaseSelectDownloadVersion: '请选择下载版本',
      selectAll: '全选',

      // 按钮文本
      cancel: '取消',
      confirm: '确定',
    },
    create: {
      // 页面标题
      batchImport: '批量导入',
      newVersion: '新建版本',
      newEvaluationSet: '新建测评集',

      // 表单字段
      evaluationSetName: '测评集名称：',
      evaluationSetNamePlaceholder: '请填写测评集名称',
      pleaseEnterEvaluationSetName: '请输入测评集名称',
      versionName: '版本名称：',
      versionNamePlaceholder: '请填写测评集版本名称',
      pleaseEnterVersionName: '请输入版本名称',
      versionDescription: '版本说明：',
      versionDescriptionPlaceholder: '请填写版本说明',
      dataUpload: '数据上传：',
      pleaseSelectDataUpload: '请选择数据上传',

      // 文件上传相关
      downloadEvaluationTemplate: '下载测评模板',
      dragFileHere: '拖拽文件至此,或者',
      selectFile: '选择文件',
      fileFormatExcel: '文件格式为XLSX，文件大小支持20MB',
      fileFormatJsonl: '文件格式为jsonl，文件大小支持20MB',
      preview: '预览',

      // 表格列标题
      serialNumber: '序号',
      input: '输入',
      actualOutput: '实际输出',
      expectedOutput: '期望输出',
      statusValue: '状态值',
      operation: '操作',
      delete: '删除',

      // 状态文本
      success: '成功',
      failed: '失败（错误码：{{code}}）',

      // 验证消息
      uploadFileEmpty: '上传文件不能为空！',
      fileSizeExceeded: '上传文件大小不能超出20M！',
      fileFormatShouldBeExcel: '文件格式应为excel格式',
      fileFormatShouldBeJsonl: '文件格式应为jsonl格式',
      pleaseUploadEvaluationSet: '请上传测评集',
      onlineDataCannotBeEmpty: '线上数据不能为空',

      // 按钮文本
      cancel: '取消',
      save: '保存',
      saveAndCreate: '保存并创建',
    },
    detail: {
      // 验证消息
      fieldCannotBeEmpty: '{{field}}不能为空!',

      // 表格列标题
      serialNumber: '序号',
      input: '输入',
      expectedOutput: '期望输出',
      dataSource: '数据来源',
      offline: '线下',
      online: '线上',
      operation: '操作',

      // 操作按钮
      save: '保存',
      confirmCancel: '确认取消?',
      cancel: '取消',
      edit: '编辑',
      confirmDelete: '确认删除?',
      delete: '删除',
      back: '返回',

      // 版本相关
      versionName: '版本名称',
      confirmDeleteVersion: '确认删除该版本？',
      confirm: '确认',
      noVersion: '暂无版本',
      addVersion: '新增版本',

      // 批量操作
      batchImport: '批量导入',
      batchDelete: '批量删除',
      downloadDataset: '下载数据集',
      add: '新增',

      // 数据统计
      totalDataCount: '共 {{total}} 项数据',
      confirmDeleteSelectedData: '确认删除所选数据？',

      // 提示
      checkVersionExsit: '请创建版本后，再进行此操作!',
    },
  },
  publishedFlow: {
    // 表格列标题
    firstFrameTimeCost: '首帧耗时',
    serialNumber: '序号',
    input: '输入',
    actualOutput: '实际输出',
    statusValue: '状态值',
    operation: '操作',
    delete: '删除',

    // 状态文本
    success: '成功',
    failed: '失败（错误码：{{code}}）',

    // 表单字段
    taskName: '任务名称：',
    pleaseEnterTaskName: '请输入任务名称',
    selectApplicationVersion: '选择应用版本：',
    pleaseSelectApplicationVersion: '请选择应用版本',
    selectEvaluationMethod: '选择测评方式：',
    pleaseSelectEvaluationMethod: '请选择选择测评方式',
    selectTaskMode: '选择任务模式：',
    pleaseSelectTaskMode: '请选择任务模式',
    selectEvaluationSet: '选择测评集：',
    pleaseSelectEvaluationSet: '请选择测评集',

    // 应用版本选项
    releasedVersion: '已发布版本',
    onlineDraftVersion: '线上草稿版本',
    onlineDraftVersionTip: '线上草稿版本需通过调试，才能创建测评任务。',

    // 测评方式选项
    onlineLogPullTest: '线上日志拉取测试',
    offlineBatchDataTest: '线下批量数据测试',

    // 任务模式选项
    batchDataTestOnly: '仅批量数据测试',
    batchDataTestOnlyDesc: '仅针对批量数据进行运行并查看其结果',
    manualEvaluation: '人工测评',
    manualEvaluationDesc:
      '执行批量数据，获取输出结果，并对结果进行人工评分，最终生成测评报告',
    automatedEvaluation: '自动测评',
    automatedEvaluationTip: '自动化测评的测试数据集需明确包含期望答案',

    // 测评方案选项
    similarityComparison: '相似比对',
    exactComparison: '精确比对',
    similarityComparisonDesc: '相似比对:指用自动化工具比对结果与目标的相似度',
    exactComparisonDesc: '精确比对：指用自动化工具比对结果与目标是否完全匹配',

    // 采样相关
    samplingPeriod: '采样时段：',
    pleaseSelectSamplingPeriod: '请选择采样时段',
    sampleTotal: '采样总和：',
    pleaseEnterSampleTotal: '请输入采样总和',
    samplingMethod: '采样方式：',
    pleaseSelectSamplingMethod: '请选择采样方式',
    sequentialSampling: '顺序采样',
    randomSampling: '随机采样',
    likeDislike: '点踩点赞',

    // 测试数据相关
    testData: '测试数据：',
    pullLogs: '拉取日志',
    totalDataCount: '共 {{total}} 项数据',

    // 按钮文本
    cancel: '取消',
    viewEvaluationSetData: '查看测评集数据',
    submit: '提交',

    // 下拉菜单选项
    newEvaluationSet: '新建测评集',
    newEvaluationSetVersion: '新建测评集版本',
  },
  unpublishedFlow: {
    // 页面标题和导航
    newTask: '新建任务',
    selectEvaluationObject: '选择测评对象',
    configureEvaluationDimensions: '配置测评维度',
    initiateEvaluation: '发起测评',

    // 表单字段
    taskName: '任务名称：',
    pleaseEnter: '请输入',
    pleaseEnterTaskName: '请输入任务名称',
    evaluationType: '测评类型',
    pleaseSelectEvaluationType: '请选择测评类型',
    evaluationObject: '测评对象：',
    pleaseSelectEvaluationObject: '请选择测评对象',
    selectEvaluationSet: '选择测评集：',
    pleaseSelectEvaluationSet: '请选择测评集',
    viewEvaluationSetData: '查看测评集数据',
    selectTaskMode: '选择任务模式：',
    pleaseSelectTaskMode: '请选择任务模式',

    // 测评类型选项
    agentInstructionType: '智能体-指令型',
    agentWorkflow: '智能体-工作流',
    prompt: '提示词',
    instructionType: '指令型',
    workflow: '工作流',

    // 任务模式选项
    manualEvaluation: '人工测评',
    manualEvaluationDesc:
      '执行批量数据，获取输出结果，并对结果进行人工评分，最终生成测评报告',
    intelligentEvaluation: '智能测评',
    intelligentEvaluationDesc: '入裁判模型对内容进行测评，最终生成测评报告',
    oneClickParallel: '一键并行',
    oneClickParallelDesc: '先AI初评、再人工校验,协同生成全面测评报告',

    // 裁判模型选择
    judgeModelSelection: '裁判模型选择：',
    pleaseSelectJudgeModel: '请选择裁判模型',
    deepseekV3: 'DeepSeek-V3',
    deepseekV3Desc: '强大的知识理解与解答能力，适用于各种场景',
    sparkX1: 'Spark-X1',
    sparkX1Desc: '引入裁判模型对内容进行测评，最终生成测评报告',

    // 测评指标
    evaluationIndicators: '测评维度',
    pleaseSelectEvaluationIndicators: '请选择测评维度',
    selectedIndicators: '已选指标',
    addCustomDimension: '添加自定义维度',
    addCustomIndicator: '添加自定义指标',

    // Prompt预览与编辑
    promptPreviewAndEdit: 'Prompt预览与编辑',
    restoreDefault: '恢复默认',
    debugPreview: '调试预览',
    aiOptimize: 'AI优化',

    // 验证消息
    promptCannotBeEmpty: 'prompt不能为空！',
    enterDimensionNameForOptimization:
      '为了更精准地为您优化内容，请先输入具体的维度名称',
    dimensionNameCannotBeRepeated: '维度名称不可重复',
    currentEffectEvaluationNotSupportQANode:
      '当前效果测评暂时不支持有问答节点的工作流测评',

    // 按钮文本
    cancel: '取消',
    nextStep: '下一步',
    previousStep: '上一步',
    startEvaluation: '开始测评',
    hold: '暂存',

    // 下拉菜单选项
    newEvaluationSet: '新建测评集',
    newEvaluationSetVersion: '新建测评集版本',

    // 工作流状态
    draftVersion: '草稿版本',
    workflowNotDebuggedSuccessfully: '工作流未调试成功',
    currentVersionPublishNotSuccessful: '当前版本发布未成功，不支持测评功能',
    workflowMultiParameterInput: '当前工作流为多参数输入,不支持测评功能',

    // 其他
    unknownName: '未知名称',
  },
  debuggingPreview: {
    // 模态框标题
    title: '调试预览',

    // 表单字段
    promptConfig: 'prompt配置',
    currentModel: '当前模型：',
    deepseekV3: 'DeepSeek V3',
    prompt: 'prompt：',
    aiOptimize: 'AI优化',
    evaluationType: '测评类型:',
    evaluationObject: '测评对象:',
    userInput: '用户输入',
    pleaseEnter: '请输入',
    actualOutput: '实际输出',
    evaluationResult: '测评结果',

    // 测评类型选项
    agentInstructionType: '智能体-指令型',
    agentWorkflow: '智能体-工作流',
    promptType: '提示词',

    // 按钮文本
    cancel: '取消',
    save: '保存',
    run: '运行',
    runAgain: '重新运行',

    // 状态文本
    thinking: '思考中...',
    clickRunToShow: '点击运行后展示',
    runFailed: '运行失败，请尝试重新运行',
    runToShowScore: '运行后展示得分分数及得分原因',
    scoreReason: '得分原因：',
    score: '分',

    // 验证消息
    promptCannotBeEmpty: 'prompt不能为空！',
    enterDimensionNameForOptimization:
      '为了更精准地为您优化内容，请先输入具体的维度名称',
  },
  evaluationSetData: {
    serialNumber: '序号',
    input: '输入',
    dataSource: '数据来源',
    offline: '线下',
    online: '线上',
    back: '返回',
    evaluationSetDetail: '测评集详情',
    totalDataCount: '共 {{total}} 项数据',
  },
  recommendTip: {
    recommend: '推荐',
  },
  dimension: {
    // 模态框标题
    addCustomDimension: '添加自定义维度',

    // 表单字段
    evaluationDimensionName: '测评维度名称：',
    pleaseEnterEvaluationDimensionName: '请输入测评维度名称',
    pleaseEnter: '请输入',

    // 提示文本
    viewAllDimensions: '想集中查看和管理全部测评维度，请前往',
    evaluationDimensionManagement: '测评维度管理',

    // 按钮文本
    cancel: '取消',
    confirm: '确定',
    addDimension: '管理全部测评维度',
  },
  flowEvaluationDetail: {
    // 导航和标题
    back: '返回',

    // 标签页
    basicInfo: '基本信息',
    testData: '测试数据',
    evaluationReport: '测评报告',

    // 测评模式相关
    evaluationMode: '测评模式',
    selectEvaluationDimension: '选择测评维度',
    all: '全部',
    manualEvaluation: '人工测评',
    intelligentEvaluation: '智能测评',
    pleaseSelect: '选择分数',
    one: 1,
    two: 2,
    three: 3,
    four: 4,

    // 按钮文本
    resetScore: '重置分数',
    confirmReset: '重置操作会导致任务中断且不可恢复，是否确认继续？',
    confirm: '确认',
    cancel: '取消',
    downloadToLocal: '下载到本地',
    recreate: '重新创建',
    rescore: '重新打分',
    goToScore: '去打分',
    initiateIntelligentEvaluation: '发起智能测评',
    initiateManualEvaluation: '发起人工测评',

    // 状态消息
    taskTerminating: '当前任务终止中，请稍后再试',
    taskRunning: '当前任务运行中，请稍后再试',
    operationFailed: '操作失败:',
  },
  baseInfo: {
    // 任务模式
    batchDataTestOnly: '仅批量数据测试',
    manualEvaluation: '人工测评',
    automatedEvaluation: '自动测评',

    // 状态文本
    running: '运行中',
    completed: '已完成',
    failed: '运行失败',
    pendingScore: '待评分',
    autoScore: '自动评分中',
    terminating: '终止中',
    terminated: '已终止',
    unknownStatus: '未知状态',

    // 字段标签
    evaluationTaskName: '测评任务名称：',
    evaluationObject: '测评对象：',
    evaluationSet: '测评集：',
    taskMode: '任务模式：',
    taskStatus: '任务状态：',
  },
  evaluationReport: {
    // 表格列标题
    serialNumber: '序号',
    question: '问题',
    answer: '答案',
    expectedAnswer: '期望答案',
    performanceTimeCost: '性能耗时',
    firstFrameCost: '首帧耗时',
    statusValue: '状态值',
    success: '成功',
    failed: '失败（错误码：{{code}}）',

    // 子表格列标题
    nodeName: '节点名称',
    input: '输入',
    output: '输出',

    // 报告结论
    reportConclusion: '报告结论',
    effectScore: '效果得分',
    effectScoreTip:
      '0~60分，效果较差，结果偏差较大；61~80分，效果一般，存在明显优化空间；81~ 100分，效果很好，接近或达到实际应用需求。',
    passRate: '通过率',
    taskCount: '任务数',
    successCount: '成功次数',
    failCount: '失败次数',

    // 优化建议
    optimizationSuggestions: '优化建议',
    goToTroubleshoot: '去排查问题',

    // 错误数据
    errorData: '错误数据',
    totalDataCount: '共 {{total}} 项数据',

    // 状态文本
    generating: '生成中，请稍等',
  },
  // 评分相关
  poor: '差',
  general: '一般',
  better: '较好',
  excellent: '优秀',
  answer: '答案',
  existUnscoredQuestions: '当前维度存在未打分的问答,是否提交?',
  currentDimensionExistUnscoredQuestions: '当前维度存在未打分的问答,是否提交?',

  // 表格相关
  serialNumber: '序号',
  question: '问题',
  expectedAnswer: '期望答案',
  evaluationDimension: '测评维度',
  terminated: '已终止',

  // TaskReport 组件相关翻译键
  taskReport: {
    intelligentEvaluation: '智能测评',
    manualEvaluation: '人工测评',
    evaluationTotalScore: '测评总分',
    intelligentEvaluationTotalScore: '智能测评总分',
    basedOnDimensionComprehensiveScore: '基于维度综合评分',
    manualEvaluationTotalScore: '人工测评总分',
    basedOnExpertReviewComprehensiveScore: '基于专家评审综合评分',
    averageScore: '平均分',
    averageScoreComparison: '平均分对比概览',
    intelligentEvaluationLabel: '智能测评',
    manualEvaluationLabel: '人工测评',
    difference: '差异',
    dimensionScoreDetails: '维度评分详情',
  },
  // ToolNode component translations
  oneClickUpdate: '一键更新',
  // ModalPreview component translations
  confirmInitiateEvaluation: '确认发起',
  intelligent: '智能',
  manual: '人工',
  reserved: '预留',
  evaluation: '测评',
  appendCurrentTask: '将追加当前',
  originalTaskDataRemainsUnchanged: '原任务数据保持不变',
};
