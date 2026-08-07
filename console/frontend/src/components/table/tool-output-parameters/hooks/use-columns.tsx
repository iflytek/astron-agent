import { InputParamsData } from '@/types/resource';
import { ColumnsType } from 'antd/es/table';
import { Input, Select, Switch, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

import formSelect from '@/assets/imgs/workflow/icon_form_select.png';
import addItemIcon from '@/assets/imgs/workflow/add-item-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';
import questionCircle from '@/assets/imgs/workflow/question-circle.png';
import inputErrorMsg from '@/assets/imgs/plugin/input_error_msg.svg';
import { cloneDeep } from 'lodash';
import { FC } from 'react';

export const useColumns = ({
  handleInputParamsChange,
  handleCheckInput,
  handleAddItem,
  deleteNodeFromTree,
  outputParamsData,
  setOutputParamsData,
  typeOptions,
}: {
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void;
  handleCheckInput: (record: InputParamsData, key: string) => void;
  handleAddItem: (record: InputParamsData) => void;
  deleteNodeFromTree: (
    tree: InputParamsData[],
    id: string
  ) => InputParamsData[];
  outputParamsData: InputParamsData[];
  setOutputParamsData: (data: InputParamsData[]) => void;
  typeOptions: { label: string; value: string }[];
}): {
  columns: ColumnsType<InputParamsData>;
} => {
  const { t } = useTranslation();
  const columns: ColumnsType<InputParamsData> = [
    {
      title: (
        <div className="flex items-center gap-2">
          <span>
            <span className="text-[#F74E43] text-xs">* </span>
            {t('workflow.nodes.common.parameterName')}
          </span>
          <Tooltip
            title={t('workflow.nodes.toolNode.parameterNameDescription')}
            overlayClassName="black-tooltip config-secret"
          >
            <img src={questionCircle} className="w-3 h-3" alt="" />
          </Tooltip>
        </div>
      ),
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      render: (name, record) => (
        <div className="flex flex-col w-full gap-1">
          <Input
            disabled={record?.fatherType === 'array'}
            placeholder={t('workflow.nodes.toolNode.pleaseEnterParameterName')}
            className="global-input params-input inline-input"
            value={name}
            onChange={e => {
              handleInputParamsChange(record?.id, 'name', e.target.value);
              handleCheckInput(record, 'name');
            }}
            onBlur={() => handleCheckInput(record, 'name')}
          />
          {record?.nameErrMsg && (
            <div className="flex items-center gap-1">
              <img src={inputErrorMsg} className="w-[14px] h-[14px]" alt="" />
              <p className="text-[#F74E43] text-sm">{record?.nameErrMsg}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-2">
          <span>
            <span className="text-[#F74E43] text-xs">* </span>
            {t('workflow.nodes.common.description')}
          </span>
          <Tooltip
            title={t('workflow.nodes.toolNode.pleaseEnterParameterDescription')}
            overlayClassName="black-tooltip config-secret"
          >
            <img src={questionCircle} className="w-3 h-3" alt="" />
          </Tooltip>
        </div>
      ),
      dataIndex: 'description',
      key: 'description',
      width: '40%',
      render: (description, record) => (
        <div className="flex flex-col gap-1">
          <Input
            placeholder={t(
              'workflow.nodes.toolNode.pleaseEnterParameterDescription'
            )}
            className="global-input params-input"
            value={description}
            onChange={e => {
              handleInputParamsChange(
                record?.id,
                'description',
                e.target.value
              );
              handleCheckInput(record, 'description');
            }}
            onBlur={() => handleCheckInput(record, 'description')}
          />
          {record?.descriptionErrMsg && (
            <div className="flex items-center gap-1">
              <img src={inputErrorMsg} className="w-[14px] h-[14px]" alt="" />
              <p className="text-[#F74E43] text-sm">
                {record?.descriptionErrMsg}
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-2">
          <span>
            <span className="text-[#F74E43] text-xs">* </span>
            {t('workflow.nodes.common.variableType')}
          </span>
        </div>
      ),
      dataIndex: 'type',
      key: 'type',
      width: '10%',
      render: (type, record) => (
        <Select
          suffixIcon={<img src={formSelect} className="w-4 h-4" />}
          placeholder={t('workflow.nodes.toolNode.pleaseSelect')}
          className="global-select params-select"
          options={
            record?.fatherType === 'array'
              ? typeOptions?.filter(option => option.value !== 'array')
              : typeOptions
          }
          value={type}
          onChange={value => handleInputParamsChange(record?.id, 'type', value)}
        />
      ),
    },
    {
      title: (
        <div className="flex items-center gap-2">
          <span>{t('workflow.nodes.toolNode.enable')}</span>
          <Tooltip
            title={t(
              'workflow.nodes.toolNode.outputParameterEnableDescription'
            )}
            overlayClassName="black-tooltip config-secret"
          >
            <img src={questionCircle} className="w-3 h-3" alt="" />
          </Tooltip>
        </div>
      ),
      dataIndex: 'open',
      key: 'open',
      width: '10%',
      render: (open, record) => (
        <div className="h-[40px] flex items-center">
          <Switch
            disabled={!!record?.startDisabled}
            className="list-switch"
            checked={open}
            onChange={checked =>
              handleInputParamsChange(record?.id, 'open', checked)
            }
          />
        </div>
      ),
    },
    {
      title: t('workflow.nodes.toolNode.operation'),
      key: 'operation',
      width: '10%',
      render: (_, record) => (
        <OperationRender
          record={record}
          outputParamsData={outputParamsData}
          handleAddItem={handleAddItem}
          deleteNodeFromTree={deleteNodeFromTree}
          setOutputParamsData={setOutputParamsData}
        />
      ),
    },
  ];
  return {
    columns,
  };
};

const OperationRender: FC<{
  record: InputParamsData;
  outputParamsData: InputParamsData[];
  handleAddItem: (record: InputParamsData) => void;
  deleteNodeFromTree: (
    tree: InputParamsData[],
    id: string
  ) => InputParamsData[];
  setOutputParamsData: (data: InputParamsData[]) => void;
}> = ({
  record,
  outputParamsData,
  handleAddItem,
  deleteNodeFromTree,
  setOutputParamsData,
}) => {
  const { t } = useTranslation();
  return (
    <div className="h-[40px] flex items-center gap-2">
      {record?.type === 'object' && (
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
      {record?.fatherType !== 'array' && (
        <Tooltip title="" overlayClassName="black-tooltip config-secret">
          <img
            className="w-4 h-4 cursor-pointer"
            src={remove}
            onClick={() => {
              setOutputParamsData(
                cloneDeep(deleteNodeFromTree(outputParamsData, record.id))
              );
            }}
            alt=""
          />
        </Tooltip>
      )}
    </div>
  );
};
