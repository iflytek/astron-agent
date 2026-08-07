import React, { ReactNode } from 'react';
import styles from './index.module.scss';
import defaultEmptyIcon from '@/assets/imgs/space/empty.png';

interface EmptyProps {
  /**
   * 自定义图标，支持传入ReactNode
   */
  icon?: ReactNode | string;
  /**
   * 自定义文案
   */
  text?: string;
  /**
   * 自定义样式
   */
  className?: string;
  /**
   * 是否在父容器中垂直居中
   * @default false
   */
  centered?: boolean;
}

const Empty: React.FC<EmptyProps> = ({
  icon = defaultEmptyIcon,
  text = '暂无数据',
  className = '',
  centered = false,
}) => {
  return (
    <div className={`${styles.wrapper} ${centered ? styles.centered : ''}`}>
      <div className={`${styles.empty} ${className}`}>
        <div className={styles.icon}>
          {typeof icon === 'string' ? <img src={icon} alt="empty" /> : icon}
        </div>
        <span className={styles.text}>{text}</span>
      </div>
    </div>
  );
};

export default Empty;
