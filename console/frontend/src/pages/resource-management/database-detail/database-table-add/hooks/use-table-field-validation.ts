import { useCallback } from 'react';
import { useTableAddContext } from '../context/table-add-context';
import { TableField } from '@/types/database';

/**
 * 表格字段验证Hook
 */
export const useTableFieldValidation = (): {
  handleCheckInput: (
    currentParam: TableField,
    key: keyof TableField,
    errMsg: string,
    dataSource: TableField[],
    databaseKeywords: string[]
  ) => boolean;
  handleValidateInput: (
    currentParam: TableField,
    key: keyof TableField,
    errMsg: string
  ) => boolean;
} => {
  const { state, databaseRef } = useTableAddContext();

  const handleCheckInput = useCallback(
    (
      currentParam: TableField,
      key: keyof TableField,
      errMsg: string,
      dataSource: TableField[],
      databaseKeywords: string[]
    ): boolean => {
      let isValid = true;

      // 字段名验证
      if (key === 'name') {
        const fieldName = currentParam[key] as string;

        // 检查是否为空
        if (!fieldName || fieldName.trim() === '') {
          (currentParam as unknown as Record<string, unknown>).nameErrMsg =
            errMsg;
          isValid = false;
        }
        // 检查是否为关键词
        else if (databaseKeywords.includes(fieldName.toLowerCase())) {
          (currentParam as unknown as Record<string, unknown>).nameErrMsg =
            '字段名不能使用数据库关键词';
          isValid = false;
        }
        // 检查是否重复
        else {
          const duplicateCount = dataSource.filter(
            item => item.name === fieldName && item.id !== currentParam.id
          ).length;

          if (duplicateCount > 0) {
            (currentParam as unknown as Record<string, unknown>).nameErrMsg =
              '字段名不能重复';
            isValid = false;
          } else {
            (currentParam as unknown as Record<string, unknown>).nameErrMsg =
              '';
          }
        }
      }
      // 字段描述验证
      else if (key === 'description') {
        const description = currentParam[key] as string;
        if (!description || description.trim() === '') {
          (
            currentParam as unknown as Record<string, unknown>
          ).descriptionErrMsg = errMsg;
          isValid = false;
        } else {
          (
            currentParam as unknown as Record<string, unknown>
          ).descriptionErrMsg = '';
        }
      }

      return isValid;
    },
    []
  );

  const handleValidateInput = useCallback(
    (
      currentParam: TableField,
      key: keyof TableField,
      errMsg: string
    ): boolean => {
      const isValid = handleCheckInput(
        currentParam,
        key,
        errMsg,
        state.dataSource,
        state.databaseKeywords
      );

      if (
        !(currentParam as unknown as Record<string, unknown>)[
          `${String(key)}ErrMsg`
        ]
      ) {
        databaseRef.current?.scrollTableBottom();
      }

      return isValid;
    },
    [handleCheckInput, state.dataSource, state.databaseKeywords, databaseRef]
  );

  return {
    handleCheckInput,
    handleValidateInput,
  };
};
