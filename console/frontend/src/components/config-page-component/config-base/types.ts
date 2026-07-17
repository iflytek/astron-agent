import { robotType } from '@/types/typesServices';

// 基础配置组件的属性接口
export interface ChatProps {
  currentRobot: robotType;
  setCurrentRobot: (value: any) => void;
  currentTab: string;
  setCurrentTab: (value: string) => void;
}

// 树节点接口
export interface TreeNode {
  id?: string | number;
  files?: TreeNode[];
  [key: string]: any;
}

// 知识叶子节点接口
export interface KnowledgeLeaf {
  id: string | number;
  charCount?: number;
  knowledgeCount?: number;
  [key: string]: any;
}

// 知识接口
export interface Knowledge {
  id: string | number;
  charCount?: number;
  knowledgeCount?: number;
  [key: string]: any;
}

// 数据集项接口
export interface DatasetItem {
  id: string | number;
  [key: string]: any;
}

// 页面数据项接口
export interface PageDataItem {
  id: string | number;
  [key: string]: any;
}

// MaaS数据集项接口
export interface MaasDatasetItem {
  id: string | number;
  [key: string]: any;
}

// 模型信息接口
export interface ModelInfo {
  hasAuthorization: boolean;
  llmId: number;
  modelId: number;
  api: string;
  llmSource: string;
  patchId: any[];
  serviceId: string;
  name: string;
  value: string;
  configs: any[];
}

// 模型配置接口
export interface ModelConfig {
  plan: ModelInfo;
  summary: ModelInfo;
}

// 基础模型配置接口
export interface BaseModelConfig {
  visible: boolean;
  isSending: boolean;
  optionsVisible: boolean;
  modelInfo: ModelConfig;
}

// Bot创建声音配置接口
export interface BotCreateActiveV {
  cn: string;
  en: string;
  speed: number;
}

// 模型列表项接口
export interface ModelListItem {
  model: string;
  promptAnswerCompleted: boolean;
}

// 提示列表项接口
export interface PromptListItem {
  prompt: string;
  promptAnswerCompleted: boolean;
}

// 选择的工具配置接口
export interface ChoosedAlltool {
  text_to_image: boolean;
  codeinterpreter: boolean;
}

// 声音转文本配置接口
export interface TextToSpeech {
  enabled: boolean;
  vcn: string;
}

// 仓库配置接口
export interface RepoConfig {
  topK: number;
  scoreThreshold: number;
}

// 扩展或收缩配置接口
export interface GrowOrShrinkConfig {
  [key: string]: boolean;
  prompt: boolean;
  tools: boolean;
  knowledges: boolean;
  chatStrong: boolean;
  flows: boolean;
}

// VCN列表项接口
export interface VcnListItem {
  vcn: string;
}

// API调用参数接口
export interface ApiCallParams {
  obj: any;
  api: (params: any) => Promise<any>;
  successMessage: string;
  shouldNavigateToAgent?: boolean;
}

// 构建请求对象参数接口
export interface BuildRequestObjectParams {
  isRag: boolean;
  useFormValues: boolean;
  isForPublish?: boolean;
}
