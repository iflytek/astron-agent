import { InputParamsData } from '@/types/resource';
import { Input, Select, Tooltip } from 'antd';
import { ColumnType, ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import formSelect from '@/assets/imgs/workflow/icon_form_select.png';
import questionCircle from '@/assets/imgs/workflow/question-circle.png';
import inputErrorMsg from '@/assets/imgs/plugin/input_error_msg.svg';
import { cloneDeep } from 'lodash';
import addItemIcon from '@/assets/imgs/workflow/add-item-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';
import toolModalChecked from '@/assets/imgs/workflow/tool-modal-checked.png';
import arrayDefaultEdit from '@/assets/imgs/workflow/array-default-edit.png';
import { Switch } from 'antd';
import React, { FC } from 'react';

// 参数名列 Hook
const useParameterColumn = (
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void,
  handleCheckInput: (record: InputParamsData, key: string) => void
): ColumnType<InputParamsData> => {
  const { t } = useTranslation();

  return {
    title: (
      <div className="flex items-center gap-2">
        <span>
          <span className="text-[#F74E43] text-sm">* </span>
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
    width: '15%',
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
  };
};

// 描述列 Hook
const useDescriptionColumn = (
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void,
  handleCheckInput: (record: InputParamsData, key: string) => void
): ColumnType<InputParamsData> => {
  const { t } = useTranslation();

  return {
    title: (
      <div className="flex items-center gap-2">
        <span>
          <span className="text-[#F74E43] text-sm">* </span>
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
    width: '15%',
    render: (description, record) => (
      <div className="flex flex-col gap-1">
        <Input
          placeholder={t(
            'workflow.nodes.toolNode.pleaseEnterParameterDescription'
          )}
          className="global-input params-input"
          value={description}
          onChange={e => {
            handleInputParamsChange(record?.id, 'description', e.target.value);
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
  };
};

// 类型列 Hook
const useTypeColumn = (
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void,
  typeOptions: { label: string; value: string }[]
): ColumnType<InputParamsData> => {
  const { t } = useTranslation();

  return {
    title: (
      <div className="flex items-center gap-2">
        <span>
          <span className="text-[#F74E43] text-sm">* </span>
          {t('workflow.nodes.common.variableType')}
        </span>
      </div>
    ),
    dataIndex: 'type',
    key: 'type',
    width: '10%',
    render: (type, record) => (
      <div>
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
      </div>
    ),
  };
};

// 请求方法列 Hook
const useLocationColumn = (
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void,
  methodsOptions: { label: string; value: string }[]
): ColumnType<InputParamsData> => {
  const { t } = useTranslation();

  return {
    title: t('workflow.nodes.toolNode.requestMethod'),
    dataIndex: 'location',
    key: 'location',
    width: '10%',
    render: (location, record) =>
      record?.fatherType ? null : (
        <Select
          suffixIcon={<img src={formSelect} className="w-4 h-4" />}
          placeholder={t('workflow.nodes.toolNode.pleaseSelectRequestMethod')}
          className="global-select params-select"
          options={methodsOptions}
          value={location}
          onChange={value =>
            handleInputParamsChange(record?.id, 'location', value)
          }
        />
      ),
  };
};

// 必填列 Hook
const useRequiredColumn = (
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void
): ColumnType<InputParamsData> => {
  const { t } = useTranslation();

  return {
    title: t('workflow.nodes.toolNode.isRequired'),
    dataIndex: 'required',
    key: 'required',
    width: '10%',
    render: (required, record) => (
      <div className="min-w-[50px] h-[40px] flex items-center">
        {record?.fatherType !== 'array' ? (
          <div
            className="w-[18px] h-[18px] rounded-full bg-[#fff] flex items-center justify-center cursor-pointer"
            style={{
              border: required ? '1px solid #6356EA' : '1px solid #CACEE0',
            }}
            onClick={() =>
              handleInputParamsChange(record?.id, 'required', !required)
            }
          >
            {required && (
              <img
                src={toolModalChecked}
                className="w-[14px] h-[14px]"
                alt=""
              />
            )}
          </div>
        ) : null}
      </div>
    ),
  };
};

// 默认值列 Hook
const useDefaultColumn = (
  setArrayDefaultModal: (value: boolean) => void,
  setCurrentArrayDefaultId: (id: string) => void,
  renderInput: (record: InputParamsData) => React.ReactNode
): ColumnType<InputParamsData> => {
  const { t } = useTranslation();

  return {
    title: t('workflow.nodes.questionAnswerNode.defaultValue'),
    dataIndex: 'default',
    key: 'default',
    width: '10%',
    render: (_, record) =>
      record.type === 'array' && record?.from === 2 && !record?.arraySon ? (
        <div
          className="w-full h-[40px] flex items-center justify-center gap-2 border border-[#D9E0E9] rounded-lg text-[#6356EA] cursor-pointer"
          onClick={() => {
            setArrayDefaultModal(true);
            setCurrentArrayDefaultId(record?.id);
          }}
        >
          <img src={arrayDefaultEdit} className="w-[14px] h-[14px]" alt="" />
          <span>{t('workflow.nodes.toolNode.edit')}</span>
        </div>
      ) : !record?.arraySon &&
        record.type !== 'object' &&
        record?.from === 2 ? (
        renderInput(record)
      ) : null,
  };
};

// 启用列 Hook
const useEnableColumn = (
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void
): ColumnType<InputParamsData> => {
  const { t } = useTranslation();

  return {
    title: (
      <div className="flex items-center gap-2">
        <span>{t('workflow.nodes.toolNode.enable')}</span>
        <Tooltip
          title={t('workflow.nodes.toolNode.enableDescription')}
          overlayClassName="black-tooltip config-secret"
        >
          <img src={questionCircle} className="w-3 h-3" alt="" />
        </Tooltip>
      </div>
    ),
    dataIndex: 'open',
    key: 'open',
    width: '5%',
    render: (open, record) =>
      !record?.arraySon && record.type !== 'object' ? (
        <div className="h-[40px] flex items-center">
          <Tooltip
            title={
              record?.startDisabled
                ? t(
                    'workflow.nodes.toolNode.requiredParameterDefaultValueSwitch'
                  )
                : ''
            }
            overlayClassName="black-tooltip config-secret"
          >
            <Switch
              disabled={!!(record?.type === 'string' && record?.startDisabled)}
              className="list-switch"
              checked={open}
              onChange={checked =>
                handleInputParamsChange(record?.id, 'open', checked)
              }
            />
          </Tooltip>
        </div>
      ) : null,
  };
};

// 操作列 Hook
const useOperationColumn = (
  inputParamsData: InputParamsData[],
  handleAddItem: (record: InputParamsData) => void,
  deleteNodeFromTree: (
    tree: InputParamsData[],
    id: string
  ) => InputParamsData[],
  setInputParamsData: (data: InputParamsData[]) => void
): ColumnType<InputParamsData> => {
  const { t } = useTranslation();

  return {
    title: t('workflow.nodes.toolNode.operation'),
    key: 'operation',
    width: '5%',
    render: (_, record) => (
      <OperationRender
        record={record}
        inputParamsData={inputParamsData}
        handleAddItem={handleAddItem}
        deleteNodeFromTree={deleteNodeFromTree}
        setInputParamsData={setInputParamsData}
      />
    ),
  };
};

export const useColumns = ({
  handleInputParamsChange,
  handleCheckInput,
  handleAddItem,
  deleteNodeFromTree,
  inputParamsData,
  typeOptions,
  methodsOptions,
  setArrayDefaultModal,
  setCurrentArrayDefaultId,
  renderInput,
  setInputParamsData,
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
  inputParamsData: InputParamsData[];
  setInputParamsData: (data: InputParamsData[]) => void;
  typeOptions: { label: string; value: string }[];
  methodsOptions: { label: string; value: string }[];
  setArrayDefaultModal: (value: boolean) => void;
  setCurrentArrayDefaultId: (id: string) => void;
  renderInput: (record: InputParamsData) => React.ReactNode;
}): {
  columns: ColumnsType<InputParamsData>;
} => {
  const parameterColumn = useParameterColumn(
    handleInputParamsChange,
    handleCheckInput
  );
  const descriptionColumn = useDescriptionColumn(
    handleInputParamsChange,
    handleCheckInput
  );
  const typeColumn = useTypeColumn(handleInputParamsChange, typeOptions);
  const locationColumn = useLocationColumn(
    handleInputParamsChange,
    methodsOptions
  );
  const requiredColumn = useRequiredColumn(handleInputParamsChange);
  const defaultColumn = useDefaultColumn(
    setArrayDefaultModal,
    setCurrentArrayDefaultId,
    renderInput
  );
  const enableColumn = useEnableColumn(handleInputParamsChange);
  const operationColumn = useOperationColumn(
    inputParamsData,
    handleAddItem,
    deleteNodeFromTree,
    setInputParamsData
  );

  const columns: ColumnsType<InputParamsData> = [
    parameterColumn,
    descriptionColumn,
    typeColumn,
    locationColumn,
    requiredColumn,
    defaultColumn,
    enableColumn,
    operationColumn,
  ];

  return {
    columns,
  };
};

export const OperationRender: FC<{
  record: InputParamsData;
  inputParamsData: InputParamsData[];
  handleAddItem: (record: InputParamsData) => void;
  deleteNodeFromTree: (
    tree: InputParamsData[],
    id: string
  ) => InputParamsData[];
  setInputParamsData: (data: InputParamsData[]) => void;
}> = ({
  record,
  inputParamsData,
  handleAddItem,
  deleteNodeFromTree,
  setInputParamsData,
}) => {
  const { t } = useTranslation();
  return (
    <div className=" flex items-center gap-2 h-[40px]">
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
              setInputParamsData(
                cloneDeep(deleteNodeFromTree(inputParamsData, record.id))
              );
            }}
            alt=""
          />
        </Tooltip>
      )}
    </div>
  );
};
