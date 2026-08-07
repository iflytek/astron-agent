import React from 'react';
import styles from './index.module.scss';
import emptyIcon from '@/assets/svgs/resource-empty.svg';
import SpaceButton from '@/components/button-group/space-button';
import arrowDownWhiteIcon from '@/assets/svgs/arrow-down-white.svg';

interface ResourceEmptyProps {
  /**
   * 空状态提示文案
   */
  description?: string;
  /**
   * 创建按钮的文案
   */
  buttonText?: string;
  /**
   * 点击创建按钮的回调函数
   */
  onCreate?: () => void;
}

const ResourceEmpty: React.FC<ResourceEmptyProps> = ({
  description = '暂无数据，快去创建吧~',
  buttonText = '新建',
  onCreate,
}) => {
  return (
    <div className={styles.resourceEmpty}>
      {/* 上半部分：占位图和文案 */}
      <div className={styles.emptyContent}>
        <img src={emptyIcon} alt="empty" className={styles.emptyIcon} />
        <div className={styles.description}>{description}</div>
      </div>

      {/* 下半部分：创建按钮 */}
      <div className={styles.actionArea}>
        <SpaceButton
          config={{
            key: 'create',
            text: buttonText,
            type: 'primary',
            size: 'middle',
            icon: (
              <img
                src={arrowDownWhiteIcon}
                alt="add"
                style={{ width: 14, height: 14, marginRight: 2 }}
              />
            ),
            onClick: () => onCreate?.(),
          }}
        />
      </div>
    </div>
  );
};

export default ResourceEmpty;
