const translation = {
  // Upload page translations
  dataCleanFailed: '数据清洗失败',
  importWebsiteLinkSupport:
    '支持读取静态链接，部分链接不可读取，请注意检查结果',
  dataSettings: '数据设置',
  fileParsingEmbedding: '文件解析，嵌入中...',
  knowledgeBaseCreated: '知识库已创建！',
  createNewKnowledge: '新建知识库',
  emptyDescription: '暂无知识库，快去创建吧~',
  noSearchResults: '未找到相关知识库',
  documentCount: '包含文档数',
  totalCharacters: '总字符数（千）',
  relatedAgents: '关联智能体',
  // Modal translations
  confirmDeleteKnowledge: '确认删除知识库？',
  deleteKnowledgeWarning:
    '删除知识库是不可逆的。用户将无法再访问您的知识库，所有的提示配置和日志将被永久删除。',
  createKnowledge: '创建知识库',
  knowledgeName: '知识库名称：',
  knowledgeDescription: '知识库描述：',
  knowledgeVersion: '知识库版本：',
  ragflowRAG: 'RAGFlow',
  ragflowRAGDescription: '开源版本RAGFlow，详见 ',
  xinghuoKnowledge: '星火知识库',
  xingpuDescription:
    '可整合多源异构知识数据自动采编，提供问答式检索，支持答案追溯，适用于企业场景。',
  xingchenKnowledge: '星辰知识库',
  xingchenDescription:
    '可整合多源异构知识数据自动采编，提供问答式检索，支持答案追溯，适用于轻量检索场景。',
  confirm: '确认',
  // Upload page translations
  fileUpload: '文件上传',
  importData: '导入数据',
  dataClean: '分片预览',
  processingCompletion: '处理和完成',
  nextStep: '下一步',
  previousStep: '上一步',
  saveAndProcess: '保存并处理',
  goToDocuments: '前往文档',
  confirmLeave: '确定离开吗？\n有文件未嵌入成功。',
  filesCount: '等{{count}}个文件',
  knowledgeCreated: '知识库已创建！',
  documentsUploaded: '文档已上传至知识库，你可以在数据集的文档列表中找到它们',
  fileParsing: '文件解析，嵌入中...',
  embeddingCompleted: '嵌入已完成',
  embeddingFailed: '嵌入失败',
  documentsEmbeddingFailed: '有文档嵌入失败（{{count}}）',
  retry: '重试',
  segmentSettings: '分段设置',
  autoSegmentAndClean: '自动分段与清洗',
  autoSegmentDescription:
    '自动设置分段规则与预处理规则，如果不了解这些参数建议选择此项',
  custom: '自定义',
  customDescription: '自定义分段规则、分段长度以及预处理规则等参数',
  segmentIdentifier: '分段标识符',
  segmentLength: '分段长度',
  segmentLengthSupport: '支持分段长度({{min}},{{max}})',
  documentsCleaningFailed: '有文档清洗失败（{{count}}）',
  // File format descriptions
  xingchenFormatSupport:
    '支持pdf、docx、doc、pptx、ppsx、txt、md、jpg、jpeg、png、bmp格式的文档,txt，md大小限制在 10M以下，其他文件 100M以下',
  sparkFormatSupport:
    '支持pdf、doc、docx、txt、md、xlsx、xls、ppt、pptx、jpg、jpeg、png、bmp等格式的文档，单文件不超过20MB/100万字单图片不超过5M，图片中需有文字。',
  // Error messages
  uploadFileEmpty: '上传文件不能为空！',
  fileSizeExceeded: '文件大小不能超出{{size}}M！',
  uploadFileCountExceeded: '上传文件个数不能超过10！',
  fileFormatIncorrect: '文件格式不正确',
  // Import data translations
  chooseDataType: '选择数据类型',
  importTextFile: '导入文本文件',
  importTextFileSupport: '支持上传格式包含TXT、PDF、MD、DOC等格式的文件',
  importWebsiteLink: '导入网站链接',
  dragAndDropFile: '拖拽文件至此，或者',
  selectFile: '选择文件',
  uploadWebsiteLink: '上传网页链接',
  websiteLinkSupport: '目前仅支持读取静态链接，请注意检查结果。',
  useNewlineToSeparate: '用换行分割每一个链接。',
  inputMultipleLinks: '输入多个链接时候，请使用换行，每行一个',
  // Processing completion translations
  segmentationRules: '分段规则',
  automatic: '自动',
  customized: '自定义',
  paragraphLength: '段落长度',
  characters: '字符',
  averageParagraphLength: '平均段落长度',
  paragraphCount: '段落数量',
  paragraphs: '段落',
  // DataClean translations
  failedCount: '有文档切分失败（{{count}}）',
  segmentationSettings: '分段设置',
  autoSegmentationAndCleaning: '自动分段与清洗',
  autoSegmentationAndCleaningDesc:
    '自动设置分段规则与预处理规则，如果不了解这些参数建议选择此项',
  customDesc: '自定义分段规则、分段长度以及预处理规则等参数',
  supportSegmentLength: '支持分段长度({{min}},{{max}})',
  preview: '预览',
  reset: '重置',
  indexingMethod: '索引方式',
  highQuality: '高质量',
  highQualityDesc:
    '调用系统默认的嵌入接口进行处理，以在用户查询时提供更高的准确度',
  segmentPreview: '分段预览',
  violationCount: '违规{{count}}组',
  totalCount: '共{{count}}组',
  downloadViolationDetails: '下载违规详情',
  violationReason: '违规原因：{{reason}}',
  slicing: '分片中，请等待...',
  // DataClean component translations
  pleaseEnter: '请输入',
  enterOrSelect: '输入或选择',

  // KnowledgeHeader component translations
  document: '文档',
  hitTest: '命中测试',
  settings: '设置',
  relatedApplications: '关联应用',

  // DocumentPage component translations
  documents: '文档',
  documentsDescription:
    '文档知识库的所有文件都在这里显示，整个知识库都可以链接到应用或通过工具进行索引。',
  noDocumentsInKnowledge: '知识库中还没有文档',
  addDocument: '添加文档',
  addFolder: '添加文件夹',
  fileName: '文件名',
  characterCount: '字符数',
  hitCount: '命中次数',
  uploadTime: '上传时间',
  status: '状态',
  operations: '操作',
  enabled: '启用',
  disabled: '停用',
  items: '条',

  // ModalComponents translations
  folder: '文件夹',
  folderName: '文件夹名称',
  confirmDeleteFile: '确认删除文件',
  confirmDeleteFolder: '确认删除文件夹',
  confirmDeleteKnowledgeTag: '确认删除知识库标签？',
  folderDeleteWarning: '文件夹删除无法撤销。文件内文档将一并删除。',
  fileDeleteWarning: '文件删除无法撤销。用户将无法继续访问该文件',
  tagSettings: '标签设置',
  addTags: '添加标签',
  addTagsDescription: '用逗号隔开多个标签。如需删除知识库标签(黄色)，请转至',
  knowledgeSettings: '知识库设置',

  // HitPage component translations
  hitTestDescription: '基于给定的查询文本测试知识库的命中效果。',
  queryText: '查询文本',
  query: '查询',
  querying: '中',
  recentQueries: '最近查询',
  queryTextHeader: '查询文本',
  testTime: '测试时间',
  hitParagraphs: '命中段落',
  hitKnowledgeParagraphsWillShowHere: '命中知识段落将显示在这里',

  // SettingPage component translations
  knowledgeSettingsDescription:
    '可进行知识库的基础知识设置和模型以及索引方式设置',
  knowledgeBaseName: '知识库名称',
  knowledgeBaseId: '知识库id：',
  knowledgeBaseDescription: '知识库描述',
  knowledgeBaseDescriptionDetail:
    '关于知识库的描述，请您尽可能详细的进行描述知识库的内容，以便AI更快的进行知识的访问',
  highQualityDescription:
    '调用系统默认的嵌入接口进行处理，以在用户查询时提供更高的准确度',

  // FilePage component translations
  violationParagraphs: '违规 {{count}} 段落',
  violationKnowledge: '违规知识',
  manual: '手动',
  violation: '违规',
  technicalParameters: '技术参数',

  // FilePage ModalComponents translations
  uploadFileSizeExceeded: '上传文件大小不能超出2M！',
  uploadImageFormatError: '请上传JPG和PNG等格式的图片文件',
  knowledgeParagraph: '知识段落',
  knowledgeParagraphRequired: '知识段落不能为空',
  addImage: '添加图片',
  addImageDescription:
    '上传格式包括JPG、PNG、MP4格式的文件，请将单个文件大小控制在0MB-300MB以内，仅支持上传3个文件',
  tags: '标签',
  addKnowledgeParagraph: '添加知识段落',
  confirmDeleteParagraph: '确认删除段落？',
  paragraphDeleteWarning:
    '段落删除无法撤销。删除后该段落知识将无法检索，可能会影响后续对话结果。',
  save: '保存',
  saveTip: '点击保存不影响数据处理，处理完毕后可进行引用',
  progress: '解析中',
  parseFail: '解析失败',
  parseSuccess: '完成',
  confirmDisabled: '工作流使用当前知识库，是否确定停用？',
  segmentPreviewWillBeAvailableAfterEmbedding: '分段预览将在嵌入完成后可用',
};

export default translation;
