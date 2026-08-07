import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDatabaseContext } from '../context/database-context';
import { dbDetail, tableList } from '@/services/database';

/**
 * 数据库初始化Hook
 * 专门负责页面初始化时的数据加载
 * 只应该在顶层组件中调用一次
 */
export const useDatabaseInitializer = (): void => {
  const { id } = useParams();
  const { actions } = useDatabaseContext();

  useEffect(() => {
    if (!id) return;

    // 并行加载数据库详情和表格列表
    const loadInitialData = async (): Promise<void> => {
      try {
        // 设置表格加载状态
        actions.setTables([], true);

        // 并行执行两个请求，提高加载速度
        const [dbData, tableData] = await Promise.all([
          dbDetail({ id }),
          tableList({ dbId: Number(id) }),
        ]);

        // 批量更新状态
        actions.setDbDetail(dbData);
        actions.setTables(tableData, false);

        // 设置默认选中第一个表格
        if (tableData?.length > 0) {
          actions.setCurrentSheet(tableData[0] || null);
        }
      } catch (error) {
        // 统一错误处理
        actions.setTables([], false);
        // 可以在这里添加错误提示或日志记录
        // console.error('加载数据库初始数据失败:', error);
      }
    };

    loadInitialData();
  }, [id, actions]);
};
