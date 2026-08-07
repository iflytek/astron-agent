const promption = {
  promptionPage: {
    title: 'Prompt Engineering',
    status: {
      published: 'Published',
      unpublished: 'Unpublished',
    },
    actions: {
      compareDebug: 'Comparison Debugging',
      historyVersions: 'History Versions',
      publish: 'Publish',
      debugPreview: 'Debug Preview',
      baselineGroup: 'Baseline Group',
      controlGroup: 'Control Group',
      systemPrompt: 'System Prompt',
      userPrompt: 'User Prompt',
      promptVariables: 'Prompt Variables',
      promptVariablesTooltip:
        'In the left prompt, you can define prompt variables by {{variable name}}, and the variable name will be automatically generated',
      previewAndDebug: 'Preview & Debug',
      clearHistory: 'Clear History',
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
      copySuccess: 'Copy Success',
      systemPromptRequired: 'System prompt cannot be empty!',
      userPromptRequired: 'User prompt cannot be empty!',
      generateFailed: 'AI generation failed, please try again later!',
      enterQuestion: 'Please enter the question',
      aiOptimize: 'AI Optimization',
      maxModels: 'Maximum 4 models can be selected for comparison',
      modelConfiguration: 'Model Configuration',
      selectModel: 'Please select model',
      addControlGroup: 'Add Control Group ({{count}}/4)',
      setAsBaseline: 'Set as Baseline',
      deleteControlGroup: 'Delete Control Group',
      inputTitle: 'Input Title',
      saveCurrentConfig: 'Save Current Configuration',
      saveFailed: 'Save Failed',
      currentDraft: 'Current Draft',
      saveTime: 'Save Time:',
      version: 'Version {{version}}',
      versionDescription: 'Version Description:',
      releaseTime: 'Release Time:',
      restoreVersion: 'Restore This Version',
      chatTitle: 'Preview & Debug',
      textHistory: 'History Versions',
    },
    messages: {
      workflowDeleted: 'Workflow has been deleted',
      multiParams: 'Multiple input parameters exist in workflow',
      notDebugged: 'Workflow not debugged successfully',
      noLLMNode: 'No LLM node in workflow',
    },
    dialog: {
      clearHistory: 'Clear History',
      chatMode: 'Chat Mode',
      runOnlyMode: 'Run Only Mode',
      run: 'Run',
      enterContentHere: 'Enter content here',
      send: 'Send',
      answeringPleaseWait: 'Answering, please wait',
      answeringPleaseWait2: 'Answering...',
      enterQuestion: 'Please enter the question',
      stopOutput: 'Stop',
      uploadDescAndDoc:
        'You have not uploaded a description file and interface document',
      uploadDoc: 'Your uploaded interface document has not been verified',
      uploadDescAndDocTip:
        'Please upload a description file and interface document on the left side and verify it before debugging preview',
      uploadDocTip:
        'Please upload a new interface document on the left side and verify it before debugging preview',
    },
  },
  newVersionModal: {
    titles: {
      diffComparison: 'Release New Version - Difference Comparison',
      confirmInfo: 'Release New Version - Confirm Version Information',
      default: 'Release New Version',
    },
    fields: {
      version: 'Version Number',
      versionDescription: 'Version Description',
    },
    validation: {
      requiredVersion: 'Please enter version number',
      versionFormat: 'Invalid version format, please use x.x.x format',
      maxDescription: 'Version description cannot exceed 200 characters',
    },
    placeholders: {
      versionExample: 'e.g.: 0.0.1',
      enterDescription: 'Please enter version description',
    },
    buttons: {
      cancel: 'Cancel',
      continue: 'Continue',
      submit: 'Submit',
    },
    steps: {
      confirmDiff: 'Confirm Version Differences',
      confirmInfo: 'Confirm Version Information',
    },
  },
  diffCode: {
    versionDiff: 'Version Differences',
    noChanges: 'No version differences in this commit',
    variablePlaceholder: 'Variable placeholder',
    formatError: 'Error during code formatting:',
  },
  editInfoBtn: {
    actions: {
      editPrompt: 'Edit Prompt',
    },
    validation: {
      enterKeyAndName: 'Please enter Prompt KEY and name',
    },
    messages: {
      updateSuccess: 'Update Successful',
      updateFailed: 'Update Failed',
    },
    tooltips: {
      edit: 'Edit',
    },
  },
};

export default promption;
