import React, { memo } from 'react';
import { InputNumber } from 'antd';
import { cn } from '@/utils';

function FlowInputNumber({ className = '', ...reset }): React.ReactElement {
  return (
    <div onKeyDown={e => e.stopPropagation()}>
      <InputNumber
        controls={false}
        placeholder="请输入"
        className={cn('flow-input-number', className)}
        {...reset}
      />
    </div>
  );
}

export default memo(FlowInputNumber);
