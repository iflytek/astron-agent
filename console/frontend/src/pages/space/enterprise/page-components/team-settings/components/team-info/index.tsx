import traceTeam from '@/assets/imgs/trace/trace-team.svg';
import traceEnterprise from '@/assets/imgs/trace/trace-enterprise.svg';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

import useEnterpriseStore from '@/store/enterprise-store';

const TeamInfo = () => {
  const { t } = useTranslation();
  const { id, serviceType, orgId, createTime } = useEnterpriseStore(
    state => state.info
  );

  const orderTypes = [
    {
      text: t('sidebar.orderTypes.team'),
      icon: traceTeam,
      alt: t('sidebar.orderTypes.team'),
    },
    {
      text: t('sidebar.orderTypes.enterprise'),
      icon: traceEnterprise,
      alt: t('sidebar.orderTypes.enterprise'),
    },
  ];

  const displayOrder = serviceType === 1 ? orderTypes[0]! : orderTypes[1]!;

  return (
    <div className={styles.teamInfo}>
      {/* 团队基本信息区域 */}
      <div className={styles.basicSection}>
        <div className={styles.basicInfo}>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>团队ID</div>
            <div className={styles.infoValue}>{id}</div>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>组织ID</div>
            <div className={styles.infoValue}>{orgId}</div>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>当前套餐</div>
            <div className={styles.infoValue}>
              <div className={styles.orderType}>
                <img
                  className={styles.icon}
                  src={displayOrder.icon}
                  alt={displayOrder.alt}
                />
                {displayOrder.text}
              </div>
            </div>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>创建时间</div>
            <div className={styles.infoValue}>{createTime}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamInfo;
