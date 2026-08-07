// 统一的工作流图标管理
// 按模块组织图标资源，便于维护和扩展

// Advanced Configuration 模块图标
import closeIcon from '@/assets/imgs/workflow/modal-close.png';

// Prompt Optimize Icons
import promptOptimizeReTry from '@/assets/imgs/workflow/bnt_zhishi_restart.png';

export interface PromptOptimizeIcons {
  reTry: string;
}

// Select Agent Prompt Icons
import selectAgentPromptClose from '@/assets/imgs/workflow/modal-close.png';
import selectAgentPromptSearch from '@/assets/imgs/workflow/search-icon.svg';
import selectAgentPromptKnowledgeListEmpty from '@/assets/imgs/workflow/knowledge-list-empty.png';

export interface SelectAgentPromptIcons {
  close: string;
  search: string;
  knowledgeListEmpty: string;
}

// Select LLM Prompt Icons
import selectLlmPromptClose from '@/assets/imgs/workflow/modal-close.png';
import selectLlmPromptSearch from '@/assets/imgs/workflow/search-icon.svg';
import selectLlmPromptToolModalAdd from '@/assets/imgs/workflow/tool-modal-add.png';
import selectLlmPromptPublishIcon from '@/assets/imgs/workflow/publish-icon.png';
import selectLlmPromptKnowledgeListEmpty from '@/assets/imgs/workflow/knowledge-list-empty.png';

export interface SelectLlmPromptIcons {
  close: string;
  search: string;
  toolModalAdd: string;
  publishIcon: string;
  knowledgeListEmpty: string;
}

// Set Default Value Icons
import setDefaultValueClose from '@/assets/imgs/workflow/modal-close.png';

export interface SetDefaultValueIcons {
  close: string;
}

// Agent Icons
import agentToolIcon from '@/assets/imgs/workflow/tool-modal-tool-icon.png';
import agentKnowledgeIcon from '@/assets/imgs/workflow/knowledgeIcon.png';
import agentInputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';
import agentPromptLibraryIcon from '@/assets/imgs/workflow/prompt-library-icon.svg';
import agentQuestionMark from '@/assets/imgs/common/questionmark.png';
import agentZoomOutIcon from '@/assets/imgs/workflow/zoom-out-icon.png';
import agentZoomInIcon from '@/assets/imgs/workflow/zoom-in-icon.png';
import agentRemove from '@/assets/imgs/workflow/input-remove-icon.png';
import agentKnowledgeListDelete from '@/assets/imgs/workflow/knowledge-list-delete.svg';
import agentOneClickUpdate from '@/assets/imgs/plugin/one-click-update.svg';

export interface AgentIcons {
  toolIcon: string;
  knowledgeIcon: string;
  inputAddIcon: string;
  promptLibraryIcon: string;
  questionMark: string;
  zoomOutIcon: string;
  zoomInIcon: string;
  remove: string;
  knowledgeListDelete: string;
  oneClickUpdate: string;
}

// Code Icons
import codeEditCode from '@/assets/imgs/workflow/edit-code.png';

export interface CodeIcons {
  editCode: string;
}

import promptOptimizationIcon from '@/assets/imgs/workflow/prompt-optimization-icon.png';
import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';
import removeIcon from '@/assets/imgs/workflow/input-remove-icon.png';
import formSelectIcon from '@/assets/imgs/main/icon_nav_dropdown.svg';
import characterPortraitIcon from '@/assets/imgs/workflow/character-portrait.png';
import uploadActIcon from '@/assets/imgs/knowledge/icon_zhishi_upload_act.png';
import advancedConfigurationUploadIcon from '@/assets/imgs/workflow/advanced-configuration-upload-icon.svg';
import backgroundCloseIcon from '@/assets/imgs/workflow/background-close-icon.svg';
import conversationStarterIcon from '@/assets/imgs/workflow/conversation-starter-icon.svg';
import problemSuggestionIcon from '@/assets/imgs/workflow/problem-suggestion-icon.svg';
import speechToTextIcon from '@/assets/imgs/workflow/speech-to-text.svg';
import likeAndDislikeIcon from '@/assets/imgs/workflow/like-and-dislike.svg';
import characterVoiceIcon from '@/assets/imgs/workflow/character-voice-icon.svg';
import settingBackgroundIcon from '@/assets/imgs/workflow/setting-background-icon.svg';

