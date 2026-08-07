import React from 'react';
import { Button } from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  LockOutlined,
} from '@ant-design/icons';
import styles from './index.module.scss';
import { SpaceType } from '@/types/permission';
import { useUserStoreHook } from '@/hooks/use-user-store';
import { useTranslation } from 'react-i18next';

// 按钮配置接口
interface ButtonConfig {
  key: string;
  text: string;
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  // 支持的状态列表，只有匹配的状态才显示此按钮
  statusList: string[];
  // 支持的空间类型列表，只有匹配的类型才显示此按钮
  spaceTypeList?: string[]; //('personal' | 'team')[];
}

interface ActionListProps {
  spaceType: string; // 'personal' | 'team' | ''
  status: string;
  space: any;
  onButtonClick: (action: string, space: any) => void;
  // 可选：自定义按钮配置列表
  buttonConfigs?: ButtonConfig[];
}

const ActionList: React.FC<ActionListProps> = ({
  spaceType,
  status,
  space,
  onButtonClick,
  buttonConfigs,
}) => {
  const { isSuperAdmin, isAdmin, isMember, isOwner } = useUserStoreHook();
  const { t } = useTranslation();
  // 默认按钮配置列表
  const defaultButtonConfigs: ButtonConfig[] = [
    {
      key: 'enter',
      text: t('space.enterManagement'),
      statusList: ['joined'],
      spaceTypeList: ['personal'],
    },
    {
      key: 'enter',
      text: t('space.enterSpace'),
      statusList: ['joined'],
      spaceTypeList: ['team'],
    },
    {
      key: 'join',
      text: t('space.applySpace'),
      statusList: ['notJoined'],
      spaceTypeList: ['team'], // 只有团队空间支持申请加入
    },
    {
      key: 'pending',
      text: t('space.applying'),
      statusList: ['pending'],
      spaceTypeList: ['team'], // 只有团队空间支持申请加入
      disabled: true,
    },
    {
      key: 'noPermission',
      text: t('space.noPermission'),
      icon: <LockOutlined />,
      statusList: ['noPermission'],
      spaceTypeList: ['personal', 'team'],
      disabled: true,
    },
  ];

  // 根据空间类型和状态过滤按钮
  const getVisibleButtons = (
    configs: ButtonConfig[],
    currentSpaceType: string,
    currentStatus: string
  ) => {
    // 企业空间管理员只展示进入空间按钮(需求变更)
    // if (currentSpaceType === SpaceType.ENTERPRISE && isSuperAdmin) {
    //   const enterButton = configs.find(config =>
    //     config.key === 'enter' &&
    //     config.spaceTypeList?.includes(SpaceType.ENTERPRISE)
    //   );
    //   return enterButton ? [{ ...enterButton, onClick: () => onButtonClick('enter', space) }] : [];
    // }

    // 其他情况根据状态和空间类型过滤按钮
    return configs
      .filter(config => {
        // 状态匹配
        const statusMatch = config.statusList.includes(currentStatus);
        // 空间类型匹配：如果没有指定spaceTypeList则认为对所有类型可见
        const spaceTypeMatch =
          !config.spaceTypeList ||
          config.spaceTypeList.includes(currentSpaceType);
        return statusMatch && spaceTypeMatch;
      })
      .map(config => ({
        ...config,
        onClick: () => onButtonClick(config.key, space),
      }));
  };

  const configs = buttonConfigs || defaultButtonConfigs;
  const visibleButtons = getVisibleButtons(configs, spaceType, status);

  return (
    <div className={styles.actionList}>
      {visibleButtons.map(button => (
        <Button
          key={button.key}
          loading={button.loading}
          type={button.type || 'default'}
          className={styles.actionBtn}
          disabled={button.disabled}
          icon={button.icon}
          onClick={button.onClick}
        >
          {button.text}
        </Button>
      ))}
    </div>
  );
};

export default ActionList;
