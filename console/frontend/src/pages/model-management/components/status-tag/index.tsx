import { useMemo } from 'react';
import newPublishTag from '@/assets/svgs/new-publish-tag.svg';
import offlineTag from '@/assets/svgs/offline-tag.svg';
import styles from './index.module.scss';
import i18next from 'i18next';

interface StatusMap {
  [key: number | string]: {
    text: string;
    icon: string;
    color?: string;
  };
}

const StatusTag = ({ status }: { status: number }) => {
  const statusMap: StatusMap = {
    1: {
      text: i18next.t('model.toBeOffShelf'),
      icon: offlineTag,
      color: '#F14B43',
    },
    2: {
      text: i18next.t('model.offShelf'),
      icon: offlineTag,
      color: '#F14B43',
    },
    default: {
      text: '其他',
      icon: newPublishTag,
      color: '#6356EA',
    },
  };

  const statusConfig = useMemo(() => {
    return statusMap[status];
    // || statusMap.default;
  }, [status]);

  const containerStyle = useMemo(
    () => ({
      color: statusConfig?.color,
      background: `url(${statusConfig?.icon}) no-repeat center / contain`,
    }),
    [statusConfig]
  );

  if (!statusConfig) return;

  return (
    <div className={styles.statusTag} style={containerStyle}>
      {statusConfig?.text}
    </div>
  );
};

export default StatusTag;
