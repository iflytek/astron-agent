import React, { useState, useCallback, memo } from 'react';
import { Cascader, Empty } from 'antd';
import { cn } from '@/utils';
import { useTranslation } from 'react-i18next';
import FlowTree from './flow-tree';

import formSelect from '@/assets/imgs/main/icon_nav_dropdown.svg';

function FlowCascader({
  className = '',
  handleTreeSelect,
  ...reset
}): React.ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleOnSelect = useCallback((_, { node }) => {
    handleTreeSelect(node);
    setOpen(false);
  }, []);

  const titleRender = useCallback(nodeData => {
    let type = nodeData?.type;
    if (type?.includes('array')) {
      const arr = nodeData?.type?.split('-');
      if (nodeData?.fileType) {
        type = `Array<${
          nodeData?.fileType?.slice(0, 1).toUpperCase() +
          nodeData?.fileType?.slice(1)
        }>`;
      } else {
        type = `Array<${arr[1].slice(0, 1).toUpperCase() + arr[1].slice(1)}>`;
      }
    } else if (nodeData?.fileType) {
      type = nodeData?.fileType;
    }
    return (
      <div className="flex items-center gap-2">
        <span>{nodeData.label}</span>
        <div className="bg-[#F0F0F0] px-2.5 py-0.5 rounded text-xs">
          {type.substring(0, 1).toUpperCase() + type.substring(1)}
        </div>
      </div>
    );
  }, []);

  const optionRender = useCallback(option => {
    return option?.disabled ? (
      <div className="flex flex-col items-center">
        <Empty />
      </div>
    ) : option?.parentNode ? (
      <div className="flex items-center gap-1">
        <span>{option.label}</span>
        {option.type && (
          <div className="bg-[#F0F0F0] py-1 px-2.5 rounded text-xs">
            {option.type}
          </div>
        )}
      </div>
    ) : (
      <div onClick={e => e.stopPropagation()}>
        <FlowTree
          fieldNames={{
            key: 'id',
            title: 'label',
          }}
          defaultExpandAll
          titleRender={titleRender}
          showLine={false}
          treeData={option?.references}
          onSelect={handleOnSelect}
        />
      </div>
    );
  }, []);

  return (
    <div className="w-full overflow-hidden">
      <Cascader
        open={open}
        onDropdownVisibleChange={() => setOpen(!open)}
        optionRender={optionRender}
        allowClear={false}
        suffixIcon={<img src={formSelect} className="w-4 h-4" />}
        placeholder={t('common.pleaseSelect')}
        className={cn('flow-select nodrag w-full', className)}
        dropdownAlign={{ offset: [0, 0] }}
        popupClassName="custom-cascader-popup"
        {...reset}
        // getPopupContainer={triggerNode => triggerNode.parentNode}
      />
    </div>
  );
}

export default memo(FlowCascader);
