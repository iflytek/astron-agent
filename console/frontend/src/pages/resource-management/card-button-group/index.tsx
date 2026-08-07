import React from 'react';
import classNames from 'classnames';
import styles from './index.module.scss';

/**
 * 按钮配置项接口
 */
export interface ButtonItemConfig {
  /** 按钮唯一标识 */
  key: string;
  /** 按钮文案 */
  text: string;
  /** 按钮图标 (可以是 ReactNode，如 Icon 组件或 img) */
  icon?: React.ReactNode;
  /** 点击事件回调 */
  onClick?: (key: string, event: React.MouseEvent<HTMLDivElement>) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否隐藏 */
  hidden?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 危险按钮样式 (如删除操作) */
  danger?: boolean;
}

/**
 * 按钮组组件属性
 */
export interface CardButtonGroupProps {
  /** 按钮配置列表 */
  buttons: ButtonItemConfig[];
  /** 按钮组整体样式类名 */
  className?: string;
  /** 按钮组整体样式 */
  style?: React.CSSProperties;
  /** 按钮间距，默认 8px */
  gap?: number;
  /** 布局方向 */
  direction?: 'horizontal' | 'vertical';
  /** 按钮对齐方式 */
  align?: 'left' | 'center' | 'right';
}

/**
 * 卡片按钮组组件
 * 用于在卡片底部或其他位置展示一组操作按钮
 */
const CardButtonGroup: React.FC<CardButtonGroupProps> = ({
  buttons,
  className,
  style,
  gap = 8,
  direction = 'horizontal',
  align = 'left',
}) => {
  // 过滤掉隐藏的按钮
  const visibleButtons = buttons.filter(btn => !btn.hidden);

  if (visibleButtons.length === 0) {
    return null;
  }

  // 处理按钮点击
  const handleClick = (
    btn: ButtonItemConfig,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (btn.disabled) {
      return;
    }
    btn.onClick?.(btn.key, event);
  };

  return (
    <div
      className={classNames(
        styles.buttonGroup,
        styles[`direction-${direction}`],
        styles[`align-${align}`],
        className
      )}
      style={{
        ...style,
        gap: `${gap}px`,
      }}
    >
      {visibleButtons.map(btn => (
        <div
          key={btn.key}
          className={classNames(
            styles.buttonItem,
            {
              [styles.disabled as string]: btn.disabled,
              [styles.danger as string]: btn.danger,
            },
            btn.className
          )}
          onClick={e => handleClick(btn, e)}
        >
          {btn.icon && <span className={styles.icon}>{btn.icon}</span>}
          <span className={styles.text}>{btn.text}</span>
        </div>
      ))}
    </div>
  );
};

export default CardButtonGroup;
