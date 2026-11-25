import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDatabaseContext } from '../context/database-context';
import { dbDetail, tableList } from '@/services/database';
export const useDatabaseInitializer = () => {
  const { id } = useParams();
  const { actions } = useDatabaseContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    actions.resetState();
    if (!id) {
      setLoading(false);
      setError('缺少数据库标识，请返回列表重新选择。');
      return;
    }
    actions.setTables([], true);
    void Promise.all([dbDetail({ id }), tableList({ dbId: Number(id) })])
      .then(([detail, tables]) => {
        if (!active) return;
        actions.setDbDetail(detail);
        actions.setTables(tables, false);
        actions.setCurrentSheet(tables?.[0] || null);
      })
      .catch(failure => {
        if (active) {
          setError(
            failure instanceof Error
              ? failure.message
              : '数据库详情加载失败，请重试。'
          );
          actions.setTables([], false);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, actions, revision]);
  return { loading, error, retry };
};
