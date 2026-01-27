import React, { memo } from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import cn from 'classnames';
import { ReactSVG } from 'react-svg';
import addIcon from '@/assets/imgs/common/add-icon.svg';
interface PrimaryBtnProps extends ButtonProps {
  text: string;
  className?: string;
  showIcon?: boolean;
  icon?: React.ReactNode;
}

export const PrimaryBtn: React.FC<PrimaryBtnProps> = memo(
  ({ text, className, showIcon = false, icon, ...rest }) => {
    return (
      <Button
        type="primary"
        className={cn('astron-primary-btn', className)}
        {...rest}
        icon={
          icon ? (
            icon
          ) : showIcon ? (
            <ReactSVG
              src={addIcon}
              className="w-3.5 h-3.5 fill-current"
              style={{ fill: 'currentColor' }}
            />
          ) : null
        }
      >
        {text}
      </Button>
    );
  }
);
