// 分类键枚举
export enum CategoryKey {
  MODEL_CATEGORY = 'modelCategory',
  LANGUAGE_SUPPORT = 'languageSupport',
  CONTEXT_LENGTH_TAG = 'contextLengthTag',
  MODEL_SCENARIO = 'modelScenario',
}

// 分类来源枚举
export enum CategorySource {
  SYSTEM = 'SYSTEM',
  USER = 'USER',
}

// 模型状态枚举
export enum ModelStatus {
  DISABLED = 0,
  ENABLED = 1,
}

// 模型上架状态枚举
export enum ShelfStatus {
  ON_SHELF = 0,
  WAIT_OFF_SHELF = 1,
  OFF_SHELF = 2,
}

// 模型类型枚举
export enum ModelType {
  All = 0,
  OFFICIAL = 1,
  PERSONAL = 2,
}

// 模型来源枚举
export enum ModelSource {
  SYSTEM = 0,
  USER = 1,
}

// LLM 来源枚举
export enum LLMSource {
  CUSTOM = 0, // 自定义模型
  OFFICIAL = 1, // 官方模型
}

// 模型类型枚举
export enum ModelCreateType {
  THIRD_PARTY = 1, // 第三方模型
  LOCAL = 2, // 本地模型
}

export enum ModelProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  DEEPSEEK = 'deepseek',
  MINIMAX = 'minimax',
  ZHIPU = 'zhipu',
  QWEN = 'qwen',
  MOONSHOT = 'moonshot',
  CHATGPT = 'chatgpt',
  DOUBAO = 'doubao',
}

export enum LocalModelStatus {
  RUNNING = 1, // 运行中
  PENDING = 2, // 待发布
  FAILED = 3, // 发布失败
}

// 模型操作类型
export type ModelOperation =
  | 'create'
  | 'edit'
  | 'delete'
  | 'toggleShelf'
  | 'view';

// 约束内容项
export interface ConstraintContentItem {
  name: string | number;
  label?: string;
  value?: boolean;
  desc?: string;
}

// 模型配置参数
export interface ModelConfigParam {
  standard: boolean;
  constraintType: 'range' | 'switch';
  default: number | boolean;
  constraintContent: ConstraintContentItem[];
  precision?: number;
  required: boolean;
  name: string;
  fieldType: 'int' | 'float' | 'boolean';
  initialValue: number | boolean;
  key: string;
  desc?: string;
  id?: string | number;
  min?: number;
  max?: number;
  keyErrMsg?: string;
  nameErrMsg?: string;
}

// 分类树节点
export interface CategoryNode {
  id: number;
  key: CategoryKey | string; // 支持枚举值和字符串，向后兼容
  name: string;
  sortOrder: number;
  children: CategoryNode[];
  source: CategorySource; // 支持枚举和字符串
}

// 分类树API响应类型 - 直接返回数组
export type CategoryTreeResponse = CategoryNode[];

// 模型信息
export interface ModelInfo {
  id: number;
  name: string;
  provider?: ModelProviderType | string | null;
  serviceId: string;
  serverId: string;
  domain: string;
  patchId: string;
  type: ModelCreateType;
  config: string; // JSON 字符串，解析后为 ModelConfigParam[]
  source: number;
  url: string;
  appId: string | null;
  licChannel: string;
  llmSource: LLMSource;
  llmId: number;
  status: LocalModelStatus;
  info: string | null;
  icon: string;
  tag: string[];
  modelId: number;
  pretrainedModel: string | null;
  modelType: number;
  color: string | null;
  isThink: boolean;
  multiMode: boolean;
  address: string | null;
  desc: string;
  createTime: string;
  updateTime: string;
  categoryTree: CategoryNode[] | null; // detail 接口可能返回 null
  enabled: boolean;
  userName: string;
  apiKey: string | null;
  shelfStatus: ShelfStatus;
  shelfOffTime: string | null;
  tags?: string[];
  acceleratorCount: number;
}

