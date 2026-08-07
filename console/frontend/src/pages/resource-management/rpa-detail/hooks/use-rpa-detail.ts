import { getRpaDetail } from '@/services/rpa';
import { useRequest } from 'ahooks';
import { useParams } from 'react-router-dom';

export const useRpaDetail = () => {
  const { rpa_id } = useParams();
  const { data, loading } = useRequest(() => getRpaDetail(Number(rpa_id)), {
    refreshDeps: [rpa_id],
  });
  return {
    rpaDetail: data,
    loading,
  };
};
