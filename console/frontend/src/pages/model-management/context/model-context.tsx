import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  ReactNode,
} from 'react';
import { ModelInfo, CategoryNode } from '@/types/model';

// 定义状态类型
interface ModelState {
  // 模型数据相关
  models: ModelInfo[];
  categoryList: CategoryNode[];
  loading: boolean;
  shelfOffModels: ModelInfo[];

  // 筛选状态
  checkedLeaves: CategoryNode[];
  contextLength?: number;
  contextMaxLength?: number;
  searchInput: string;
  filterType: number;
  providerFilter: string;
  showShelfOnly: boolean;

  // UI状态
  createModalOpen: boolean;
  deleteModalOpen: boolean;
  currentEditModel?: ModelInfo;
}

// 定义Action类型
type ModelAction =
  | { type: 'SET_MODELS'; payload: ModelInfo[] }
  | { type: 'SET_CATEGORY_LIST'; payload: CategoryNode[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SHELF_OFF_MODELS'; payload: ModelInfo[] }
  | { type: 'SET_CHECKED_LEAVES'; payload: CategoryNode[] }
  | { type: 'SET_CONTEXT_LENGTH'; payload?: number }
  | { type: 'SET_CONTEXT_MAX_LENGTH'; payload: number }
  | { type: 'SET_SEARCH_INPUT'; payload: string }
  | { type: 'SET_FILTER_TYPE'; payload: number }
  | { type: 'SET_PROVIDER_FILTER'; payload: string }
  | { type: 'SET_SHOW_SHELF_ONLY'; payload: boolean }
  | { type: 'SET_CREATE_MODAL'; payload: boolean }
  | { type: 'SET_DELETE_MODAL'; payload: boolean }
  | { type: 'SET_CURRENT_EDIT_MODEL'; payload?: ModelInfo }
  | { type: 'RESET_STATE' };

// 初始状态
const initialState: ModelState = {
  models: [],
  categoryList: [],
  loading: false,
  shelfOffModels: [],
  checkedLeaves: [],
  contextLength: undefined,
  contextMaxLength: 100,
  searchInput: '',
  filterType: 0,
  providerFilter: '',
  showShelfOnly: false,
  createModalOpen: false,
  deleteModalOpen: false,
  currentEditModel: undefined,
};

// Reducer
const modelReducer = (state: ModelState, action: ModelAction): ModelState => {
  switch (action.type) {
    case 'SET_MODELS':
      return { ...state, models: action.payload };
    case 'SET_CATEGORY_LIST':
      return { ...state, categoryList: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_SHELF_OFF_MODELS':
      return { ...state, shelfOffModels: action.payload };
    case 'SET_CHECKED_LEAVES':
      return { ...state, checkedLeaves: action.payload };
    case 'SET_CONTEXT_LENGTH':
      return { ...state, contextLength: action.payload };
    case 'SET_CONTEXT_MAX_LENGTH':
      return { ...state, contextMaxLength: action.payload };
    case 'SET_SEARCH_INPUT':
      return { ...state, searchInput: action.payload };
    case 'SET_FILTER_TYPE':
      return { ...state, filterType: action.payload };
    case 'SET_PROVIDER_FILTER':
      return { ...state, providerFilter: action.payload };
    case 'SET_SHOW_SHELF_ONLY':
      return { ...state, showShelfOnly: action.payload };
    case 'SET_CREATE_MODAL':
      return { ...state, createModalOpen: action.payload };
    case 'SET_DELETE_MODAL':
      return { ...state, deleteModalOpen: action.payload };
    case 'SET_CURRENT_EDIT_MODEL':
      return { ...state, currentEditModel: action.payload };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
};

// Context类型定义
interface ModelContextValue {
  state: ModelState;
  actions: {
    setModels: (models: ModelInfo[]) => void;
    setCategoryList: (categories: CategoryNode[]) => void;
    setLoading: (loading: boolean) => void;
    setShelfOffModels: (models: ModelInfo[]) => void;
    setCheckedLeaves: (leaves: CategoryNode[]) => void;
    setContextLength: (length?: number) => void;
    setContextMaxLength: (length: number) => void;
    setSearchInput: (input: string) => void;
    setFilterType: (type: number) => void;
    setProviderFilter: (provider: string) => void;
    setShowShelfOnly: (show: boolean) => void;
    setCreateModal: (open: boolean) => void;
    setDeleteModal: (open: boolean) => void;
    setCurrentEditModel: (model?: ModelInfo) => void;
    resetState: () => void;
    refreshModels?: () => void; // 用于模态框回调
  };
}

// 创建Context
const ModelContext = createContext<ModelContextValue | undefined>(undefined);

// Provider组件
interface ModelProviderProps {
  children: ReactNode;
}

export const ModelProvider: React.FC<ModelProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(modelReducer, initialState);

  const actions = useMemo(
    () => ({
      setModels: (models: ModelInfo[]): void =>
        dispatch({ type: 'SET_MODELS', payload: models }),
      setCategoryList: (categories: CategoryNode[]): void =>
        dispatch({ type: 'SET_CATEGORY_LIST', payload: categories }),
      setLoading: (loading: boolean): void =>
        dispatch({ type: 'SET_LOADING', payload: loading }),
      setShelfOffModels: (models: ModelInfo[]): void =>
        dispatch({ type: 'SET_SHELF_OFF_MODELS', payload: models }),
      setCheckedLeaves: (leaves: CategoryNode[]): void =>
        dispatch({ type: 'SET_CHECKED_LEAVES', payload: leaves }),
      setContextLength: (length?: number): void =>
        dispatch({ type: 'SET_CONTEXT_LENGTH', payload: length }),
      setContextMaxLength: (length: number): void =>
        dispatch({ type: 'SET_CONTEXT_MAX_LENGTH', payload: length }),
      setSearchInput: (input: string): void =>
        dispatch({ type: 'SET_SEARCH_INPUT', payload: input }),
      setFilterType: (type: number): void =>
        dispatch({ type: 'SET_FILTER_TYPE', payload: type }),
      setProviderFilter: (provider: string): void =>
        dispatch({ type: 'SET_PROVIDER_FILTER', payload: provider }),
      setShowShelfOnly: (show: boolean): void =>
        dispatch({ type: 'SET_SHOW_SHELF_ONLY', payload: show }),
      setCreateModal: (open: boolean): void =>
        dispatch({ type: 'SET_CREATE_MODAL', payload: open }),
      setDeleteModal: (open: boolean): void =>
        dispatch({ type: 'SET_DELETE_MODAL', payload: open }),
      setCurrentEditModel: (model?: ModelInfo): void =>
        dispatch({ type: 'SET_CURRENT_EDIT_MODEL', payload: model }),
      resetState: (): void => dispatch({ type: 'RESET_STATE' }),
    }),
    []
  );

  const value = useMemo(
    () => ({
      state,
      actions,
    }),
    [state, actions]
  );

  return (
    <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
  );
};

// Hook
export const useModelContext = (): ModelContextValue => {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error('useModelContext must be used within a ModelProvider');
  }
  return context;
};
