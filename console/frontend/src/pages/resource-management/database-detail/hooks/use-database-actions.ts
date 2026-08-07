import { RefObject } from 'react';
import { useDatabaseContext } from '../context/database-context';
import { useDatabaseOps } from './use-database-ops';
import { useTableOps } from './use-table-ops';
import { useDataOps } from './use-data-ops';
import { useModalOps } from './use-modal-ops';
import { DatabaseItem } from '@/types/database';

interface DatabaseActionsReturn {
  // 数据库操作
  getDbDetail: () => Promise<void>;
  updateDatabase: (params: DatabaseItem) => Promise<void>;
  // 表格操作
  fetchTableList: () => Promise<void>;
  deleteTableById: (tableId: number) => Promise<void>;
  copyTableById: (tableId: number) => Promise<void>;
  handleSheetSelect: (sheet: DatabaseItem | null) => void;
  // 数据操作
  getTableData: (
    currentSheet: DatabaseItem | null,
    type: number,
    page?: number,
    size?: number,
    isRefresh?: boolean
  ) => Promise<void>;
  batchDeleteRows: (
    currentSheet: DatabaseItem | null,
    dataType: number,
    rows: string[]
  ) => Promise<void>;
  exportTableData: (
    currentSheet: DatabaseItem | null,
    dataType: number,
    rowKeys: string[],
    downloadHandler: (res: {
      data?: Blob;
      headers?: { 'content-disposition': string };
    }) => void
  ) => Promise<void>;
  refreshCurrentTableData: () => void;
  handleDataTypeChange: (type: number) => void;
  handlePageChange: (page: number, pageSize: number) => void;
  handleRefreshData: () => void;
  // 模态框控制
  openModal: (modal: 'import' | 'createDatabase' | 'addRow') => void;
  closeModal: (modal: 'import' | 'createDatabase' | 'addRow') => void;
  // refs
  testTableRef: RefObject<{
    getSelectRowKeys: () => string[];
    getSelectRows: () => string[];
    updateSelectRows: (rows: string[]) => void;
  } | null>;
}

/**
 * 数据库操作主Hook - 整合所有操作
 */
export const useDatabaseActions = (): DatabaseActionsReturn => {
  const { testTableRef } = useDatabaseContext();

  // 各功能模块hooks
  const databaseOps = useDatabaseOps();
  const tableOps = useTableOps();
  const dataOps = useDataOps();
  const modalOps = useModalOps();

  return {
    // 数据库操作
    ...databaseOps,

    // 表格操作
    ...tableOps,

    // 数据操作
    ...dataOps,

    // 模态框控制
    ...modalOps,

    // refs
    testTableRef,
  };
};