// Chat Debugger 模块图标
import trialRunIcon from '@/assets/imgs/workflow/trial-run-icon.png';
import chatListTipIcon from '@/assets/imgs/workflow/chat-list-tip.png';
import switchUserChatPageActiveIcon from '@/assets/imgs/workflow/switchUserChatPageActive.svg';
import vmsIcon from '@/assets/svgs/icon-user-line.svg';
import messageIcon from '@/assets/svgs/icon-message-line.svg';

// Chat Content 模块图标
import chatUserIcon from '@/assets/imgs/workflow/chat-user-icon.png';
import chatLoadingIcon from '@/assets/imgs/workflow/chat-loading-icon.png';
import startNewConversationLeft from '@/assets/imgs/workflow/startNewConversationLeft.png';
import startNewConversationRight from '@/assets/imgs/workflow/startNewConversationRight.png';
import chatCopied from '@/assets/imgs/chat/btn_chat_copied.png';
import feedbackPng from '@/assets/imgs/chat/btn_chat_feedback.png';
import chatLike from '@/assets/imgs/chat/btn_chat_like.png';
import chatDislike from '@/assets/imgs/chat/btn_chat_dislike.png';
import chatCopy from '@/assets/imgs/chat/btn_chat_copy.png';
import chatLiked from '@/assets/imgs/chat/btn_chat_liked.png';
import chatDisliked from '@/assets/imgs/chat/btn_chat_disliked.png';
import chatRefreshIcon from '@/assets/imgs/workflow/chat-refresh-icon.png';
import chatIgnoreNormal from '@/assets/imgs/chat/chat-ignore-normal.svg';
import chatIgnoreActive from '@/assets/imgs/chat/chat-ignore-active.svg';
import chatEndRoundNormal from '@/assets/imgs/chat/chat-end-round-normal.svg';
import chatEndRoundActive from '@/assets/imgs/chat/chat-end-round-active.svg';

// Chat Input 模块图标 (复用已有图标，不需要重复导入)

// Edge 模块图标
import edgeDeleteIcon from '@/assets/imgs/workflow/edge-delete-icon.png';

// Chat Result 模块图标
import resultCopyIcon from '@/assets/imgs/workflow/result-copy-icon.png';
import chatResultOpenIcon from '@/assets/imgs/workflow/chat-result-open.png';
import noRunningResultIcon from '@/assets/imgs/workflow/no-running--result-icon.png';

// Code IDEA 模块图标
import whiteCloseIcon from '@/assets/imgs/workflow/white-close-icon.png';
import codeRunIcon from '@/assets/imgs/workflow/code-run-icon.png';
import codeIdeaAicode from '@/assets/imgs/workflow/code-idea-aicode.png';
import autoMaticallyGenerate from '@/assets/imgs/workflow/auto-matically-generate.svg';
import codeIdeaAicodeBg from '@/assets/imgs/workflow/code-idea-aicodeBg.png';
import codeIdeaAisend from '@/assets/imgs/workflow/code-idea-aisend.png';
import codeIdeaRefresh from '@/assets/imgs/workflow/code-idea-refresh.png';
import codeIdeaCodethink from '@/assets/imgs/workflow/code-idea-codethink.png';
import codeIdeaRunningBg from '@/assets/imgs/workflow/code-idea-runningBg.png';
import codeIdeaCodegen from '@/assets/imgs/workflow/code-idea-codegen.png';
import codeIdeaArrowLeft from '@/assets/imgs/workflow/code-idea-arrowLeft.png';
import codeIdeaRunSuccess from '@/assets/imgs/workflow/code-idea-run-success.png';

// Debugger Check 模块图标
import modalClose from '@/assets/imgs/workflow/modal-close.png';
import operationResultIcon from '@/assets/imgs/workflow/operation-result-icon.png';
import restartIcon from '@/assets/imgs/workflow/restart-icon.png';

