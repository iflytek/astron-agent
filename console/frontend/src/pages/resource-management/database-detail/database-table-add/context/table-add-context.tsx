import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useRef,
  ReactNode,
  RefObject,
} from 'react';
import { FormInstance } from 'antd';
import { DatabaseItem, TableField } from '@/types/database';

// 基础表单值类型
interface BaseFormValues {
  name: string;
  description: string;
}

// 定义状态类型
interface TableAddState {
  // 表单相关
  saveLoading: boolean;
  isCheck: boolean;
  importModalOpen: boolean;

  // 数据源相关
  dataSource: TableField[];
  originTableData: TableField[];

  // 关键词
  databaseKeywords: string[];

  // 组件props
  isModule: boolean;
  info?: DatabaseItem;
}

// 定义Action类型
type TableAddAction =
  | { type: 'SET_SAVE_LOADING'; payload: boolean }
  | { type: 'SET_IS_CHECK'; payload: boolean }
  | { type: 'SET_IMPORT_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_DATA_SOURCE'; payload: TableField[] }
  | { type: 'SET_ORIGIN_TABLE_DATA'; payload: TableField[] }
  | { type: 'SET_DATABASE_KEYWORDS'; payload: string[] }
  | {
      type: 'SET_COMPONENT_PROPS';
      payload: { isModule: boolean; info?: DatabaseItem };
    }
  | { type: 'RESET_STATE' };

// 初始状态
const initialState: TableAddState = {
  saveLoading: false,
  isCheck: false,
  importModalOpen: false,
  dataSource: [],
  originTableData: [],
  databaseKeywords: [],
  isModule: false,
  info: undefined,
};

// Reducer函数
function tableAddReducer(
  state: TableAddState,
  action: TableAddAction
): TableAddState {
  switch (action.type) {
    case 'SET_SAVE_LOADING':
      return { ...state, saveLoading: action.payload };

    case 'SET_IS_CHECK':
      return { ...state, isCheck: action.payload };

    case 'SET_IMPORT_MODAL_OPEN':
      return { ...state, importModalOpen: action.payload };

    case 'SET_DATA_SOURCE':
      return { ...state, dataSource: action.payload };

    case 'SET_ORIGIN_TABLE_DATA':
      return { ...state, originTableData: action.payload };

    case 'SET_DATABASE_KEYWORDS':
      return { ...state, databaseKeywords: action.payload };

    case 'SET_COMPONENT_PROPS':
      return {
        ...state,
        isModule: action.payload.isModule,
        info: action.payload.info,
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Context类型定义
interface TableAddContextType {
  state: TableAddState;
  dispatch: React.Dispatch<TableAddAction>;
  baseForm: FormInstance<BaseFormValues>;
  databaseRef: RefObject<{ scrollTableBottom: () => void }>;

  // 便捷方法
  actions: {
    setSaveLoading: (loading: boolean) => void;
    setIsCheck: (check: boolean) => void;
    setImportModalOpen: (open: boolean) => void;
    setDataSource: (dataSource: TableField[]) => void;
    setOriginTableData: (data: TableField[]) => void;
    setDatabaseKeywords: (keywords: string[]) => void;
    setComponentProps: (isModule: boolean, info?: DatabaseItem) => void;
    resetState: () => void;
  };
}

// 创建Context
const TableAddContext = createContext<TableAddContextType | null>(null);

// Provider组件
interface TableAddProviderProps {
  children: ReactNode;
  baseForm: FormInstance<BaseFormValues>;
}

export const TableAddProvider: React.FC<TableAddProviderProps> = ({
  children,
  baseForm,
}) => {
  const [state, dispatch] = useReducer(tableAddReducer, initialState);

  // 创建ref
  const databaseRef = useRef<{ scrollTableBottom: () => void }>(
    {} as { scrollTableBottom: () => void }
  );

  // 便捷方法 - 使用useMemo确保actions对象引用稳定
  const actions = useMemo(
    () => ({
      setSaveLoading: (loading: boolean): void => {
        dispatch({ type: 'SET_SAVE_LOADING', payload: loading });
      },

      setIsCheck: (check: boolean): void => {
        dispatch({ type: 'SET_IS_CHECK', payload: check });
      },

      setImportModalOpen: (open: boolean): void => {
        dispatch({ type: 'SET_IMPORT_MODAL_OPEN', payload: open });
      },

      setDataSource: (dataSource: TableField[]): void => {
        dispatch({ type: 'SET_DATA_SOURCE', payload: dataSource });
      },

      setOriginTableData: (data: TableField[]): void => {
        dispatch({ type: 'SET_ORIGIN_TABLE_DATA', payload: data });
      },

      setDatabaseKeywords: (keywords: string[]): void => {
        dispatch({ type: 'SET_DATABASE_KEYWORDS', payload: keywords });
      },

      setComponentProps: (isModule: boolean, info?: DatabaseItem): void => {
        dispatch({ type: 'SET_COMPONENT_PROPS', payload: { isModule, info } });
      },

      resetState: (): void => {
        dispatch({ type: 'RESET_STATE' });
      },
    }),
    [dispatch]
  );

  const value: TableAddContextType = useMemo(
    () => ({
      state,
      dispatch,
      baseForm,
      databaseRef,
      actions,
    }),
    [state, dispatch, baseForm, databaseRef, actions]
  );

  return (
    <TableAddContext.Provider value={value}>
      {children}
    </TableAddContext.Provider>
  );
};

// Hook to use the context
export const useTableAddContext = (): TableAddContextType => {
  const context = useContext(TableAddContext);
  if (!context) {
    throw new Error('useTableAddContext must be used within TableAddProvider');
  }
  return context;
};

// 便捷hooks
export const useTableAddState = (): TableAddState => {
  const { state } = useTableAddContext();
  return state;
};

export const useTableAddActions = (): TableAddContextType['actions'] => {
  const { actions } = useTableAddContext();
  return actions;
};

export const useTableAddForm = (): FormInstance<BaseFormValues> => {
  const { baseForm } = useTableAddContext();
  return baseForm;
};

export const useTableAddRef = (): RefObject<{
  scrollTableBottom: () => void;
}> => {
  const { databaseRef } = useTableAddContext();
  return databaseRef;
};
