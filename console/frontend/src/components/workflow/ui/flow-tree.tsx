import React, { memo } from 'react';
import { Tree } from 'antd';

import flowArrowDown from '@/assets/imgs/workflow/flow-arrow-down.png';

function FLowTree({
  treeData = [],
  showLine = true,
  ...reset
}): React.ReactElement {
  return (
    <Tree
      showLine={showLine}
      //@ts-ignore
      switcherIcon={({ expanded }) => (
        <img
          src={flowArrowDown}
          className="w-[8px] h-[7px]"
          style={{
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.3s ease',
          }}
        />
      )}
      defaultExpandAll
      treeData={treeData}
      {...reset}
    />
  );
}

export default memo(FLowTree);
