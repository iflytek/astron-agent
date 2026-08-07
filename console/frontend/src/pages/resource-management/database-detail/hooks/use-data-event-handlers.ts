import { useCallback } from 'react';
import { useDatabaseContext } from '../context/database-context';
import { DatabaseItem } from '@/types/database';

/**
 * 数据事件处理Hook
 */
export const useDataEventHandlers = (
  getTableData: (
    currentSheet: DatabaseItem | null,
    type: number,
    page?: number,
    size?: number,
    isRefresh?: boolean
  ) => Promise<void>
): {
  refreshCurrentTableData: () => void;
  handleDataTypeChange: (type: number) => void;
  handlePageChange: (page: number, pageSize: number) => void;
  handleRefreshData: () => void;
} => {
  const { state, actions } = useDatabaseContext();

  const refreshCurrentTableData = useCallback(() => {
    if (state.currentSheet) {
      getTableData(
        state.currentSheet,
        state.dataType,
        state.pagination.pageNum,
        state.pagination.pageSize
      );
    }
  }, [
    state.currentSheet,
    state.dataType,
    state.pagination.pageNum,
    state.pagination.pageSize,
    getTableData,
  ]);

  const handleDataTypeChange = useCallback(
    (type: number) => {
      actions.setDataType(type);
      if (type !== 1 && state.currentSheet) {
        getTableData(state.currentSheet, type);
      }
    },
    [actions.setDataType, state.currentSheet, getTableData]
  );

  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      if (state.currentSheet) {
        getTableData(state.currentSheet, state.dataType, page, pageSize);
      }
    },
    [state.currentSheet, state.dataType, getTableData]
  );

  const handleRefreshData = useCallback(() => {
    if (state.currentSheet) {
      getTableData(state.currentSheet, 3, 1, 10, true);
    }
  }, [state.currentSheet, getTableData]);

  return {
    refreshCurrentTableData,
    handleDataTypeChange,
    handlePageChange,
    handleRefreshData,
  };
};
