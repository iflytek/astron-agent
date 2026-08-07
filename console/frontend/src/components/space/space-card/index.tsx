import React, { useRef } from 'react';
import { Card, Tooltip } from 'antd';
import styles from './index.module.scss';
import ActionList from './components/action-list';
import JoinStatus from './components/join-status';

import spaceAvatar from '@/assets/imgs/space/spaceAvatar.png';
import creator from '@/assets/imgs/space/creator.svg';
import member from '@/assets/imgs/space/member.svg';
import { SpaceType } from '@/types/permission';

interface SpaceItem {
  id: string;
  avatarUrl?: string;
  name: string;
  description: string;
  ownerName: string;
  memberCount: number;
  applyStatus?: number; // 空间状态：'pending' | 'joined' | 'notJoined' | 'noPermission'
}

interface SpaceCardProps {
  spaceType: string; //'personal' | 'team' | ''
  space: SpaceItem;
  style?: React.CSSProperties;
  onButtonClick: (action: string, space: SpaceItem) => void;
}

const SpaceCard: React.FC<SpaceCardProps> = ({
  spaceType,
  space,
  style,
  onButtonClick,
}) => {
  const infoContentRef = useRef<HTMLDivElement>(null);
  const showJoinStatus =
    spaceType === SpaceType.ENTERPRISE && space.applyStatus !== null;

  // 根据文本内容计算合适的宽度，使展示区域保持4:3比例
  const calculateTooltipWidth = (text: string) => {
    if (!text) return 440;

    // 基础配置
    const lineHeight = 30; // 固定行高
    const minWidth = 440;
    const maxWidth = window.innerWidth;

    // 计算文本总展示长度（考虑中英文字符宽度）
    const chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishCount = text.length - chineseCount;
    const totalLength = chineseCount * 20 + englishCount * 10;

    // 根据4:3比例计算合适的宽度
    const idealWidth = Math.round(
      Math.sqrt((4 / 3) * lineHeight * totalLength)
    );

    // 确保宽度在限制范围内
    return Math.max(minWidth, Math.min(idealWidth, maxWidth));
  };

  // 获取当前空间状态，如果没有设置则根据其他属性推断
  const getSpaceStatus = (space: SpaceItem): string => {
    //应该可以使用 userRole 判断， 1是所有者，2是管理，3是成员
    if (spaceType !== SpaceType.ENTERPRISE) {
      return 'joined';
    }

    switch (space.applyStatus) {
      case 1:
        return 'joined';
      case 2:
        return 'notJoined';
      case 3:
        return 'pending';
      default:
        return 'joined';
    }
  };

  const currentStatus = getSpaceStatus(space);

  return (
    <Card className={`${styles.spaceCard} ${styles[spaceType]}`} style={style}>
      <div className={styles.cardHeader}>
        <img
          className={styles.avatar}
          src={space.avatarUrl || spaceAvatar}
          alt=""
        />
      </div>

      <div className={styles.cardBody} ref={infoContentRef}>
        <div className={styles.titleContainer}>
          <div></div>
          <Tooltip title={space.name} placement="top">
            <div className={styles.spaceTitle}>{space.name}</div>
          </Tooltip>
          {showJoinStatus && (
            <JoinStatus spaceType={spaceType} status={currentStatus} />
          )}
        </div>

        <Tooltip
          title={space.description}
          placement="bottom"
          getPopupContainer={() => document.body}
          overlayStyle={{
            maxWidth: `${calculateTooltipWidth(space.description)}px`,
            lineHeight: '24px',
            overflow: 'auto',
          }}
        >
          <p className={styles.spaceDescription}>{space.description}</p>
        </Tooltip>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.spaceInfo}>
          <div className={styles.authorInfo}>
            <img className={styles.icon} src={creator} alt="" />
            <Tooltip title={space.ownerName} placement="top">
              <span className={styles.author}>{space.ownerName}</span>
            </Tooltip>
          </div>
          <div className={styles.divider}></div>
          <div className={styles.memberInfo}>
            <img className={styles.icon} src={member} alt="" />
            <span className={styles.memberCount}>{space.memberCount}</span>
          </div>
        </div>

        <div className={styles.manageBtnContainer}>
          <ActionList
            spaceType={spaceType}
            status={currentStatus}
            space={space}
            onButtonClick={onButtonClick}
          />
        </div>
      </div>
    </Card>
  );
};

export default SpaceCard;
