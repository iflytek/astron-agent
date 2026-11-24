import React, { useState, useCallback, useMemo } from 'react';
import { Button, Card } from 'antd';
import { useTranslation } from 'react-i18next';

import TransferOwnershipModal from '@/components/space/transfer-ownership-modal';
import DeleteSpaceModal from '@/components/space/delete-space-modal';
import styles from './index.module.scss';
import useSpaceStore from '@/store/space-store';
import LeaveSpaceModal from '@/components/space/leave-space-modal';
import { usePermissions } from '@/hooks/use-permissions';
import { ModuleType, OperationType } from '@/types/permission';
import type { SpaceInfo } from '../../use-space-info';

const SpaceSettings: React.FC<{
  spaceInfo: SpaceInfo;
  onRefresh?: () => void;
}> = ({ spaceInfo, onRefresh }) => {
  const { spaceType } = useSpaceStore();
  const permissionsUtils = usePermissions();
  const { t } = useTranslation();

  // 根据 userRole 动态设置文案
  const getTextConfig = useCallback(
    (userRole: number) => {
      const isOwner = userRole === 1;
      return {
        deleteSpace: isOwner ? t('space.deleteSpace') : t('space.leaveSpace'),
        deleteDescription: isOwner
          ? t('common.deleteSpaceWarning')
          : t('space.leaveSpaceWarning'),
        deleteButtonText: isOwner
          ? t('space.deleteSpace')
          : t('space.leaveSpace'),
      };
    },
    [t]
  );

  const textConfig = getTextConfig(spaceInfo.userRole);

  // 弹窗状态管理
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showLeaveSpaceModal, setShowLeaveSpaceModal] =
    useState<boolean>(false);

  // 转让所有权
  const handleTransferOwnership = useCallback(() => {
    setShowTransferModal(true);
  }, []);

  const handleTransferModalClose = useCallback(() => {
    setShowTransferModal(false);
  }, []);

  // 删除空间
  const handleDeleteSpace = useCallback(() => {
    if (spaceInfo.userRole === 1) {
      setShowDeleteModal(true);
    } else {
      setShowLeaveSpaceModal(true);
    }
  }, [spaceInfo.userRole]);

  const handleDeleteModalClose = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  //关闭离开弹窗
  const handleLeaveSpaceModalClose = useCallback(() => {
    setShowLeaveSpaceModal(false);
  }, []);

  const showTransferBtn = useMemo(() => {
    return (
      spaceType === 'team' &&
      permissionsUtils?.checks.hasModulePermission(
        ModuleType.SPACE,
        OperationType.SPACE_TRANSFER
      )
    );
  }, [spaceType, permissionsUtils]);

  const showDeleteBtn = useMemo(() => {
    return spaceInfo.userRole === 1
      ? spaceInfo.canDelete
      : permissionsUtils?.checks.hasModulePermission(
          ModuleType.SPACE,
          OperationType.SPACE_DELETE
        );
  }, [spaceInfo.userRole, spaceInfo.canDelete, permissionsUtils]);

  return (
    <div className={styles.spaceSettings}>
      <div className={styles.settingsList}>
        {/* 转让空间所有权 只有团队版才有*/}
        {showTransferBtn && (
          <Card className={styles.settingCard}>
            <div className={styles.settingContent}>
              <div className={styles.settingInfo}>
                <h3 className={styles.settingTitle}>
                  {t('space.transferSpaceOwnership')}
                </h3>
                <p className={styles.settingDescription}>
                  {t('space.transferOwnershipDescription')}
                </p>
              </div>
              <Button
                type="primary"
                onClick={handleTransferOwnership}
                className={styles.transferBtn}
              >
                {t('space.transferSpace')}
              </Button>
            </div>
          </Card>
        )}

        {/* 删除空间 */}
        {showDeleteBtn && (
          <Card className={styles.settingCard}>
            <div className={styles.settingContent}>
              <div className={styles.settingInfo}>
                <h3 className={styles.settingTitle}>
                  {textConfig.deleteSpace}
                </h3>
                <p className={styles.settingDescription}>
                  {textConfig.deleteDescription}
                </p>
              </div>
              <Button
                danger
                type="primary"
                onClick={handleDeleteSpace}
                className={styles.deleteBtn}
              >
                {textConfig.deleteButtonText}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* 弹窗组件 */}
      <TransferOwnershipModal
        open={showTransferModal}
        onClose={handleTransferModalClose}
        onSuccess={onRefresh}
      />

      <DeleteSpaceModal
        open={showDeleteModal}
        onClose={handleDeleteModalClose}
        onSubmit={handleDeleteModalClose}
      />
      <LeaveSpaceModal
        open={showLeaveSpaceModal}
        onClose={handleLeaveSpaceModalClose}
        spaceInfo={spaceInfo}
      />
    </div>
  );
};

export default SpaceSettings;
