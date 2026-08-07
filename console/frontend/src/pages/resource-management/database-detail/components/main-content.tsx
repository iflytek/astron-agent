import React, { memo } from 'react';
import { Segmented, Pagination } from 'antd';
import { useTranslation } from 'react-i18next';
import DataBaseTableAdd from '../database-table-add';
import TestTable from './test-table';
import ImportDataModal from '../../database/components/import-data-modal';
import ActionButtons from './action-buttons';
import { useDatabaseState, useTestTableRef } from '../context/database-context';
import { useDatabaseActions } from '../hooks/use-database-actions';
import styles from './main-content.module.scss';

/**
 * 主内容区组件
 */
const MainContent: React.FC = () => {
  const { t } = useTranslation();

  // 从Context获取状态
  const { dataType, currentSheet, exportLoading, importModalOpen } =
    useDatabaseState();

  const testTableRef = useTestTableRef();

  // 获取业务逻辑方法
  const {
    handleDataTypeChange,
    handleRefreshData,
    batchDeleteRows,
    exportTableData,
    refreshCurrentTableData,
    openModal,
    closeModal,
  } = useDatabaseActions();

  // Tab配置
  const tabOptions = [
    { value: 1, label: t('database.tableStructure') },
    { value: 2, label: t('database.testData') },
    { value: 3, label: t('database.onlineData') },
  ];

  // 下载工具函数
  const downloadTableData = (res: {
    data?: Blob;
    headers?: { 'content-disposition': string };
  }): void => {
    const generateFileName = (contentDisposition: string): string => {
      let fileName = 'download.xlsx';
      if (contentDisposition && contentDisposition.includes('filename=')) {
        const fileNamePart = contentDisposition.split('filename=')[1];
        if (fileNamePart) {
          const firstPart = fileNamePart.split(';')[0];
          if (firstPart) {
            fileName = firstPart.replace(/['"]/g, '');
            fileName = decodeURIComponent(fileName);
          }
        }
      }
      return fileName;
    };

    const url = window.URL.createObjectURL(res?.data || new Blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = generateFileName(
      res?.headers?.['content-disposition'] || ''
    );
    link.click();
    window.URL.revokeObjectURL(url);
    link.remove();
  };

  // 事件处理函数
  const handleAddField = (): void => openModal('addRow');

  const handleBatchDeleteField = async (): Promise<void> => {
    const rows = testTableRef.current?.getSelectRows();
    if (rows) {
      await batchDeleteRows(currentSheet, dataType, rows);
    }
  };

  const handleImportTableData = (): void => openModal('import');

  const handleExportTableData = async (): Promise<void> => {
    const rowKeys = testTableRef.current?.getSelectRowKeys();
    await exportTableData(
      currentSheet,
      dataType,
      rowKeys || [],
      downloadTableData
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fff] rounded-2xl border-b border-[#F1F1F1] p-6 min-w-0">
      {/* 头部控制区 */}
      <div className="flex items-start justify-between">
        <div className={styles.segmentedWrapper}>
          <Segmented
            value={dataType}
            onChange={handleDataTypeChange}
            options={tabOptions}
          />
        </div>
        {currentSheet && (
          <ActionButtons
            dataType={dataType}
            exportLoading={exportLoading}
            onAddData={handleAddField}
            onBatchDelete={handleBatchDeleteField}
            onImportData={handleImportTableData}
            onExportData={handleExportTableData}
            onRefreshData={handleRefreshData}
          />
        )}
      </div>

      {/* 内容区域 */}
      <MainContentBody />

      {/* 导入数据弹框 */}
      <ImportDataModal
        visible={importModalOpen}
        handleCancel={(): void => closeModal('import')}
        onImport={refreshCurrentTableData}
        type={dataType}
        info={currentSheet || undefined}
      />
    </div>
  );
};

/**
 * 主内容体组件
 */
const MainContentBody: React.FC = () => {
  const { t } = useTranslation();

  const {
    dataType,
    currentSheet,
    testDataSource,
    testTableLoading,
    pagination,
  } = useDatabaseState();

  const { refreshCurrentTableData, handlePageChange, fetchTableList } =
    useDatabaseActions();
  const testTableRef = useTestTableRef();

  if (!currentSheet) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#B2B2B2] text-[14px]">
        {t('database.noData')}
      </div>
    );
  }

  if (dataType === 1) {
    return (
      <DataBaseTableAdd
        isModule={true}
        info={currentSheet}
        handleUpdate={fetchTableList}
      />
    );
  }

  if (!testDataSource.length && !testTableLoading) {
    return (
      <div className="flex items-center justify-center flex-1 text-sm text-[#B2B2B2]">
        {t('database.noData')}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-hidden">
      <TestTable
        ref={testTableRef}
        info={currentSheet}
        dataSource={testDataSource}
        pagination={pagination}
        loading={testTableLoading}
        type={dataType}
        updateTestData={refreshCurrentTableData}
      />
      <div className="relative flex items-center justify-center px-6 h-[80px]">
        <div className="text-[#979797] text-sm pt-4 absolute left-0">
          {t('database.totalDataItems', { total: pagination.total })}
        </div>
        <Pagination
          className="flow-pagination-template custom-pagination flex-none"
          current={pagination.pageNum}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onChange={handlePageChange}
          showSizeChanger
        />
      </div>
    </div>
  );
};

export default memo(MainContent);
