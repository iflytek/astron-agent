import { useTableAddContext } from '../context/table-add-context';
import { useTableDataSource } from './use-table-datasource';
import { useTableFieldValidation } from './use-table-field-validation';
import { useTableSave } from './use-table-save';
import { DatabaseItem, TableField } from '@/types/database';

interface TableActionsReturn {
  // 数据源操作
  handleAddField: () => void;
  handleInputParamsChange: (
    id: number | null,
    key: string,
    value: string | number | boolean | string[] | null | undefined
  ) => void;
  handleBatchInputParamsChange: (
    id: number | null,
    updates: Record<
      string,
      string | number | boolean | string[] | null | undefined
    >
  ) => void;
  handleUpdateSheet: (data?: DatabaseItem[]) => void;
  handleDeleteField: (record: TableField) => void;

  // 字段验证
  handleValidateInput: (
    currentParam: TableField,
    key: keyof TableField,
    errMsg: string
  ) => boolean;

  // 保存操作
  handleOk: () => void;

  // 模态框控制
  handleImportModalOpen: () => void;
  handleImportModalClose: () => void;
  handleImport: (data?: DatabaseItem[]) => void;
}

/**
 * 表格操作主Hook - 整合所有操作
 */
export const useTableActions = (
  handleUpdate?: () => void
): TableActionsReturn => {
  const { actions } = useTableAddContext();

  // 各功能模块hooks
  const dataSourceOps = useTableDataSource();
  const fieldValidation = useTableFieldValidation();
  const saveOps = useTableSave(handleUpdate);

  // 模态框控制方法
  const handleImportModalOpen = (): void => {
    actions.setImportModalOpen(true);
  };

  const handleImportModalClose = (): void => {
    actions.setImportModalOpen(false);
  };

  const handleImport = (data?: DatabaseItem[]): void => {
    dataSourceOps.handleUpdateSheet(data);
    actions.setImportModalOpen(false);
  };

  return {
    // 数据源操作
    ...dataSourceOps,

    // 字段验证
    handleValidateInput: fieldValidation.handleValidateInput,

    // 保存操作
    ...saveOps,

    // 模态框控制
    handleImportModalOpen,
    handleImportModalClose,
    handleImport,
  };
};
