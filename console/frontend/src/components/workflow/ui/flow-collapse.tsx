import React, { memo } from 'react';
import { Collapse, type CollapseProps } from 'antd';
import { cn } from '@/utils';
import { RightOutlined } from '@ant-design/icons';

interface FlowCollapseProps extends Omit<CollapseProps, 'items'> {
  label: React.ReactNode;
  content: React.ReactNode;
}

function FLowCollapse({
  label,
  content,
  className = '',
  ...reset
}: FlowCollapseProps): React.ReactElement {
  return (
    <Collapse
      defaultActiveKey="1"
      size="small"
      className={cn('flow-collapse', className)}
      expandIcon={({ isActive }) => {
        return (
          <RightOutlined
            className="flow-section-chevron"
            rotate={isActive ? 90 : 0}
          />
        );
      }}
      items={[
        {
          key: '1',
          label: <div className="flow-section-heading">{label}</div>,
          children: <div className="flow-section-content">{content}</div>,
        },
      ]}
      {...reset}
    />
  );
}

export default memo(FLowCollapse);
