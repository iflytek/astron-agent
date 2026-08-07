import { InputParamsData } from '@/types/resource';
import { Tooltip } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import inputErrorMsg from '@/assets/imgs/plugin/input_error_msg.svg';
import addItemIcon from '@/assets/imgs/workflow/add-item-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';
import { cloneDeep } from 'lodash';
import React from 'react';

export const useColumns = ({
  renderInput,
  handleAddItem,
  deleteNodeFromTree,
  debuggerParamsData,
  setDebuggerParamsData,
}: {
  renderInput: (record: InputParamsData) => React.ReactNode;
  handleAddItem: (record: InputParamsData) => void;
  deleteNodeFromTree: (
    tree: InputParamsData[],
    id: string
  ) => InputParamsData[];
  debuggerParamsData: InputParamsData[];
  setDebuggerParamsData: React.Dispatch<
    React.SetStateAction<InputParamsData[]>
  >;
}): {
  columns: ColumnsType<InputParamsData>;
} => {
  const { t } = useTranslation();
  const columns: ColumnsType<InputParamsData> = [
    {
      title: t('workflow.nodes.common.parameterName'),
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      render: (name, record) => (
        <Tooltip
          title={record?.description}
          overlayClassName="black-tooltip config-secret"
        >
          {name}
        </Tooltip>
      ),
    },
    {
      title: t('workflow.nodes.common.variableType'),
      dataIndex: 'type',
      key: 'type',
      width: '10%',
    },
    {
      title: t('workflow.nodes.toolNode.isRequired'),
      dataIndex: 'required',
      key: 'required',
      width: '10%',
      render: required => (
        <div
          style={{
            color: required ? '#6356EA' : '#F74E43',
          }}
        >
          {required
            ? t('workflow.nodes.toolNode.yes')
            : t('workflow.nodes.toolNode.no')}
        </div>
      ),
    },
    {
      title: t('workflow.nodes.toolNode.parameterValue'),
      dataIndex: 'default',
      key: 'default',
      width: '40%',
      render: (_, record) => (
        <div className="w-full flex flex-col gap-1">
          {record?.type === 'object' || record?.type === 'array'
            ? null
            : renderInput(record)}
          {record?.defaultErrMsg && (
            <div className="flex items-center gap-1">
              <img src={inputErrorMsg} className="w-[14px] h-[14px]" alt="" />
              <p className="text-[#F74E43] text-sm">{record?.defaultErrMsg}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('workflow.nodes.toolNode.operation'),
      key: 'operation',
      width: '5%',
      render: (_, record) => (
        <div className=" flex items-center gap-2">
          {record?.type === 'array' && (
            <Tooltip
              title={t('workflow.nodes.toolNode.addSubItem')}
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
                  setDebuggerParamsData(
                    cloneDeep(deleteNodeFromTree(debuggerParamsData, record.id))
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
