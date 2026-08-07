import React from 'react';
import { Button } from 'antd';
import classNames from 'classnames';
import SpaceButton from './space-button';
import type { ButtonConfig, ButtonGroupProps } from './types';
import styles from './button-group.module.scss';

const ButtonGroup: React.FC<ButtonGroupProps> = ({
  buttons,
  userRole,
  className,
  size = 'middle',
  onButtonClick,
  style,
  vertical = false,
  split = true,
  defaultPermissionFailureBehavior,
}) => {
  // 渲染单个按钮，权限控制由 SpaceButton 组件处理
  const renderButton = (
    buttonConfig: ButtonConfig,
    index: number
  ): React.ReactNode => {
    return (
      <SpaceButton
        key={buttonConfig.key}
        config={buttonConfig}
        userRole={userRole}
        size={size}
        onClick={onButtonClick}
        inGroup={true}
        defaultPermissionFailureBehavior={defaultPermissionFailureBehavior}
      />
    );
  };

  // 渲染所有按钮，过滤掉不显示的按钮（返回null的）
  const renderedButtons = buttons
    .map((button, index) => renderButton(button, index))
    .filter(button => button !== null);

  // 如果没有可显示的按钮，返回null
  if (renderedButtons.length === 0) {
    return null;
  }

  const sizeClassNameKey = `size-${size}`;
  const sizeClassName = styles[sizeClassNameKey] ?? sizeClassNameKey;
  const groupClassName = classNames(
    styles.spaceButtonGroup,
    sizeClassName,
    vertical && styles.vertical,
    !split && styles.noSplit,
    className
  );

  return (
    <Button.Group className={groupClassName} size={size} style={style}>
      {renderedButtons}
    </Button.Group>
  );
};

export default ButtonGroup;
