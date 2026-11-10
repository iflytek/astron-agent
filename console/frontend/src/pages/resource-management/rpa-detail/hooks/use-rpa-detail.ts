import { useCallback, useEffect, useState } from 'react';
import { getRpaDetail } from '@/services/rpa';
import { RpaDetailInfo } from '@/types/rpa';
import { useParams } from 'react-router-dom';
export const useRpaDetail = () => {
  const { rpa_id } = useParams();
  const [rpaDetail, setRpaDetail] = useState<RpaDetailInfo>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setRpaDetail(undefined);
    void getRpaDetail(Number(rpa_id))
      .then(data => {
        if (active) setRpaDetail(data);
      })
      .catch(failure => {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : 'RPA 详情加载失败，请重试。'
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [rpa_id, revision]);
  return { rpaDetail, loading, error, refresh };
};
