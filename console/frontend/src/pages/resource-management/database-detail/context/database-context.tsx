import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useRef,
  ReactNode,
  RefObject,
} from 'react';
import { DatabaseItem } from '@/types/database';

// 定义状态类型
interface DatabaseState {
  // 数据库详情相关
  dbDetailData: DatabaseItem;

  // 表格相关
  tables: DatabaseItem[];
  tablesLoad: boolean;
  currentSheet: DatabaseItem | null;

  // 测试数据相关
  testDataSource: Record<string, unknown>[];
  testTableLoading: boolean;
  exportLoading: boolean;
  pagination: {
    pageNum: number;
    pageSize: number;
    total: number;
  };

  // UI状态
  dataType: number;
  importModalOpen: boolean;
  createDatabaseOpen: boolean;
  addRowModalOpen: boolean;
}

// 定义Action类型
type DatabaseAction =
  | { type: 'SET_DB_DETAIL'; payload: DatabaseItem }
  | {
      type: 'SET_TABLES';
      payload: { tables: DatabaseItem[]; loading: boolean };
    }
  | { type: 'SET_CURRENT_SHEET'; payload: DatabaseItem | null }
  | {
      type: 'SET_TEST_DATA';
      payload: { data: Record<string, unknown>[]; loading: boolean };
    }
  | { type: 'SET_TEST_TABLE_LOADING'; payload: boolean }
  | {
      type: 'SET_PAGINATION';
      payload: { pageNum: number; pageSize: number; total: number };
    }
  | { type: 'SET_DATA_TYPE'; payload: number }
  | { type: 'SET_EXPORT_LOADING'; payload: boolean }
  | {
      type: 'SET_MODAL_STATE';
      payload: { modal: 'import' | 'createDatabase' | 'addRow'; open: boolean };
    }
  | { type: 'RESET_STATE' };

// 初始状态
const initialState: DatabaseState = {
  dbDetailData: {} as DatabaseItem,
  tables: [],
  tablesLoad: false,
  currentSheet: null,
  testDataSource: [],
  testTableLoading: false,
  exportLoading: false,
  pagination: {
    pageNum: 1,
    pageSize: 10,
    total: 0,
  },
  dataType: 1,
  importModalOpen: false,
  createDatabaseOpen: false,
  addRowModalOpen: false,
};

