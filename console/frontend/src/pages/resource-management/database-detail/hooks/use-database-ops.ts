import { useCallback } from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useDatabaseContext } from '../context/database-context';
import { dbDetail, update } from '@/services/database';
import { DatabaseItem } from '@/types/database';

/**
 * 数据库详情操作Hook
 */
export const useDatabaseOps = (): {
  getDbDetail: () => Promise<void>;
  updateDatabase: (params: DatabaseItem) => Promise<void>;
} => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { actions } = useDatabaseContext();

  const getDbDetail = useCallback(async (): Promise<void> => {
    if (!id) return;
    try {
      const data = await dbDetail({ id });
      actions.setDbDetail(data);
    } catch (error) {
      // 获取数据库详情失败
    }
  }, [id, actions.setDbDetail]);

  const updateDatabase = useCallback(
    async (params: DatabaseItem) => {
      try {
        await update({
          ...params,
          avatarIcon: params.avatarIcon || undefined,
          avatarColor: params.avatarColor || undefined,
        });
        await getDbDetail();
        message.success(t('database.dataUpdated'));
      } catch (error) {
        // 更新数据库失败
      }
    },
    [getDbDetail, t]
  );

  return { getDbDetail, updateDatabase };
};
