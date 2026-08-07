import React, { useMemo } from 'react';
import { Tag } from 'antd';
import styles from './index.module.scss';

import joinedIcon from '@/assets/imgs/space/spaceJoined.png';

// 状态配置接口
interface StatusConfig {
  key: string;
  label: string;
  color: string;
  bgColor: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  // 支持的空间类型列表
  spaceTypeList?: ('personal' | 'team')[];
}

interface JoinStatusProps {
  spaceType: string; //"personal" | "team" ? ""
  status: string;
  // 可选：自定义状态配置列表
  statusConfigs?: StatusConfig[];
}

const JoinStatus: React.FC<JoinStatusProps> = ({
  spaceType,
  status,
  statusConfigs,
}) => {
  // 默认状态配置列表
  const defaultStatusConfigs: StatusConfig[] = [
    {
      key: 'pending',
      label: '申请中',
      color: '#FF9602',
      bgColor: '#FFF4E5',
    },
    {
      key: 'joined',
      label: '已加入',
      color: '#477D62',
      bgColor: '#CFF4E1',
      icon: <img src={joinedIcon} alt="joined" />,
    },
    {
      key: 'notJoined',
      label: '未加入',
      color: '#666666',
      bgColor: '#E6E6E8',
    },
  ];

  // 根据空间类型和状态获取当前状态配置
  const getCurrentStatusConfig = (
    configs: StatusConfig[],
    currentStatus: string,
    currentSpaceType: string
  ): StatusConfig | null => {
    return (
      configs.find(config => {
        const statusMatch = config.key === currentStatus;
        const spaceTypeMatch =
          !config.spaceTypeList ||
          config.spaceTypeList.includes(
            currentSpaceType as 'personal' | 'team'
          );
        return statusMatch && spaceTypeMatch;
      }) || null
    );
  };

  const configs = statusConfigs || defaultStatusConfigs;
  const currentStatusConfig = getCurrentStatusConfig(
    configs,
    status,
    spaceType
  );

  // 如果找不到匹配的状态配置，不渲染任何内容
  if (!currentStatusConfig) {
    return null;
  }

  const statusStyles = useMemo(() => {
    return {
      color: currentStatusConfig.color,
      backgroundColor: currentStatusConfig.bgColor,
    };
  }, [currentStatusConfig]);

  return (
    <div className={styles.joinStatus} style={statusStyles}>
      {currentStatusConfig.icon && (
        <div className={styles.icon}>{currentStatusConfig.icon}</div>
      )}
      <div className={styles.label}>{currentStatusConfig.label}</div>
    </div>
  );
};

export default JoinStatus;