// Node Detail 模块图标
// 复用已有的modalClose图标

// Single Node Debugging 模块图标
import inputRemoveIcon from '@/assets/imgs/workflow/input-remove-icon.png';

// Version Management 模块图标
import releaseResultIcon from '@/assets/imgs/workflow/release-result-icon.png';
import pointIcon from '@/assets/imgs/workflow/dot-icon.png';
import selectedPointIcon from '@/assets/imgs/workflow/select-dot-icon.png';
import wechatIcon from '@/assets/imgs/workflow/wechat-icon.png';
import mcpIcon from '@/assets/imgs/workflow/mcp-icon.png';
import iflytekCloudIcon from '@/assets/imgs/workflow/iflytekCloud-icon.png';
// import iflytekIcon from '@/assets/imgs/workflow/iflytek-icon.png';
import agentHubIcon from '@/assets/imgs/workflow/agent-hub-icon.svg';

// Add Plugin 模块图标
import addPluginFormSelect from '@/assets/imgs/main/icon_nav_dropdown.svg';
import addPluginSearch from '@/assets/imgs/file/icon_zhishi_search.png';
import addPluginPublishIcon from '@/assets//imgs/workflow/publish-icon.png';
import addPluginToolModalAdd from '@/assets/imgs/workflow/tool-modal-add.png';
import addPluginFlowBackIcon from '@/assets/imgs/upload/icon_zhishi_arrow-left.png';
import addPluginToolOperateMore from '@/assets/imgs/workflow/tool-operate-more.png';

// Add Knowledge 模块图标
import addKnowledgeSearch from '@/assets/imgs/workflow/search-icon.svg';
import addKnowledgeKnowledgeIcon from '@/assets/imgs/workflow/knowledgeIcon.png';
import addKnowledgeListEmpty from '@/assets/imgs/workflow/knowledge-list-empty.png';

// Clear Flow Canvas 模块图标
import flowClearIcon from '@/assets/imgs/workflow/flow-clear-icon.png';

// Knowledge Detail 模块图标
import knowledgeDetailClose from '@/assets/imgs/workflow/modal-close.png';
import knowledgeDetailFolderIcon from '@/assets/imgs/knowledge/folder_icon.svg';
import knowledgeDetailSearch from '@/assets/imgs/file/icon_zhishi_search.png';
import knowledgeDetailRightarow from '@/assets/imgs/knowledge/btn_zhishi_rightarow.png';
import knowledgeDetailArrowLeft from '@/assets/imgs/knowledge/icon_zhishi_arrow-left.png';
import knowledgeDetailSelect from '@/assets/imgs/knowledge/icon_nav_dropdown.png';
import knowledgeDetailDownload from '@/assets/imgs/knowledge/icon_zhishi_download.png';
import knowledgeDetailUseradd from '@/assets/imgs/knowledge/icon_zhishi_useradd.png';
import knowledgeDetailTarget from '@/assets/imgs/knowledge/icon_zhishi_target_act_1.png';
import knowledgeDetailText from '@/assets/imgs/knowledge/icon_zhishi_text.png';
import knowledgeDetailOrder from '@/assets/imgs/knowledge/icon_zhishi_order.png';

// 图标集合类型定义
interface AdvancedConfigIcons {
  close: string;
  promptOptimization: string;
  inputAdd: string;
  remove: string;
  formSelect: string;
  characterPortrait: string;
  uploadAct: string;
  advancedConfigurationUpload: string;
  backgroundClose: string;
  conversationStarter: string;
  problemSuggestion: string;
  speechToText: string;
  likeAndDislike: string;
  characterVoice: string;
  settingBackground: string;
  editVcn: string;
}

interface ChatContentIcons {
  chatUser: string;
  chatLoading: string;
  startNewConversationLeft: string;
  startNewConversationRight: string;
  chatCopied: string;
  feedback: string;
  chatLike: string;
  chatDislike: string;
  chatCopy: string;
  chatLiked: string;
  chatDisliked: string;
  chatRefresh: string;
  chatIgnoreNormal: string;
  chatIgnoreActive: string;
  chatEndRoundNormal: string;
  chatEndRoundActive: string;
}

