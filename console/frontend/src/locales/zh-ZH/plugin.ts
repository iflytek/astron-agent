const translation = {
  import: '导入',
  export: '导出',
  importFile: '导入文件',
  importFileDescription: '文件格式为json、yaml，文件大小支持20MB',
  exportAsJson: '导出为JSON',
  exportAsYaml: '导出为YAML',
  pleaseSelectOfficialPlugin: '请选择官方插件',
  pluginFeedback: '插件反馈',
  selectOfficialPlugin: '选择官方插件',
  feedbackType: '反馈类型',
  existPlugin: '已有官方插件功能反馈',
  nonexistentPlugin: '未找到需要的插件',
  createPlugin: '新建插件',
  draft: '草稿',
  available: '可用',
  relatedApplications: '关联应用',
  toolParameters: '工具参数',
  toolTest: '工具测试',
  settings: '设置',
  back: '返回',
  fillBasicInfo: '填写基本信息',
  addPlugin: '添加插件',
  debugAndValidate: '调试与校验',
  pluginName: '插件名称',
  pleaseEnterPluginName: '请输入插件名称',
  pluginDescription: '插件描述',
  pluginDescriptionHint:
    '通过自然语言描述插件的作用，请尽是给出示例，例："此插件用于完成特定的功能。如帮我发一封邮件给张三"',
  pleaseEnterPluginDescription: '请输入插件描述',
  pluginBox: '插件箱',
  knowledgeBase: '知识库',

  // CreateTool component
  editPlugin: '编辑插件',
  fillBasicInfoDescription: '填写插件简介、名称、请求方法和授权方式',
  addPluginDescription: '通过配置输入输出参数或者添加yaml文件提交插件参数',
  debugAndValidateDescription: '对插件进行调试和校验',
  authorizationMethod: '授权方式',
  pleaseEnterAuthorizationMethod: '请输入授权方式',
  noAuthorizationRequired: '不需要授权',
  noAuthorizationDescription: '无需额外授权就可以使用API',
  serviceAuthorization: 'Service',
  serviceAuthorizationDescription:
    '需要在请求头 (header)或者查询 (query)时携带密钥来获取授权',
  pluginPath: '插件路径',
  pleaseEnterPluginPath: '请输入插件路径',
  pleaseEnterValidUrl: '请输入有效的URL格式',
  location: '位置',
  locationDescription:
    'Header代表在请求头中传递密钥，Query代表在查询中传递密钥',
  pleaseEnterLocation: '请输入位置',
  parameterName: 'Parameter name',
  parameterNameDescription:
    '密钥的参数，您需要传递Service Token的参数名。其作用是告诉API服务，您将在哪个参数中提供授权信息',
  pleaseEnterParameterName: '请输入参数名',
  serviceToken: 'Service token / APl key',
  serviceTokenDescription:
    '密钥的参数值，代表您的身份或给定的服务权限。API服务会验证此Token，以确保您有权进行相应的操作',
  pleaseEnterServiceToken: '请输入Service token / APl key',
  requestMethod: '请求方法',
  pleaseSelectRequestMethod: '请选择请求方法',
  getMethod: 'Get方法',
  postMethod: 'Post方法',
  putMethod: 'Put方法',
  deleteMethod: 'Delete方法',
  patchMethod: 'Patch方法',
  requestMethodTooltip:
    'Get：通过URL请求特定资源，主要用于获取数据。\nPost：向指定资源提交数据，常用于提交表单或上传文件。\nPut：向指定位置上传数据或资源，常用于更新已存在的资源或创建新资源。\nDelete：请求服务器删除指定的资源。\nPatch：更新现有资源，但不创建新资源。',

  // Validation messages
  parameterValidationFailed: '参数校验未通过，请检查后再试',
  pleaseEnterParameterDescription: '请输入参数描述',
  requiredParameterNotFilled: '存在未填写的必填参数，请检查后再试',

  // Debug and publish
  debugResult: '调试结果',
  publish: '发布',
  temporaryStorage: '暂存',

  // ToolDebugger component
  debugPlugin: '调试插件',

  // ToolDetail component
  pluginDetail: '插件详情',

  // Additional keys needed for the component
  fillPluginIntro: '填写插件简介、名称、请求方法和授权方式',
  submitPluginParams: '通过配置输入输出参数或者添加yaml文件提交插件参数',
  debugAndVerify: '调试与校验',
  debugAndVerifyDesc: '对插件进行调试和校验',
  noAuthorization: '不需要授权',
  useAPIWithoutAuthorization: '无需额外授权就可以使用API',
  service: 'Service',
  authorizationRequired:
    '需要在请求头 (header)或者查询 (query)时携带密钥来获取授权',
  position: '位置',
  headerOrQuery: 'Header代表在请求头中传递密钥，Query代表在查询中传递密钥',
  header: 'Header',
  query: 'Query',
  parameterNameDesc:
    '密钥的参数，您需要传递Service Token的参数名。其作用是告诉API服务，您将在哪个参数中提供授权信息',
  serviceTokenDesc:
    '密钥的参数值，代表您的身份或给定的服务权限。API服务会验证此Token，以确保您有权进行相应的操作',
  getDesc: 'Get：通过URL请求特定资源，主要用于获取数据。',
  postDesc: 'Post：向指定资源提交数据，常用于提交表单或上传文件。',
  putDesc:
    'Put：向指定位置上传数据或资源，常用于更新已存在的资源或创建新资源。',
  deleteDesc: 'Delete：请求服务器删除指定的资源。',
  patchDesc: 'Patch：更新现有资源，但不创建新资源。',
  describePlugin:
    '通过自然语言描述插件的作用，请尽是给出示例，例："此插件用于完成特定的功能。如帮我发一封邮件给张三"',
  hold: '暂存',
  previousStep: '上一步',
  nextStep: '下一步',
  save: '保存',
  debug: '调试',
  details: '详情',
  pluginParams: '插件参数',
  inputParams: '输入参数',
  outputParams: '输出参数',
  publishedAt: '发布于',

  // VersionManagement component
  versionAndIssueTracking: '版本与问题追踪',
  versionRecord: '版本记录',
  draftVersion: '草稿版本',
  version: '版本：',
  publishTime: '发布时间：',

  emptyDescription: '暂无插件，快去创建吧~',
  noSearchResults: '未找到相关插件',
};

export default translation;
