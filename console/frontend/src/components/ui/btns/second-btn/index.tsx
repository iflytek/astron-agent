import React, { memo } from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import cn from 'classnames';

interface SecondaryBtnProps extends ButtonProps {
  text: string;
  className?: string;
}

export const SecondaryBtn: React.FC<SecondaryBtnProps> = memo(
  ({ text, className, ...rest }) => {
    return (
      <Button className={cn('astron-default-btn', className)} {...rest}>
        {text}
      </Button>
    );
  }
);