interface ChatInputIcons {
  chatLoading: string;
  remove: string;
}

interface EdgeIcons {
  delete: string;
}

interface ChatResultIcons {
  resultCopy: string;
  chatResultOpen: string;
  noRunningResult: string;
}

interface CodeIdeaIcons {
  close: string;
  codeRun: string;
  aiCode: string;
  autoGenerate: string;
  aiCodeBg: string;
  aiSend: string;
  refresh: string;
  codeThink: string;
  runningBg: string;
  codeGen: string;
  arrowLeft: string;
  runSuccess: string;
}

interface DebuggerCheckIcons {
  close: string;
  operationResult: string;
  restart: string;
}

interface NodeDetailIcons {
  close: string;
}

interface SingleNodeDebuggingIcons {
  close: string;
  trialRun: string;
  chatLoading: string;
  remove: string;
}

interface VersionManagementIcons {
  close: string;
  releaseResult: string;
  point: string;
  selectedPoint: string;
  wechat: string;
  mcp: string;
  iflytekCloud: string;
  iflytek: string;
}

interface AddPluginIcons {
  formSelect: string;
  search: string;
  publish: string;
  toolModalAdd: string;
  flowBack: string;
  toolOperateMore: string;
}

interface AddKnowledgeIcons {
  search: string;
  knowledge: string;
  listEmpty: string;
}

interface ChatDebuggerIcons {
  close: string;
  trialRun: string;
  chatListTip: string;
  switchUserChatPageActive: string;
  vms: string;
  message: string;
  chatContent: ChatContentIcons;
  chatInput: ChatInputIcons;
}

interface ClearFlowCanvasIcons {
  flowClear: string;
}

interface KnowledgeDetailIcons {
  close: string;
  folder: string;
  search: string;
  rightarow: string;
  arrowLeft: string;
  select: string;
  download: string;
  useradd: string;
  target: string;
  text: string;
  order: string;
}
//node-operation图标
import nodeEditPng from '@/assets/imgs/workflow/node-edit.png';
import nodeDebuggerIcon from '@/assets/imgs/workflow/node-debugger-icon.png';
import dotSvg from '@/assets/imgs/workflow/dot.svg';
import copySvg from '@/assets/imgs/workflow/copy.svg';
import remarkSvg from '@/assets/imgs/workflow/remark.svg';

interface NodeOperationIcons {
  nodeEdit: string;
  nodeDebugger: string;
  dot: string;
  copy: string;
  remark: string;
}

//Node Debugger 模块图标
import nodeOperationSuccessBg from '@/assets/imgs/workflow/node-operation-success-bg.png';
import nodeOperationRunningBg from '@/assets/imgs/workflow/node-operation-running-bg.png';
import nodeOperationCancelBg from '@/assets/imgs/workflow/node-operation-cancel-bg.png';
import nodeOperationFailBg from '@/assets/imgs/workflow/node-operation-fail-bg.png';
import nodeOperationSuccess from '@/assets/imgs/workflow/node-operation-success.png';
import nodeOperationFailed from '@/assets/imgs/workflow/node-operation-failed.png';
import nodeOperationRunning from '@/assets/imgs/workflow/node-operation-running.png';
import nodeOperationCancel from '@/assets/imgs/workflow/node-operation-cancel.png';
import nodeOperationSuccessArrowRight from '@/assets/imgs/workflow/node-operation-success-arrowRight.png';
import debuggerResultIconPng from '@/assets/imgs/workflow/debugger-result-icon.png';
import close from '@/assets/imgs/workflow/modal-close.png';

interface NodeDebuggerIcons {
  nodeOperationSuccessBg: string;
  nodeOperationRunningBg: string;
  nodeOperationCancelBg: string;
  nodeOperationFailBg: string;
  nodeOperationSuccess: string;
  nodeOperationFailed: string;
  nodeOperationRunning: string;
  nodeOperationCancel: string;
  nodeOperationSuccessArrowRight: string;
  debuggerResultIconPng: string;
  close: string;
  resultCopyIcon: string;
}

