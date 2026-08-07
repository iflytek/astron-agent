import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, message } from 'antd';

import EnterpriseCertificationCard, {
  CertificationStatus,
} from '../enterprise-certification-card';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

import useEnterpriseStore from '@/store/enterprise-store';
import eventBus from '@/utils/event-bus';

const TeamInfo = () => {
  const { t } = useTranslation();
  const {
    info: {
      id,
      serviceType,
      orgId,
      uid,
      name,
      officerName,
      createTime,
      expireTime,
    },
    certificationType,
    setCertificationType,
  } = useEnterpriseStore();

  const navigate = useNavigate();

  const orderTypes = [
    {
      type: '团队版',
      text: t('sidebar.orderTypes.team'),
      icon: require('@/assets/imgs/trace/trace-team.svg'),
      alt: t('sidebar.orderTypes.team'),
    },
    {
      type: '企业版',
      text: t('sidebar.orderTypes.enterprise'),
      icon: require('@/assets/imgs/trace/trace-enterprise.svg'),
      alt: t('sidebar.orderTypes.enterprise'),
    },
  ];

  // 企业认证状态，可以根据实际数据动态设置
  const [certificationStatus, setCertificationStatus] =
    useState<CertificationStatus>(
      certificationType
        ? CertificationStatus.CERTIFIED
        : CertificationStatus.NOT_CERTIFIED
    );

  // 处理升级企业认证
  const handleUpgradeEnterprise = () => {
    console.log('升级企业认证');
    // 模拟升级成功后更新状态
    setCertificationStatus(CertificationStatus.CERTIFIED);
    message.success('企业认证升级成功！');
  };

  const currentOrder = useMemo(() => {
    const normalized = Number(serviceType) || 1;
    const idx = Math.min(Math.max(normalized - 1, 0), orderTypes.length - 1);
    return orderTypes[idx];
  }, [serviceType, t]);

  const displayOrder = currentOrder ?? orderTypes[0]!;

  // 立即续费
  const handleRenew = () => {
    console.log('立即续费');
    eventBus.emit('showComboModal');
  };

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
          {/* <div className={styles.infoItem}>
            <div className={styles.infoLabel}>到期时间</div>
            <div className={styles.infoValue}>
              {expireTime}
              <span className={styles.renewTag} onClick={handleRenew}>
                立即续费
              </span>
            </div>
          </div> */}
        </div>
      </div>

      {/* 企业认证卡片区域 */}
      {/* <div className={styles.certificationSection}>
        <EnterpriseCertificationCard
          status={certificationStatus}
          onUpgrade={handleUpgradeEnterprise}
        />
      </div> */}
    </div>
  );
};

export default TeamInfo;
