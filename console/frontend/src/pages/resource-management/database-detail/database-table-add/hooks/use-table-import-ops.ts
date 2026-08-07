import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import { cloneDeep } from 'lodash';
import { useTableAddContext } from '../context/table-add-context';
import { TableField, DatabaseItem } from '@/types/database';

/**
 * 表格导入操作Hook
 */
export const useTableImportOps = (): {
  mergeAndDiscardDuplicates: (
    arr1: TableField[],
    arr2: DatabaseItem[]
  ) => {
    mergedArray: (TableField | DatabaseItem)[];
    hasDuplicate: boolean;
  };
  handleUpdateSheet: (data?: DatabaseItem[]) => void;
  markOperationTypes: (
    originalArray: TableField[],
    updatedArray: TableField[]
  ) => TableField[];
} => {
  const { t } = useTranslation();
  const { state, actions, databaseRef } = useTableAddContext();

  const mergeAndDiscardDuplicates = useCallback(
    (
      arr1: TableField[],
      arr2: DatabaseItem[]
    ): {
      mergedArray: (TableField | DatabaseItem)[];
      hasDuplicate: boolean;
    } => {
      const mergedArray: (TableField | DatabaseItem)[] = [...arr1];
      let hasDuplicate = false;

      // 获取当前最大ID，确保新字段ID不重复
      let maxId = arr1.reduce((max, item) => Math.max(max, item.id), 0);

      arr2.forEach(item2 => {
        const existingItem = arr1.find(item1 => item1.name === item2.name);
        if (!existingItem) {
          maxId += 1;
          mergedArray.push({
            ...item2,
            id: maxId,
            type: typeof item2.type === 'string' ? item2.type : 'String',
            isSystem: false,
            isRequired:
              'isRequired' in item2
                ? (item2 as unknown as TableField).isRequired
                : false,
          } as TableField);
        } else {
          hasDuplicate = true;
        }
      });

      return { mergedArray, hasDuplicate };
    },
    []
  );

  const handleUpdateSheet = useCallback(
    (data?: DatabaseItem[]): void => {
      if (!data || !data.length) return;

      const { mergedArray, hasDuplicate } = mergeAndDiscardDuplicates(
        state.dataSource,
        data
      );

      actions.setDataSource(mergedArray as TableField[]);

      if (hasDuplicate) {
        message.warning(t('database.duplicateFieldsIgnored'));
      }

      window.setTimeout(() => {
        databaseRef.current?.scrollTableBottom();
      }, 100);
    },
    [
      state.dataSource,
      actions.setDataSource,
      mergeAndDiscardDuplicates,
      databaseRef,
    ]
  );

  // 字段操作类型标记
  const markOperationTypes = useCallback(
    (originalArray: TableField[], updatedArray: TableField[]): TableField[] => {
      const originalMap = new Map(originalArray.map(item => [item.id, item]));
      const result: TableField[] = [];

      for (const updatedItem of updatedArray) {
        const clonedItem: TableField = { ...updatedItem };
        if (originalMap.has(updatedItem.id)) {
          if (!clonedItem.isSystem) {
            clonedItem.operateType = 2; // 更新
          }
          originalMap.delete(updatedItem.id);
        } else {
          clonedItem.operateType = 1; // 新增
          clonedItem.id = 0;
        }
        result.push(clonedItem);
      }

      const deletedItems = Array.from(originalMap.values());
      for (const originalItem of deletedItems) {
        const clonedItem = cloneDeep(originalItem);
        clonedItem.operateType = 4; // 删除
        result.push(clonedItem);
      }

      return result;
    },
    []
  );

  return {
    mergeAndDiscardDuplicates,
    handleUpdateSheet,
    markOperationTypes,
  };
};
