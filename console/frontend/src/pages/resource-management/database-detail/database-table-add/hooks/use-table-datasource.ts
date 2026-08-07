import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTableAddContext } from '../context/table-add-context';
import { useTableImportOps } from './use-table-import-ops';
import { TableField, DatabaseItem } from '@/types/database';

/**
 * 表格数据源管理Hook
 */
export const useTableDataSource = (): {
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
  handleDeleteField: (record: TableField) => void;
  handleUpdateSheet: (data?: DatabaseItem[]) => void;
  mergeAndDiscardDuplicates: (
    arr1: TableField[],
    arr2: DatabaseItem[]
  ) => {
    mergedArray: (TableField | DatabaseItem)[];
    hasDuplicate: boolean;
  };
  markOperationTypes: (
    originalArray: TableField[],
    updatedArray: TableField[]
  ) => TableField[];
} => {
  const { t } = useTranslation();
  const { state, actions, databaseRef } = useTableAddContext();
  const importOps = useTableImportOps();

  // 初始化数据源
  useEffect(() => {
    if (state.dataSource.length === 0) {
      const initialDataSource: TableField[] = [
        {
          id: 1,
          name: 'id',
          type: 'Integer',
          description: t('database.idFieldDescription'),
          defaultValue: '',
          isRequired: true,
          isSystem: true,
        },
        {
          id: 2,
          name: 'uid',
          type: 'String',
          description: t('database.uidFieldDescription'),
          defaultValue: '',
          isRequired: true,
          isSystem: true,
        },
        {
          id: 3,
          name: 'create_time',
          type: 'Time',
          description: t('database.createdTimeDescription'),
          defaultValue: '',
          isRequired: true,
          isSystem: true,
        },
      ];
      actions.setDataSource(initialDataSource);
    }
  }, [state.dataSource.length, actions.setDataSource, t]);

  const handleAddField = useCallback((): void => {
    const newId =
      state.dataSource.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
    const newField: TableField = {
      id: newId,
      name: '',
      type: 'String',
      description: '',
      defaultValue: '',
      isRequired: false,
      isSystem: false,
    };

    const newDataSource = [...state.dataSource, newField];
    actions.setDataSource(newDataSource);

    window.setTimeout(() => {
      databaseRef.current?.scrollTableBottom();
    }, 100);
  }, [state.dataSource, actions.setDataSource, databaseRef]);

  const handleInputParamsChange = useCallback(
    (
      id: number | null,
      key: string,
      value: string | number | boolean | string[] | null | undefined
    ): void => {
      const newDataSource = state.dataSource.map(item => {
        if (item.id === id) {
          return { ...item, [key]: value };
        }
        return item;
      });
      actions.setDataSource(newDataSource);
    },
    [state.dataSource, actions.setDataSource]
  );

  // 批量更新字段，解决同时更新多个字段时的竞争条件问题
  const handleBatchInputParamsChange = useCallback(
    (
      id: number | null,
      updates: Record<
        string,
        string | number | boolean | string[] | null | undefined
      >
    ): void => {
      const newDataSource = state.dataSource.map(item => {
        if (item.id === id) {
          return { ...item, ...updates };
        }
        return item;
      });
      actions.setDataSource(newDataSource);
    },
    [state.dataSource, actions.setDataSource]
  );

  const handleDeleteField = useCallback(
    (record: TableField): void => {
      const newData = state.dataSource.filter(it => it.id !== record.id);
      actions.setDataSource(newData);

      newData.forEach((item: TableField) => {
        const repeat = newData?.filter(it => it?.name === item?.name);
        if (repeat.length <= 1) {
          (item as TableField & { nameErrMsg?: string }).nameErrMsg = '';
        }
      });
    },
    [state.dataSource, actions.setDataSource]
  );

  return {
    handleAddField,
    handleInputParamsChange,
    handleBatchInputParamsChange,
    handleDeleteField,
    ...importOps,
  };
};
