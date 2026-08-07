import React from 'react';
import classNames from 'classnames';
import styles from './index.module.scss';

export type TagTheme = 'default' | 'success' | 'warning' | 'danger';
export type TagSize = 'middle' | 'small';

export interface SpaceTagProps {
  /** 标签文本 */
  children: React.ReactNode;
  /** 图标组件 */
  icon?: React.ReactNode;
  /** 是否显示边框 */
  showBorder?: boolean;
  /** 主题 */
  theme?: TagTheme;
  /** 尺寸 */
  size?: TagSize;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
}

const SpaceTag: React.FC<SpaceTagProps> = ({
  children,
  icon,
  showBorder = false,
  theme = 'default',
  size = 'middle',
  style,
  className,
}) => {
  return (
    <span
      className={classNames(
        styles.tag,
        styles[theme],
        styles[size],
        showBorder && styles.hasBorder,
        className
      )}
      style={style}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  );
};

export default SpaceTag;
