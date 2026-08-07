import { InputParamsData } from '@/types/resource';
import { ColumnsType } from 'antd/es/table';
import { Tooltip } from 'antd';
import { capitalizeFirstLetter } from '@/utils/reactflow-utils';
import { Input } from 'antd';

import addItemIcon from '@/assets/imgs/workflow/add-item-icon.png';

import remove from '@/assets/imgs/workflow/input-remove-icon.png';
import { cloneDeep } from 'lodash';

export const useColumns = ({
  handleInputParamsChange,
  handleCheckInput,
  handleAddItem,
  deleteNodeFromTree,
  defaultParamsData,
  setDefaultParamsData,
}: {
  handleInputParamsChange: (
    id: string,
    value: string | number | boolean
  ) => void;
  handleCheckInput: (record: InputParamsData, key: string) => void;
  handleAddItem: (record: InputParamsData) => void;
  deleteNodeFromTree: (
    tree: InputParamsData[],
    id: string
  ) => InputParamsData[];
  defaultParamsData: InputParamsData[];
  setDefaultParamsData: (data: InputParamsData[]) => void;
}): {
  columns: ColumnsType<InputParamsData>;
} => {
  const columns: ColumnsType<InputParamsData> = [
    {
      title: '参数名称',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      render: (name, record) => (
        <Tooltip
          title={record?.description}
          overlayClassName="black-tooltip config-secret"
        >
          <div className="flex items-center gap-1 h-[40px]">
            <span>{name}</span>
            {record?.required && (
              <span className="text-[#F74E43] flex-shrink-0">*</span>
            )}
            <div className="bg-[#F0F0F0] py-1 px-2.5 rounded text-xs ml-1 flex-shrink-0">
              {capitalizeFirstLetter(record.type)}
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: '参数值',
      dataIndex: 'default',
      key: 'default',
      width: '40%',
      render: (_, record) => (
        <div className="w-full pb-[8px]">
          {record?.type === 'object' || record?.type === 'array' ? null : (
            <Input
              placeholder="请输入参数值"
              className="global-input inline-input"
              value={record?.default as string}
              onChange={e => {
                handleInputParamsChange(record?.id, e.target.value);
                handleCheckInput(record, 'default');
              }}
              onBlur={() => handleCheckInput(record, 'default')}
            />
          )}
          <p className="text-[#F74E43] text-xs absolute bottom-0 left-0">
            {record?.defaultErrMsg}
          </p>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'operation',
      width: '5%',
      render: (_, record) => (
        <div className="flex items-center gap-2 ">
          {record?.type === 'array' && (
            <Tooltip
              title="添加子项"
              overlayClassName="black-tooltip config-secret"
            >
              <img
                src={addItemIcon}
                className="w-4 h-4 mt-1.5 cursor-pointer"
                onClick={() => handleAddItem(record)}
              />
            </Tooltip>
          )}
          {record?.fatherType === 'array' && (
            <Tooltip title="" overlayClassName="black-tooltip config-secret">
              <img
                className="w-4 h-4 cursor-pointer"
                src={remove}
                onClick={() => {
                  setDefaultParamsData(
                    cloneDeep(deleteNodeFromTree(defaultParamsData, record.id))
                  );
                }}
                alt=""
              />
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return {
    columns,
  };
};
