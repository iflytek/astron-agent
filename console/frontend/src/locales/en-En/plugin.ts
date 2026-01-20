const translation = {
  import: 'Import',
  export: 'Export',
  importFile: 'Import File',
  importFileDescription: 'File format is json, yaml, file size supports 20MB',
  exportAsJson: 'Export as JSON',
  exportAsYaml: 'Export as YAML',
  pleaseSelectOfficialPlugin: 'Please select official plugin',
  pluginFeedback: 'Plugin Feedback',
  selectOfficialPlugin: 'Select Official Plugin',
  feedbackType: 'Feedback Type',
  existPlugin: 'Existing Official Plugin Function Feedback',
  nonexistentPlugin: 'Non-existing Official Plugin Function Feedback',
  createPlugin: 'Create Plugin',
  draft: 'Draft',
  available: 'Available',
  relatedApplications: 'Related Applications',
  toolParameters: 'Tool Parameters',
  toolTest: 'Tool Test',
  settings: 'Settings',
  back: 'Back',
  fillBasicInfo: 'Complete Basic Information',
  addPlugin: 'Add Plugin',
  debugAndValidate: 'Debug & Validate',
  pluginName: 'Plugin Name',
  pleaseEnterPluginName: 'Please enter plugin name',
  pluginDescription: 'Plugin Description',
  pluginDescriptionHint:
    'Describe the plugin’s functionality in natural language. Give examples where possible, e.g. "This plugin helps achieve specific functionality such as sending emails to Jack."',
  pleaseEnterPluginDescription: 'Please enter plugin description',
  pluginBox: 'Plugin Box',
  knowledgeBase: 'Knowledge Base',

  // CreateTool component
  editPlugin: 'Edit Plugin',
  fillBasicInfoDescription:
    'Fill in plugin introduction, name, request method and authorization type',
  addPluginDescription:
    'Submit plugin parameters by configuring input/output parameters or adding yaml files',
  debugAndValidateDescription: 'Debug and validate the plugin',
  authorizationMethod: 'Authorization Type',
  pleaseEnterAuthorizationMethod: 'Please enter authorization type',
  noAuthorizationRequired: 'No Authorization Required',
  noAuthorizationDescription: 'No extra permissions needed for API usage',
  serviceAuthorization: 'Service',
  serviceAuthorizationDescription:
    'API key required in header/query for access',
  pluginPath: 'Plugin Endpoint',
  pleaseEnterPluginPath: 'Please enter Plugin Endpoint',
  pleaseEnterValidUrl: 'Please enter a valid URL format',
  location: 'Location',
  locationDescription:
    'Header means passing the key in the request header, Query means passing the key in the query',
  pleaseEnterLocation: 'Please enter location',
  parameterName: 'Parameter name',
  parameterNameDescription:
    'The parameter of the key, you need to pass the parameter name of the Service Token. Its role is to tell the API service in which parameter you will provide authorization information',
  pleaseEnterParameterName: 'Please enter Parameter name',
  serviceToken: 'Service token / API key',
  serviceTokenDescription:
    'The parameter value of the key, representing your identity or given service permissions. The API service will verify this Token to ensure you have the right to perform the corresponding operations',
  pleaseEnterServiceToken: 'Please enter Service token / API key',
  requestMethod: 'HTTP Method',
  pleaseSelectRequestMethod: 'Please select request method',
  getMethod: 'Get Method',
  postMethod: 'Post Method',
  putMethod: 'Put Method',
  deleteMethod: 'Delete Method',
  patchMethod: 'Patch Method',
  requestMethodTooltip:
    'Get: Request specific resources through URL, mainly used to obtain data.\nPost: Submit data to specified resources, often used to submit forms or upload files.\nPut: Upload data or resources to specified locations, often used to update existing resources or create new resources.\nDelete: Request the server to delete the specified resource.\nPatch: Update existing resources, but do not create new resources.',

  // Validation messages
  parameterValidationFailed:
    'Parameter validation failed, please check and try again',
  pleaseEnterParameterDescription: 'Please enter parameter description',
  requiredParameterNotFilled:
    'There are unfilled required parameters, please check and try again',

  // Debug and publish
  debugResult: 'Debug Result',
  publish: 'Publish',
  temporaryStorage: 'Temporary Storage',

  // ToolDebugger component
  debugPlugin: 'Debug Plugin',

  // ToolDetail component
  pluginDetail: 'Plugin Detail',

  // Additional keys needed for the component
  fillPluginIntro:
    'Fill in plugin introduction, name, request method and authorization type',
  submitPluginParams:
    'Submit plugin parameters by configuring input/output parameters or adding yaml files',
  debugAndVerify: 'Debug & Validate',
  debugAndVerifyDesc: 'Debug and validate the plugin',
  noAuthorization: 'No Authorization Required',
  useAPIWithoutAuthorization: 'No extra permissions needed for API usage',
  service: 'Service',
  authorizationRequired: 'API key required in header/query for access',
  position: 'Position',
  headerOrQuery:
    'Header means passing the key in the request header, Query means passing the key in the query',
  header: 'Header',
  query: 'Query',
  parameterNameDesc:
    'The parameter of the key, you need to pass the parameter name of the Service Token. Its role is to tell the API service in which parameter you will provide authorization information',
  serviceTokenDesc:
    'The parameter value of the key, representing your identity or given service permissions. The API service will verify this Token to ensure you have the right to perform the corresponding operations',
  getDesc:
    'Get: Request specific resources through URL, mainly used to obtain data.',
  postDesc:
    'Post: Submit data to specified resources, often used to submit forms or upload files.',
  putDesc:
    'Put: Upload data or resources to specified locations, often used to update existing resources or create new resources.',
  deleteDesc: 'Delete: Request the server to delete the specified resource.',
  patchDesc:
    'Patch: Update existing resources, but do not create new resources.',
  describePlugin:
    'Describe the plugin\'s function in natural language, please provide examples, e.g.: "This plugin is used to complete specific functions. For example, help me send an email to Zhang San"',
  hold: 'Temporary Storage',
  previousStep: 'Previous Step',
  nextStep: 'Next Step',
  save: 'Save',
  debug: 'Debug',
  details: 'Details',
  pluginParams: 'Plugin Parameters',
  inputParams: 'Input Parameters',
  outputParams: 'Output Parameters',
  publishedAt: 'Published at',

  // VersionManagement component
  versionAndIssueTracking: 'Version and Issue Tracking',
  versionRecord: 'Version Record',
  draftVersion: 'Draft Version',
  version: 'Version:',
  publishTime: 'Publish Time:',

  emptyDescription: 'No plugins yet, create one now~',
  noSearchResults: 'No related plugins found',
};

export default translation;
