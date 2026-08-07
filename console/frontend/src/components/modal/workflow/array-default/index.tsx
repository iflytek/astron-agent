import React, { FC } from 'react';
import { Table, Button } from 'antd';

import close from '@/assets/imgs/workflow/modal-close.png';

import { InputParamsData } from '@/types/resource';

import { useArrayDefault } from './hooks/use-array-default';
import { useColumns } from './hooks/use-columns';

const ArrayDefault: FC<{
  setArrayDefaultModal: (value: boolean) => void;
  currentArrayDefaultId: string;
  inputParamsData: InputParamsData[];
  setInputParamsData: (value: InputParamsData[]) => void;
}> = ({
  setArrayDefaultModal,
  currentArrayDefaultId,
  inputParamsData,
  setInputParamsData,
}) => {
  const {
    handleAddItem,
    customExpandIcon,
    handleInputParamsChange,
    handleCheckInput,
    handleSaveData,
    deleteNodeFromTree,
    defaultParamsData,
    setDefaultParamsData,
    expandedRowKeys,
  } = useArrayDefault({
    currentArrayDefaultId,
    inputParamsData,
    setInputParamsData,
    setArrayDefaultModal,
  });
  const { columns } = useColumns({
    handleInputParamsChange,
    handleCheckInput,
    handleAddItem,
    deleteNodeFromTree,
    defaultParamsData,
    setDefaultParamsData,
  });

  return (
    <div className="mask">
      <div className="modalContent min-w-[624px] flex flex-col min-h-[350px] pr-0">
        <div className="flex items-center justify-between pr-6">
          <div className="text-base font-medium">默认值设置</div>
          <img
            src={close}
            className="w-3 h-3 cursor-pointer"
            alt=""
            onClick={() => setArrayDefaultModal(false)}
          />
        </div>
        <div
          className="flex-1 pr-6 overflow-auto py-[24px]"
          style={{
            maxHeight: '50vh',
          }}
        >
          <Table
            className="tool-params-table"
            pagination={false}
            columns={columns}
            dataSource={defaultParamsData}
            expandable={{
              expandIcon: customExpandIcon,
              expandedRowKeys,
            }}
            rowKey={record => record?.id}
            locale={{
              emptyText: (
                <div style={{ padding: '20px' }}>
                  <p className="text-[#333333]">暂无数据</p>
                </div>
              ),
            }}
          />
        </div>
        <div className="flex justify-end pr-6">
          <Button
            type="primary"
            className="px-[40px]"
            onClick={() => handleSaveData()}
          >
            保存
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ArrayDefault;
