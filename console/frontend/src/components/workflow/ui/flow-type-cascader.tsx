import React, { useState, memo } from 'react';
import { Cascader } from 'antd';
import { cn } from '@/utils';

import formSelect from '@/assets/imgs/main/icon_nav_dropdown.svg';

function FlowTypeCascader({ className = '', ...reset }): React.ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full overflow-hidden">
      <Cascader
        open={open}
        onDropdownVisibleChange={() => setOpen(!open)}
        allowClear={false}
        suffixIcon={<img src={formSelect} className="w-4 h-4" />}
        placeholder="请选择"
        className={cn('flow-select nodrag w-full', className)}
        dropdownAlign={{ offset: [0, 0] }}
        popupClassName="custom-cascader-popup"
        {...reset}
        dropdownRender={menu => (
          <div
            onWheel={e => {
              e.stopPropagation();
            }}
          >
            {menu}
          </div>
        )}
        displayRender={labels => labels[labels.length - 1]}
      />
    </div>
  );
}

export default memo(FlowTypeCascader);
