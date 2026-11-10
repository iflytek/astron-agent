import React, { useCallback } from 'react';
import { Spin, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SpaceCard from '../space-card';
import Empty from '../empty';
import styles from './index.module.scss';
import useSpaceStore from '@/store/space-store';
import { visitSpace, joinEnterpriseSpace } from '@/services/space';
import { shouldShowRequestError } from '@/utils/http-error';

interface SpaceItem {
  id: string;
  avatarUrl?: string;
  name: string;
  description: string;
  ownerName: string;
  memberCount: number;
  status?: string;
  university?: string;
  isOwner?: boolean;
  isMember?: boolean;
  isPending?: boolean;
  canJoin?: boolean;
}
interface SpaceListProps {
  dataSource: SpaceItem[];
  loading: boolean;
  activeTab: string;
  refresh?: () => void;
  staticSize?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  minCardWidth?: number;
  emptyText?: string;
}

const SpaceList: React.FC<SpaceListProps> = ({
  dataSource,
  loading,
  refresh,
  prefix,
  suffix,
  emptyText,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { spaceType, setSpaceId, setSpaceName, setSpaceAvatar } =
    useSpaceStore();
  const handleButtonClick = useCallback(
    async (action: string, space: SpaceItem) => {
      try {
        if (action === 'enter') {
          await visitSpace(space.id);
          setSpaceId(space.id);
          setSpaceName(space.name);
          setSpaceAvatar(space.avatarUrl || '');
          navigate(`/space/space-detail/${space.id}`);
        } else if (action === 'join') {
          await joinEnterpriseSpace({ spaceId: `${space.id}` });
          message.success(t('space.applySuccess'));
          refresh?.();
        }
      } catch (error: unknown) {
        if (shouldShowRequestError(error))
          message.error(t('space.accessSpaceFailed'));
      }
    },
    [navigate, setSpaceId, setSpaceName, setSpaceAvatar, refresh, t]
  );

  if (loading)
    return (
      <div className={styles.loading} role="status" aria-label="正在加载空间">
        <Spin />
      </div>
    );
  if (!dataSource.length && !prefix && !suffix)
    return <Empty text={emptyText || t('space.noSpaceYet')} />;
  return (
    <div className={styles.spaceList}>
      {prefix}
      {dataSource.map(space => (
        <SpaceCard
          key={space.id}
          spaceType={spaceType}
          space={space}
          onButtonClick={handleButtonClick}
        />
      ))}
      {suffix}
    </div>
  );
};
export default SpaceList;
