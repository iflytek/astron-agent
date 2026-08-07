import React, { useRef } from 'react';
import { Card, Tooltip } from 'antd';
import styles from './index.module.scss';

import spaceAvatar from '@/assets/imgs/space/spaceAvatar.png';
import { useTranslation } from 'react-i18next';

interface SpaceItem {
  id: string;
  avatarUrl?: string;
  name: string;
}

const PersonalSpaceCard: React.FC = () => {
  const infoContentRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  return (
    <Card className={`${styles.spaceCard}`}>
      <div className={styles.cardHeader}>
        <img className={styles.avatar} src={spaceAvatar} alt="" />
      </div>

      <div className={styles.cardBody} ref={infoContentRef}>
        <div className={styles.titleContainer}>
          <div></div>
          <div className={styles.spaceTitle}>{t('space.personalSpace')}</div>
        </div>

        {/* <p className={styles.spaceDescription}></p> */}
      </div>

      {/* <div className={styles.cardFooter}>
        <div className={styles.manageBtnContainer}></div>
      </div> */}
    </Card>
  );
};

export default PersonalSpaceCard;