//panel图标
import zoomOutIcon from '@/assets/imgs/workflow/zoom-out-icon.png';
import zoomInIcon from '@/assets/imgs/workflow/zoom-in-icon.png';
import revocationIcon from '@/assets/imgs/workflow/revocation-icon.png';
import flowPositionIcon from '@/assets/imgs/workflow/flow-position-icon.png';
import flowAbbreviationIcon from '@/assets/imgs/workflow/flow-abbreviation-icon.png';
import flowAdaptiveIcon from '@/assets/imgs/workflow/flow-adaptive-icon.png';
import flowOptimizeLayoutIcon from '@/assets/imgs/workflow/flow-optimize-layout.png';
import flowCurveIcon from '@/assets/imgs/workflow/flow-curve-icon.png';
import flowPolylineIcon from '@/assets/imgs/workflow/flow-polyline-icon.png';
import flowReductionIcon from '@/assets/imgs/workflow/flow-reduction-icon.png';
import flowCopyIcon from '@/assets/imgs/workflow/flow-copy-icon.png';
import flowHelpDoc from '@/assets/imgs/workflow/flow-help-doc.png';
import autonomousModeIcon from '@/assets/imgs/workflow/autonomous-mode.png';
import followModeIcon from '@/assets/imgs/workflow/follow-mode.png';
import beginnerGuideClose from '@/assets/imgs/workflow/beginner-guide-close.png';
import remarkPng from '@/assets/imgs/workflow/remark.png';
import mousePng from '@/assets/imgs/workflow/mouse.svg';
import keyboardPng from '@/assets/imgs/workflow/keyboard.svg';
import mouseBigPng from '@/assets/imgs/workflow/mouse-big.svg';
import keyboardBigPng from '@/assets/imgs/workflow/keyboard-big.svg';
import mouseBigActivePng from '@/assets/imgs/workflow/mouse-big-active.svg';
import keyboardBigActivePng from '@/assets/imgs/workflow/keyboard-big-active.svg';
import editVcnIcon from '@/assets/imgs/workflow/edit-voice.svg';

interface PanelIcons {
  zoomOut: string;
  zoomIn: string;
  revocation: string;
  flowPosition: string;
  flowAbbreviation: string;
  flowAdaptive: string;
  flowOptimizeLayout: string;
  flowCurve: string;
  flowPolyline: string;
  flowClear: string;
  flowReduction: string;
  flowCopy: string;
  flowHelpDoc: string;
  autonomousMode: string;
  followMode: string;
  beginnerGuideClose: string;
  remark: string;
  mouse: string;
  keyboard: string;
  mouseBig: string;
  keyboardBig: string;
  mouseBigActive: string;
  keyboardBigActive: string;
  editVcn: string;
}

// 工作流图标集合接口
export interface WorkflowIcons {
  advancedConfig: AdvancedConfigIcons;
  chatDebugger: ChatDebuggerIcons;
  edge: EdgeIcons;
  chatResult: ChatResultIcons;
  codeIdea: CodeIdeaIcons;
  debuggerCheck: DebuggerCheckIcons;
  nodeDetail: NodeDetailIcons;
  singleNodeDebugging: SingleNodeDebuggingIcons;
  versionManagement: VersionManagementIcons;
  addPlugin: AddPluginIcons;
  addKnowledge: AddKnowledgeIcons;
  clearFlowCanvas: ClearFlowCanvasIcons;
  knowledgeDetail: KnowledgeDetailIcons;
  promptOptimize: PromptOptimizeIcons;
  selectAgentPrompt: SelectAgentPromptIcons;
  selectLlmPrompt: SelectLlmPromptIcons;
  setDefaultValue: SetDefaultValueIcons;
  agent: AgentIcons;
  code: CodeIcons;
  panel: PanelIcons;
  nodeOperation: NodeOperationIcons;
  nodeDebugger: NodeDebuggerIcons;
  // 后续可以添加其他模块的图标
  // nodeIcons: NodeIcons;
  // toolbarIcons: ToolbarIcons;
}

