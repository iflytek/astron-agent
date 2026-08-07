import React, { useState, useCallback } from 'react';
import InfoHeader from './components/info-header';
import TeamInfo from './components/team-info';
import LeaveTeamModal from './components/leave-team-modal';
import SpaceButton from '@/components/button-group/space-button';
import type { ButtonConfig } from '@/components/button-group/types';
import { PermissionFailureBehavior } from '@/components/button-group';
import { ModuleType, OperationType } from '@/types/permission';
import useEnterpriseStore from '@/store/enterprise-store';
import styles from './index.module.scss';

const TeamSettings: React.FC = () => {
  const {
    info: { name, officerName, serviceType },
  } = useEnterpriseStore();
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // 处理离开团队/企业
  const handleLeaveTeam = useCallback(() => {
    setIsLeaveModalOpen(true);
  }, []);

  // 关闭弹窗
  const handleCloseModal = useCallback(() => {
    setIsLeaveModalOpen(false);
  }, []);

  // 离开团队/企业按钮配置
  const leaveTeamButtonConfig: ButtonConfig = {
    key: 'leave-team',
    text: serviceType === 2 ? '离开企业' : '离开团队',
    type: 'primary',
    danger: true,
    permission: {
      module: ModuleType.SPACE,
      operation: OperationType.LEAVE_ENTERPRISE,
      failureBehavior: PermissionFailureBehavior.HIDE,
    },
    onClick: handleLeaveTeam,
  };

  return (
    <div className={styles.teamSettings}>
      <div className={styles.header}>
        <h1 className={styles.title}>基础信息</h1>
      </div>

      {/* infoHeader */}
      <InfoHeader />

      {/* teamInfo */}
      <TeamInfo />

      {/* 离开团队/企业 */}
      <div className={styles.leaveSection}>
        <SpaceButton config={leaveTeamButtonConfig} />
      </div>

      {/* 离开团队确认弹窗 */}
      <LeaveTeamModal open={isLeaveModalOpen} onClose={handleCloseModal} />
    </div>
  );
};

export default TeamSettings;
