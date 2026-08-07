import React, { memo } from 'react';
import { Collapse } from 'antd';
import { cn } from '@/utils';

import downIcon from '@/assets/imgs/workflow/flow-part-down.svg';

function FLowCollapse({
  label,
  content,
  className = '',
  ...reset
}): React.ReactElement {
  return (
    <Collapse
      defaultActiveKey="1"
      size="small"
      className={cn('flow-collapse', className)}
      expandIcon={({ isActive }) => {
        return (
          <img
            className="w-3 h-3"
            src={downIcon}
            style={{
              transform: isActive ? 'rotate(90deg)' : '',
            }}
          />
        );
      }}
      items={[
        {
          key: '1',
          label: <div>{label}</div>,
          children: <div>{content}</div>,
        },
      ]}
      {...reset}
    />
  );
}

export default memo(FLowCollapse);
