import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tooltip } from 'antd';
import {
  ShareAltOutlined,
  UserAddOutlined,
  EditOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import ButtonGroup, {
  SpaceButton,
  PermissionFailureBehavior,
} from '@/components/button-group';
import type { ButtonConfig } from '@/components/button-group';
import spaceAvatar from '@/assets/imgs/space/spaceAvatar.png';
import BackIcon from '@/assets/imgs/sparkImg/back.svg';
import styles from './index.module.scss';

import { useSpaceI18n } from '@/pages/space/hooks/use-space-i18n';
import { ModuleType, OperationType } from '@/types/permission';
import { useSpaceType } from '@/hooks/use-space-type';
import { roleToRoleType } from '@/pages/space/config';
import { useTranslation } from 'react-i18next';

interface SpaceInfo {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'member';
  memberCount: number;
  totalMembers: number;
  ownerName: string;
  userRole: number;
}

interface DetailHeaderProps {
  spaceInfo: SpaceInfo;
  onEditSpace: () => void;
  onShare: () => void;
  onAddMember: () => void;
}

const DetailHeader: React.FC<DetailHeaderProps> = ({
  spaceInfo,
  onEditSpace,
  onShare,
  onAddMember,
}) => {
  const navigate = useNavigate();
  const { roleTextMap } = useSpaceI18n();
  const { goToSpaceManagement } = useSpaceType(navigate);
  const infoContentRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const getRoleText = (role: string) => {
    return roleTextMap[role as keyof typeof roleTextMap] || role;
  };

  // 标题区域按钮配置
  const titleButtons: ButtonConfig[] = [
    {
      key: 'edit',
      text: '',
      icon: <EditOutlined />,
      type: 'text',
      size: 'small',
      tooltip: t('space.editSpaceInfo'),
      permission: {
        module: ModuleType.SPACE,
        operation: OperationType.SPACE_SETTINGS,
        // failureBehavior: PermissionFailureBehavior.DISABLE,
      },
      onClick: () => onEditSpace(),
    },
  ];

  // 操作按钮配置
  const actionButtons: ButtonConfig[] = [
    {
      key: 'share',
      text: t('space.share'),
      icon: <ShareAltOutlined />,
      type: 'default',
      permission: {
        customCheck: () => {
          // return spaceInfo.userRole === 1 || spaceInfo.userRole === 2;
          return false;
        },
        failureBehavior: PermissionFailureBehavior.HIDE,
      },
      onClick: () => onShare(),
    },
    {
      key: 'addMember',
      text: t('space.addMember'),
      icon: <UserAddOutlined />,
      type: 'primary',
      permission: {
        module: ModuleType.SPACE,
        operation: OperationType.ADD_MEMBERS,
      },
      onClick: () => onAddMember(),
    },
  ];

  return (
    <div className={styles.detailHeader}>
      <div className={styles.back}>
        <img src={BackIcon} alt="back" onClick={() => goToSpaceManagement()} />
      </div>
      <div className={styles.spaceInfo}>
        <div className={styles.avatarContainer}>
          <div className={styles.avatar}>
            <img
              src={spaceInfo.avatarUrl || spaceAvatar}
              alt=""
              className={styles.avatarImage}
            />
          </div>
        </div>
        <div className={styles.infoContent} ref={infoContentRef}>
          <div className={styles.titleRow}>
            <Tooltip title={spaceInfo.name} placement="bottomLeft">
              <h1 className={styles.title}>{spaceInfo.name}</h1>
            </Tooltip>
            <SpaceButton
              config={titleButtons[0] || { key: '', text: '' }}
              className={styles.editBtn}
              style={{ color: '#999' }}
            />
            <span className={styles.roleTag}>
              {getRoleText(roleToRoleType(spaceInfo.userRole))}
            </span>
          </div>
          <Tooltip
            title={spaceInfo.description}
            placement="bottomLeft"
            getPopupContainer={() => infoContentRef.current || document.body}
            overlayStyle={{
              maxWidth: '60vw',
              maxHeight: 'calc(100vh - 180px)',
              overflow: 'auto',
            }}
          >
            <p className={styles.description}>{spaceInfo.description}</p>
          </Tooltip>
        </div>
      </div>
      <div className={styles.actions}>
        <ButtonGroup buttons={actionButtons} className={styles.actionButtons} />
      </div>
    </div>
  );
};

export default DetailHeader;