// 模型列表响应数据
export interface ModelListData {
  records: ModelInfo[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

// 模型筛选参数
export interface ModelFilterParams {
  type: ModelType; // 模型类型：0-全部，1-公共模型，2-个人模型
  page: number; // 页码
  filter: LLMSource; // 筛选类型：0-全部；1-自定义模型
  pageSize: number; // 页数
  name?: string; // 搜索条件
}

// 模型创建/编辑表单数据
export interface ModelFormData {
  modelName: string;
  modelDesc: string;
  interfaceAddress: string;
  apiKEY: string;
  domain: string;
  provider?: ModelProviderType | string;
  currentTag?: string;
  tags?: string[];
  categorySystemIds?: number[];
  categoryCustom?: CategoryNode[];
  languageSystemId?: number;
  contextLengthSystemId?: number;
  sceneSystemIds?: number[];
  sceneCustom?: CategoryNode[];
  pid?: number;
  customName?: string;
  isThink?: boolean;
}

// 模型卡片组件属性
export interface ModelCardProps {
  model: ModelInfo;
  filterType?: number;
  onEdit?: (model: ModelInfo) => void;
  onDelete?: (model: ModelInfo) => void;
  onToggleShelf?: (model: ModelInfo) => void;
}

// 模型列表组件属性
export interface ModelCardListProps {
  models: ModelInfo[];
  showCreateCard?: boolean;
  filterType?: number;
  loading?: boolean;
  onCreateModel?: () => void;
  onEditModel?: (model: ModelInfo) => void;
  onDeleteModel?: (model: ModelInfo) => void;
  onToggleShelf?: (model: ModelInfo) => void;
}

// 分类侧边栏组件属性
export interface CategoryAsideProps {
  tree: CategoryNode[];
  onSelect?: (checkedLeaves: CategoryNode[]) => void;
  onContextLengthChange?: (val: number | undefined) => void;
  defaultCheckedNodes?: CategoryNode[];
  defaultContextLength?: number;
  setContextMaxLength?: (val: number) => void;
  loading?: boolean;
  providerFilter?: string;
  providerOptions?: Array<{ label: string; value: string }>;
  onProviderChange?: (provider?: string) => void;
  showContextLength?: boolean;
  showModelStatus?: boolean;
}

// 分类侧边栏组件引用
export interface CategoryAsideRef {
  getCheckedLeafNodes: () => CategoryNode[];
  getContextLengthValue: () => number | undefined;
}

// 模型弹窗组件属性
export interface ModalComponentProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (data: ModelFormData) => void;
  editData?: ModelInfo | null;
  loading?: boolean;
}

// 模型参数表格组件属性
export interface ModelParamsTableProps {
  config: ModelConfigParam[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}

// 整数步进器组件属性
export interface IntegerStepProps {
  max: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
}

// 模型管理页面状态
export interface ModelManagementState {
  activeTab: string;
  models: ModelInfo[];
  loading: boolean;
  total: number;
  current: number;
  size: number;
  filterParams: ModelFilterParams;
  categoryTree: CategoryNode[];
  selectedCategories: CategoryNode[];
  contextLength?: number;
}

// 自定义类别/场景项
export interface CustomItem {
  pid: number; // 官方父id。【其他】选项的id
  customName: string; // 自定义名称
}

// 模型类别请求参数
export interface ModelCategoryReq {
  categorySystemIds?: number[]; // 模型类别id--官方ID
  categoryCustom?: CustomItem; // 自定义类别名称
  sceneSystemIds?: number[]; // 模型场景id--官方ID
  sceneCustom?: CustomItem; // 自定义场景名称
  languageSystemId?: number; // 语言支持id--官方ID
  contextLengthSystemId?: number; // 上下文长度id--官方ID
}

// 配置对象
export interface ConfigObject {
  standard?: boolean; // 是否为标准字段
  constraintType: string; // 约束类型，例如 range、enum、switch 等
  default: unknown; // 参数字段的默认值
  constraintContent: Array<{ name: unknown }>; // 约束内容，范围、枚举值列表等
  name: string; // 参数描述
  fieldType: string; // 参数字段类型，例如 string、int、boolean、float 等
  initialValue: unknown; // 初始值，通常用于字段的初始化
  key: string; // 参数字段对应的唯一 key，参数字段名称
  required: boolean; // 是否为必填字段
  precision?: number; // 精确小数位数（只有字段类型是float才需要）
}

// 模型创建参数
export interface ModelCreateParams {
  endpoint: string; // 接口地址
  apiKey: string; // API密钥
  modelName: string; // 模型名称
  description: string; // 模型描述
  tag: string[]; // 标签
  icon: string; // 图标
  domain: string; // 模型的model_id
  config?: ConfigObject[]; // 模型配置参数
  id?: number; // 更新模型的时候必传
  apiKeyMasked?: boolean; // apikey是否更改，更新模型的时候必传
  modelCategoryReq?: ModelCategoryReq; // 模型分类请求参数
  isThink?: boolean; // 是否开启思考内容
}

// 模型详情查询参数
export interface ModelDetailParams {
  llmSource?: number; // 微调模型：2, 自定义模型：0, 官方模型：1
  modelId?: number; // 模型id
}

// 模型启用/禁用操作类型
export type ModelToggleOption =
  | 'on' // 启用
  | 'off' // 禁用
  | string;

// RSA 公钥响应 - 真实数据显示直接返回字符串
export type RsaPublicKeyResponse = string;

// 模型用量数据
export interface ModelUsageData {
  date: string;
  Total: number;
  L1: number;
  L2: number;
}

// 本地模型文件信息
export interface LocalModelFile {
  modelName: string; // 模型的domain，在新增版本模型的时候此参数赋值给domain
  modelPath: string; // 此字段为debug方便，前端不展示
}

// 本地模型创建/编辑参数
export interface LocalModelParams {
  modelName: string; // 模型名称
  domain: string; // 模型domain
  description: string; // 模型描述
  icon: string; // 图标
  color: string; // 颜色
  id?: number; // 编辑时必传
  modelCategoryReq?: ModelCategoryReq; // 模型分类请求参数
  acceleratorCount: number; // 加速器数量
  modelPath: string; // 模型路径
  config?: ConfigObject[]; // 模型配置参数
}