// 导出统一的图标对象
export const Icons: WorkflowIcons = {
  advancedConfig: {
    close: closeIcon,
    promptOptimization: promptOptimizationIcon,
    inputAdd: inputAddIcon,
    remove: removeIcon,
    formSelect: formSelectIcon,
    characterPortrait: characterPortraitIcon,
    uploadAct: uploadActIcon,
    advancedConfigurationUpload: advancedConfigurationUploadIcon,
    backgroundClose: backgroundCloseIcon,
    conversationStarter: conversationStarterIcon,
    problemSuggestion: problemSuggestionIcon,
    speechToText: speechToTextIcon,
    likeAndDislike: likeAndDislikeIcon,
    characterVoice: characterVoiceIcon,
    settingBackground: settingBackgroundIcon,
    editVcn: editVcnIcon,
  },
  chatDebugger: {
    close: closeIcon,
    trialRun: trialRunIcon,
    chatListTip: chatListTipIcon,
    switchUserChatPageActive: switchUserChatPageActiveIcon,
    vms: vmsIcon,
    message: messageIcon,
    chatContent: {
      chatUser: chatUserIcon,
      chatLoading: chatLoadingIcon,
      startNewConversationLeft: startNewConversationLeft,
      startNewConversationRight: startNewConversationRight,
      chatCopied: chatCopied,
      feedback: feedbackPng,
      chatLike: chatLike,
      chatDislike: chatDislike,
      chatCopy: chatCopy,
      chatLiked: chatLiked,
      chatDisliked: chatDisliked,
      chatRefresh: chatRefreshIcon,
      chatIgnoreNormal: chatIgnoreNormal,
      chatIgnoreActive: chatIgnoreActive,
      chatEndRoundNormal: chatEndRoundNormal,
      chatEndRoundActive: chatEndRoundActive,
    },
    chatInput: {
      chatLoading: chatLoadingIcon, // 复用 chatContent 的图标
      remove: removeIcon, // 复用 advancedConfig 的图标
    },
  },
  edge: {
    delete: edgeDeleteIcon,
  },
  chatResult: {
    resultCopy: resultCopyIcon,
    chatResultOpen: chatResultOpenIcon,
    noRunningResult: noRunningResultIcon,
  },
  codeIdea: {
    close: whiteCloseIcon,
    codeRun: codeRunIcon,
    aiCode: codeIdeaAicode,
    autoGenerate: autoMaticallyGenerate,
    aiCodeBg: codeIdeaAicodeBg,
    aiSend: codeIdeaAisend,
    refresh: codeIdeaRefresh,
    codeThink: codeIdeaCodethink,
    runningBg: codeIdeaRunningBg,
    codeGen: codeIdeaCodegen,
    arrowLeft: codeIdeaArrowLeft,
    runSuccess: codeIdeaRunSuccess,
  },
  debuggerCheck: {
    close: modalClose,
    operationResult: operationResultIcon,
    restart: restartIcon,
  },
  nodeDetail: {
    close: modalClose, // 复用debuggerCheck的close图标
  },
  singleNodeDebugging: {
    close: modalClose, // 复用debuggerCheck的close图标
    trialRun: trialRunIcon,
    chatLoading: chatLoadingIcon,
    remove: inputRemoveIcon,
  },
  versionManagement: {
    close: modalClose, // 复用debuggerCheck的close图标
    releaseResult: releaseResultIcon,
    point: pointIcon,
    selectedPoint: selectedPointIcon,
    wechat: wechatIcon,
    mcp: mcpIcon,
    iflytekCloud: iflytekCloudIcon,
    // iflytek: iflytekIcon,
    iflytek: agentHubIcon,
  },
  addPlugin: {
    formSelect: addPluginFormSelect,
    search: addPluginSearch,
    publish: addPluginPublishIcon,
    toolModalAdd: addPluginToolModalAdd,
    flowBack: addPluginFlowBackIcon,
    toolOperateMore: addPluginToolOperateMore,
  },
  addKnowledge: {
    search: addKnowledgeSearch,
    knowledge: addKnowledgeKnowledgeIcon,
    listEmpty: addKnowledgeListEmpty,
  },
  knowledgeDetail: {
    close: knowledgeDetailClose,
    folder: knowledgeDetailFolderIcon,
    search: knowledgeDetailSearch,
    rightarow: knowledgeDetailRightarow,
    arrowLeft: knowledgeDetailArrowLeft,
    select: knowledgeDetailSelect,
    download: knowledgeDetailDownload,
    useradd: knowledgeDetailUseradd,
    target: knowledgeDetailTarget,
    text: knowledgeDetailText,
    order: knowledgeDetailOrder,
  },
  promptOptimize: {
    reTry: promptOptimizeReTry,
  },
  selectAgentPrompt: {
    close: selectAgentPromptClose,
    search: selectAgentPromptSearch,
    knowledgeListEmpty: selectAgentPromptKnowledgeListEmpty,
  },
  selectLlmPrompt: {
    close: selectLlmPromptClose,
    search: selectLlmPromptSearch,
    toolModalAdd: selectLlmPromptToolModalAdd,
    publishIcon: selectLlmPromptPublishIcon,
    knowledgeListEmpty: selectLlmPromptKnowledgeListEmpty,
  },
  setDefaultValue: {
    close: setDefaultValueClose,
  },
  agent: {
    toolIcon: agentToolIcon,
    knowledgeIcon: agentKnowledgeIcon,
    inputAddIcon: agentInputAddIcon,
    promptLibraryIcon: agentPromptLibraryIcon,
    questionMark: agentQuestionMark,
    zoomOutIcon: agentZoomOutIcon,
    zoomInIcon: agentZoomInIcon,
    remove: agentRemove,
    knowledgeListDelete: agentKnowledgeListDelete,
    oneClickUpdate: agentOneClickUpdate,
  },
  code: {
    editCode: codeEditCode,
  },
  clearFlowCanvas: {
    flowClear: flowClearIcon,
  },
  panel: {
    zoomOut: zoomOutIcon,
    zoomIn: zoomInIcon,
    revocation: revocationIcon,
    flowPosition: flowPositionIcon,
    flowAbbreviation: flowAbbreviationIcon,
    flowAdaptive: flowAdaptiveIcon,
    flowOptimizeLayout: flowOptimizeLayoutIcon,
    flowCurve: flowCurveIcon,
    flowPolyline: flowPolylineIcon,
    flowClear: flowClearIcon,
    flowReduction: flowReductionIcon,
    flowCopy: flowCopyIcon,
    flowHelpDoc: flowHelpDoc,
    autonomousMode: autonomousModeIcon,
    followMode: followModeIcon,
    beginnerGuideClose: beginnerGuideClose,
    remark: remarkPng,
    mouse: mousePng,
    keyboard: keyboardPng,
    mouseBig: mouseBigPng,
    keyboardBig: keyboardBigPng,
    mouseBigActive: mouseBigActivePng,
    keyboardBigActive: keyboardBigActivePng,
    editVcn: editVcnIcon,
  },
  nodeOperation: {
    nodeEdit: nodeEditPng,
    nodeDebugger: nodeDebuggerIcon,
    dot: dotSvg,
    copy: copySvg,
    remark: remarkSvg,
  },
  nodeDebugger: {
    nodeOperationSuccessBg: nodeOperationSuccessBg,
    nodeOperationRunningBg: nodeOperationRunningBg,
    nodeOperationCancelBg: nodeOperationCancelBg,
    nodeOperationFailBg: nodeOperationFailBg,
    nodeOperationSuccess: nodeOperationSuccess,
    nodeOperationFailed: nodeOperationFailed,
    nodeOperationRunning: nodeOperationRunning,
    nodeOperationCancel: nodeOperationCancel,
    nodeOperationSuccessArrowRight: nodeOperationSuccessArrowRight,
    debuggerResultIconPng: debuggerResultIconPng,
    close: close,
    resultCopyIcon: resultCopyIcon,
  },
};

// 导出类型以便其他文件使用
export type {
  AdvancedConfigIcons,
  AddPluginIcons,
  AddKnowledgeIcons,
  KnowledgeDetailIcons,
  PanelIcons,
  NodeOperationIcons,
};

// 默认导出
export default Icons;