// Reducer函数
function databaseReducer(
  state: DatabaseState,
  action: DatabaseAction
): DatabaseState {
  switch (action.type) {
    case 'SET_DB_DETAIL':
      return { ...state, dbDetailData: action.payload };

    case 'SET_TABLES':
      return {
        ...state,
        tables: action.payload.tables,
        tablesLoad: action.payload.loading,
      };

    case 'SET_CURRENT_SHEET':
      return { ...state, currentSheet: action.payload };

    case 'SET_TEST_DATA':
      return {
        ...state,
        testDataSource: action.payload.data,
        testTableLoading: action.payload.loading,
      };

    case 'SET_TEST_TABLE_LOADING':
      return {
        ...state,
        testTableLoading: action.payload,
      };

    case 'SET_PAGINATION':
      return { ...state, pagination: action.payload };

    case 'SET_DATA_TYPE':
      return { ...state, dataType: action.payload };

    case 'SET_EXPORT_LOADING':
      return { ...state, exportLoading: action.payload };

    case 'SET_MODAL_STATE': {
      const { modal, open } = action.payload;

      // 修正键名映射
      let key: string;
      switch (modal) {
        case 'createDatabase':
          key = 'createDatabaseOpen';
          break;
        case 'import':
          key = 'importModalOpen';
          break;
        case 'addRow':
          key = 'addRowModalOpen';
          break;
        default:
          key = `${modal}ModalOpen`;
      }

      return {
        ...state,
        [key]: open,
      };
    }

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Context类型定义
interface DatabaseContextType {
  state: DatabaseState;
  dispatch: React.Dispatch<DatabaseAction>;
  testTableRef: RefObject<{
    getSelectRowKeys: () => string[];
    getSelectRows: () => string[];
    updateSelectRows: (rows: string[]) => void;
  }>;

  // 便捷方法
  actions: {
    setDbDetail: (data: DatabaseItem) => void;
    setTables: (tables: DatabaseItem[], loading?: boolean) => void;
    setCurrentSheet: (sheet: DatabaseItem | null) => void;
    setTestData: (data: Record<string, unknown>[], loading?: boolean) => void;
    setTestTableLoading: (loading: boolean) => void;
    setPagination: (pagination: {
      pageNum: number;
      pageSize: number;
      total: number;
    }) => void;
    setDataType: (type: number) => void;
    setExportLoading: (loading: boolean) => void;
    setModalState: (
      modal: 'import' | 'createDatabase' | 'addRow',
      open: boolean
    ) => void;
    resetState: () => void;
  };
}

// 创建Context
const DatabaseContext = createContext<DatabaseContextType>({
  state: initialState,
  dispatch: () => {},
  testTableRef: { current: null },
  actions: {
    setDbDetail: () => {},
    setTables: () => {},
    setCurrentSheet: () => {},
    setTestData: () => {},
    setTestTableLoading: () => {},
    setPagination: () => {},
    setDataType: () => {},
    setExportLoading: () => {},
    setModalState: () => {},
    resetState: () => {},
  },
});

// Provider组件
interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(databaseReducer, initialState);

  // 创建ref
  const testTableRef = useRef<{
    getSelectRowKeys: () => string[];
    getSelectRows: () => string[];
    updateSelectRows: (rows: string[]) => void;
  } | null>(null);

  // 便捷方法 - 使用useMemo确保actions对象引用稳定
  const actions = useMemo(
    () => ({
      setDbDetail: (data: DatabaseItem): void => {
        dispatch({ type: 'SET_DB_DETAIL', payload: data });
      },

      setTables: (tables: DatabaseItem[], loading = false): void => {
        dispatch({ type: 'SET_TABLES', payload: { tables, loading } });
      },

      setCurrentSheet: (sheet: DatabaseItem | null): void => {
        dispatch({ type: 'SET_CURRENT_SHEET', payload: sheet });
      },

      setTestData: (data: Record<string, unknown>[], loading = false): void => {
        dispatch({ type: 'SET_TEST_DATA', payload: { data, loading } });
      },

      setTestTableLoading: (loading: boolean): void => {
        dispatch({ type: 'SET_TEST_TABLE_LOADING', payload: loading });
      },

      setPagination: (pagination: {
        pageNum: number;
        pageSize: number;
        total: number;
      }): void => {
        dispatch({ type: 'SET_PAGINATION', payload: pagination });
      },

      setDataType: (type: number): void => {
        dispatch({ type: 'SET_DATA_TYPE', payload: type });
      },

      setExportLoading: (loading: boolean): void => {
        dispatch({ type: 'SET_EXPORT_LOADING', payload: loading });
      },

      setModalState: (
        modal: 'import' | 'createDatabase' | 'addRow',
        open: boolean
      ): void => {
        dispatch({ type: 'SET_MODAL_STATE', payload: { modal, open } });
      },

      resetState: (): void => {
        dispatch({ type: 'RESET_STATE' });
      },
    }),
    [dispatch]
  );

  const value: DatabaseContextType = useMemo(
    () => ({
      state,
      dispatch,
      testTableRef,
      actions,
    }),
    [state, dispatch, testTableRef, actions]
  );

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

// 自定义Hook
export const useDatabaseContext = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error(
      'useDatabaseContext must be used within a DatabaseProvider'
    );
  }
  return context;
};

// 分别导出各个部分的Hook，保持API的简洁性
export const useDatabaseState = (): DatabaseState => {
  const { state } = useDatabaseContext();
  return state;
};

export const useDatabaseActions = (): DatabaseContextType['actions'] => {
  const { actions } = useDatabaseContext();
  return actions;
};

export const useTestTableRef = (): RefObject<{
  getSelectRowKeys: () => string[];
  getSelectRows: () => string[];
  updateSelectRows: (rows: string[]) => void;
}> => {
  const { testTableRef } = useDatabaseContext();
  return testTableRef;
};
