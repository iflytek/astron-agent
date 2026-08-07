import { useEffect, useCallback } from 'react';
import { cloneDeep } from 'lodash';
import { useTableAddContext } from '../context/table-add-context';
import { getDisableFields, fieldList } from '@/services/database';

/**
 * 表格初始化Hook
 */
export const useTableInitializer = (): void => {
  const { state, baseForm, actions } = useTableAddContext();

  // API调用函数
  const fieldListApi = useCallback(async (): Promise<void> => {
    if (!state.info?.id) return;

    const res = await fieldList({
      tbId: state.info.id,
      pageNum: 1,
      pageSize: 300,
    });

    actions.setOriginTableData(cloneDeep(res?.records || []));
    actions.setDataSource(res?.records || []);
  }, [state.info?.id, actions.setOriginTableData, actions.setDataSource]);

  // 初始化关键词
  useEffect(() => {
    const loadKeywords = async (): Promise<void> => {
      try {
        const res = await getDisableFields();
        const keywords = res?.value ? res.value.split(',') : [];
        actions.setDatabaseKeywords(keywords);
      } catch (error) {
        // 加载关键词失败
      }
    };

    if (state.databaseKeywords.length === 0) {
      loadKeywords();
    }
  }, [state.databaseKeywords.length, actions.setDatabaseKeywords]);

  // 初始化表单和字段列表
  useEffect(() => {
    if (state.info) {
      baseForm.setFieldsValue({
        name: state.info.name,
        description: state.info.description,
      });
      fieldListApi();
    }
  }, [state.info, baseForm, fieldListApi]);
};
