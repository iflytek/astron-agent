import { useCallback } from 'react';
import { message, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useDatabaseContext } from '../context/database-context';
import { useDataEventHandlers } from './use-data-event-handlers';
import {
  queryTableData,
  operateTableData,
  exportData,
} from '@/services/database';
import { DatabaseItem, OperateType } from '@/types/database';

/**
 * 数据操作Hook
 */
export const useDataOps = (): {
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
} => {
  const { t } = useTranslation();
  const { state, actions, testTableRef } = useDatabaseContext();

  const getTableData = useCallback(
    async (
      currentSheet: DatabaseItem | null,
      type: number,
      page = 1,
      size = 10,
      isRefresh = false
    ) => {
      if (!currentSheet) return;

      try {
        actions.setTestTableLoading(true);
        const params = {
          tbId: currentSheet.id,
          execDev: type - 1,
          pageNum: page,
          pageSize: size,
        };

        const data = await queryTableData(params);

        if (data.records.length === 0 && page > 1) {
          getTableData(currentSheet, type, page - 1, size);
          return;
        }

        actions.setTestData(data.records, false);
        actions.setPagination({
          pageNum: page,
          pageSize: size,
          total: data.total,
        });

        if (isRefresh) {
          message.success(t('database.dataUpdated'));
        }
      } catch (error) {
        actions.setTestData([], false);
        actions.setPagination({ pageNum: 1, pageSize: 10, total: 0 });
      }
    },
    [actions.setTestData, actions.setPagination]
  );

  const batchDeleteRows = useCallback(
    async (
      currentSheet: DatabaseItem | null,
      dataType: number,
      rows: string[]
    ) => {
      if (!rows || !rows.length) {
        message.warning(t('database.pleaseSelectDataToDelete'));
        return;
      }

      const params = {
        tbId: currentSheet?.id || 0,
        execDev: dataType - 1,
        data: rows.map((id: string) => ({
          operateType: OperateType.DELETE,
          tableData: { id },
        })),
      };

      Modal.confirm({
        title: t('database.confirmDeleteData'),
        centered: true,
        onOk: async () => {
          try {
            await operateTableData(params);
            testTableRef.current?.updateSelectRows([]);
            if (currentSheet) {
              getTableData(
                currentSheet,
                dataType,
                state.pagination.pageNum,
                state.pagination.pageSize
              );
            }
            message.success(t('database.deleteSuccess'));
          } catch (error) {
            message.error(t('database.deleteFailed'));
          }
        },
      });
    },
    [
      testTableRef,
      getTableData,
      state.pagination.pageNum,
      state.pagination.pageSize,
    ]
  );

  const exportTableData = useCallback(
    async (
      currentSheet: DatabaseItem | null,
      dataType: number,
      rowKeys: string[],
      downloadHandler: (res: {
        data?: Blob;
        headers?: { 'content-disposition': string };
      }) => void
    ) => {
      try {
        if (!state.testDataSource.length) return;

        actions.setExportLoading(true);
        const res = await exportData({
          tbId: currentSheet?.id || 0,
          execDev: dataType - 1,
          dataIds: rowKeys || [],
        });

        downloadHandler({
          data: new Blob([res.data]),
          headers: res.headers as { 'content-disposition': string },
        });
        actions.setExportLoading(false);
        message.success(t('database.exportSuccess'));
      } catch (error) {
        actions.setExportLoading(false);
      }
    },
    [state.testDataSource.length, actions.setExportLoading]
  );

  // 使用事件处理hook
  const eventHandlers = useDataEventHandlers(getTableData);

  return {
    getTableData,
    batchDeleteRows,
    exportTableData,
    ...eventHandlers,
  };
};
