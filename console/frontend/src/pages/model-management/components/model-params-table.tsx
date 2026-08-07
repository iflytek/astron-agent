import React from 'react';
import { useMemoizedFn } from 'ahooks';
import { Table, Input, Select, InputNumber } from 'antd';
import { cloneDeep } from 'lodash';
import { useTranslation } from 'react-i18next';
import inputErrorMsg from '@/assets/svgs/input-error.svg';
import formSelect from '@/assets/imgs/common/arrow-down.png';
import remove from '@/assets/imgs/common/input-remove.png';
import { ModelConfigParam } from '@/types/model';

// 参数名称列组件
const ParamNameColumn = ({
  record,
  handleInputParamsChange,
  handleCheckInput,
  detail,
}: {
  record: ModelConfigParam;
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void;
  handleCheckInput: (record: ModelConfigParam, key: string) => void;
  detail: boolean;
}): React.JSX.Element => {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-1">
      <Input
        placeholder={t('model.pleaseEnterParameterName')}
        className="global-input params-input inline-input"
        value={record.key}
        disabled={detail}
        onChange={e => {
          handleInputParamsChange(
            String(record?.id || ''),
            'key',
            e.target.value
          );
          handleCheckInput(record, 'name');
        }}
        onBlur={() => handleCheckInput(record, 'key')}
      />
      {record?.keyErrMsg && (
        <div className="flex items-start gap-1">
          <img
            src={inputErrorMsg}
            className="w-[14px] h-[14px] mt-0.5"
            alt=""
          />
          <p className="text-[#F74E43] text-sm">{record?.keyErrMsg}</p>
        </div>
      )}
    </div>
  );
};

// 参数描述列组件
const ParamDescColumn = ({
  record,
  handleInputParamsChange,
  handleCheckInput,
  detail,
}: {
  record: ModelConfigParam;
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void;
  handleCheckInput: (record: ModelConfigParam, key: string) => void;
  detail: boolean;
}): React.JSX.Element => {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-1">
      <Input
        title={detail ? record.name : undefined}
        placeholder={t('model.pleaseEnterParameterDescription')}
        className="global-input params-input inline-input"
        value={record.name}
        disabled={detail}
        onChange={e => {
          handleInputParamsChange(
            String(record?.id || ''),
            'name',
            e.target.value
          );
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
  );
};

// 参数类型列组件
const ParamTypeColumn = ({
  record,
  handleInputParamsChange,
  detail,
}: {
  record: ModelConfigParam;
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void;
  detail: boolean;
}): React.JSX.Element => (
  <div className="w-full flex flex-col gap-1">
    <Select
      className="global-select"
      suffixIcon={<img src={formSelect} className="w-4 h-4 " />}
      value={record.fieldType}
      disabled={detail}
      onChange={value =>
        handleInputParamsChange(String(record?.id || ''), 'fieldType', value)
      }
      options={[
        { label: 'int', value: 'int' },
        { label: 'float', value: 'float' },
        { label: 'boolean', value: 'boolean' },
      ]}
      style={{ lineHeight: '40px', height: '40px' }}
    />
  </div>
);

// 小数位数列组件
const PrecisionColumn = ({
  record,
  handleInputParamsChange,
  handleCheckInput,
  detail,
}: {
  record: ModelConfigParam;
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void;
  handleCheckInput: (record: ModelConfigParam, key: string) => void;
  detail: boolean;
}): React.JSX.Element => {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-1">
      {record?.fieldType === 'float' ? (
        <InputNumber
          step={1}
          precision={0}
          controls={false}
          style={{ lineHeight: '40px', height: '40px' }}
          disabled={detail}
          placeholder={t('model.pleaseEnter')}
          className="global-input params-input inline-input w-full"
          value={detail && record.precision === 0.1 ? 1.0 : record.precision}
          onChange={value => {
            handleInputParamsChange(
              String(record?.id || ''),
              'precision',
              value ?? 0
            );
            handleCheckInput(record, 'precision');
          }}
        />
      ) : (
        <div className="w-full flex items-center h-[40px]">--</div>
      )}
    </div>
  );
};

// 参数范围列组件
const ParamRangeColumn = ({
  record,
  handleInputParamsChange,
  exchangeMinMax,
  detail,
}: {
  record: ModelConfigParam;
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void;
  exchangeMinMax: (id: string, min: number, max: number) => void;
  detail: boolean;
}): React.JSX.Element => {
  const { t } = useTranslation();
  return record?.fieldType === 'boolean' ? (
    <div className="w-full flex items-center h-[40px]">--</div>
  ) : (
    <div className="w-full flex items-center gap-1">
      <InputNumber
        step={1}
        precision={
          detail && record?.precision === 0.1 ? 1.0 : record?.precision
        }
        controls={false}
        style={{ lineHeight: '40px', height: '40px' }}
        disabled={detail}
        placeholder={t('model.pleaseEnter')}
        className="global-input params-input inline-input w-full"
        value={record?.min}
        onChange={value =>
          handleInputParamsChange(String(record?.id || ''), 'min', value ?? 0)
        }
        onBlur={() => {
          if (record?.min === null) {
            handleInputParamsChange(
              String(record?.id || ''),
              'min',
              record?.min
            );
          }
          if ((record?.min || 0) > (record?.max || 0)) {
            exchangeMinMax(
              String(record?.id || ''),
              record?.min || 0,
              record?.max || 0
            );
          }
        }}
      />
      <span>-</span>
      <InputNumber
        step={1}
        precision={
          detail && record?.precision === 0.1 ? 1.0 : record?.precision
        }
        controls={false}
        style={{ lineHeight: '40px', height: '40px' }}
        placeholder={t('model.pleaseEnter')}
        className="global-input params-input inline-input w-full"
        value={record?.max}
        onChange={value =>
          handleInputParamsChange(String(record?.id || ''), 'max', value ?? 0)
        }
        disabled={detail}
        onBlur={() => {
          if (record?.max === null) {
            handleInputParamsChange(
              String(record?.id || ''),
              'max',
              record?.max
            );
          }
          if ((record?.min || 0) > (record?.max || 0)) {
            exchangeMinMax(
              String(record?.id || ''),
              record?.min || 0,
              record?.max || 0
            );
          }
        }}
      />
    </div>
  );
};

// 默认值列组件
const DefaultValueColumn = ({
  record,
  handleInputParamsChange,
  handleCheckInput,
  detail,
}: {
  record: ModelConfigParam;
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void;
  handleCheckInput: (record: ModelConfigParam, key: string) => void;
  detail: boolean;
}): React.JSX.Element => {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col gap-1">
      {record?.fieldType === 'float' || record?.fieldType === 'int' ? (
        <InputNumber
          step={1}
          precision={
            detail && record?.precision === 0.1 ? 1.0 : record?.precision
          }
          controls={false}
          style={{ lineHeight: '40px', height: '40px' }}
          placeholder={t('model.pleaseEnter')}
          className="global-input params-input inline-input w-full"
          value={record?.default as number}
          onChange={value => {
            handleInputParamsChange(
              String(record?.id || ''),
              'default',
              value ?? 0
            );
            handleCheckInput(record, 'default');
          }}
          disabled={detail}
          onBlur={() => {
            if (record?.default === null) {
              handleInputParamsChange(String(record?.id || ''), 'default', 0);
            }
          }}
        />
      ) : (
        <Select
          suffixIcon={<img src={formSelect} className="w-4 h-4 " />}
          options={[
            { label: 'true', value: true },
            { label: 'false', value: false },
          ]}
          style={{ lineHeight: '40px', height: '40px' }}
          disabled={detail}
          value={record?.default}
          onChange={value =>
            handleInputParamsChange(String(record?.id || ''), 'default', value)
          }
        />
      )}
    </div>
  );
};

// 参数表格逻辑 Hook
const useModelParamsLogic = (
  modelParams: ModelConfigParam[],
  setModelParams: (params: ModelConfigParam[]) => void,
  checkNameConventions: (name: string) => boolean
): {
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void;
  handleCheckInput: (record: ModelConfigParam, key: string) => void;
  exchangeMinMax: (id: string, min: number, max: number) => void;
} => {
  const { t } = useTranslation();

  const handleInputParamsChange = useMemoizedFn(
    (id: string, key: string, value: string | number | boolean): void => {
      const currentNode = modelParams.find(
        item => String(item.id) === id
      ) as ModelConfigParam;
      (currentNode as unknown as Record<string, unknown>)[key] = value;
      if (key === 'fieldType') {
        currentNode.precision = 0;
        if (value === 'int') {
          currentNode.min = 0;
          currentNode.max = 10;
        }
        if (value === 'boolean') {
          currentNode.default = false;
        }
        if (value === 'float' || value === 'int') {
          currentNode.default = 0;
        }
      }
      setModelParams(cloneDeep(modelParams));
    }
  );

  const checkParams = useMemoizedFn((id: string, key: string): boolean => {
    let passFlag = true;
    const errEsg =
      key === 'key'
        ? t('model.pleaseEnterParameterName')
        : t('model.pleaseEnterParameterDescription');
    const currentNode = modelParams.find(
      item => String(item.id) === id
    ) as ModelConfigParam;
    if (!(currentNode as unknown as Record<string, unknown>)[key]) {
      (currentNode as unknown as Record<string, unknown>)[`${key}ErrMsg`] =
        errEsg;
      passFlag = false;
    } else if (
      key === 'key' &&
      !checkNameConventions(
        (currentNode as unknown as Record<string, unknown>)[key] as string
      )
    ) {
      (currentNode as unknown as Record<string, unknown>).keyErrMsg = t(
        'model.onlyLettersNumbersDashUnderscore'
      );
    } else {
      (currentNode as unknown as Record<string, unknown>)[`${key}ErrMsg`] = '';
    }
    return passFlag;
  });

  const handleCheckInput = useMemoizedFn(
    (record: ModelConfigParam, key: string): void => {
      checkParams(String(record?.id || ''), key);
      setModelParams(cloneDeep(modelParams));
    }
  );

  const exchangeMinMax = useMemoizedFn(
    (id: string, min: number, max: number): void => {
      const currentNode = modelParams.find(
        item => String(item.id) === id
      ) as ModelConfigParam;
      currentNode.min = max;
      currentNode.max = min;
      setModelParams(cloneDeep(modelParams));
    }
  );

  return { handleInputParamsChange, handleCheckInput, exchangeMinMax };
};

function ModelParamsTable({
  modelParams,
  setModelParams,
  checkNameConventions,
  detail = false,
}: {
  modelParams: ModelConfigParam[];
  setModelParams: (modelParams: ModelConfigParam[]) => void;
  checkNameConventions: (name: string) => boolean;
  detail?: boolean;
}): React.JSX.Element {
  const { handleInputParamsChange, handleCheckInput, exchangeMinMax } =
    useModelParamsLogic(modelParams, setModelParams, checkNameConventions);
  const { t } = useTranslation();

  const columns = [
    {
      width: 100,
      title: (
        <span>
          <span className="text-[#F74E43] text-sm">* </span>
          {t('model.parameterName')}
        </span>
      ),
      dataIndex: 'key',
      key: 'key',
      render: (_: string, record: ModelConfigParam): React.JSX.Element => (
        <ParamNameColumn
          record={record}
          handleInputParamsChange={handleInputParamsChange}
          handleCheckInput={handleCheckInput}
          detail={detail}
        />
      ),
    },
    {
      width: 160,
      title: (
        <span>
          <span className="text-[#F74E43] text-sm">* </span>
          {t('model.parameterDescription')}
        </span>
      ),
      dataIndex: 'name',
      key: 'name',
      render: (_: string, record: ModelConfigParam): React.JSX.Element => (
        <ParamDescColumn
          record={record}
          handleInputParamsChange={handleInputParamsChange}
          handleCheckInput={handleCheckInput}
          detail={detail}
        />
      ),
    },
    {
      width: 40,
      title: (
        <span>
          <span className="text-[#F74E43] text-sm">* </span>
          {t('model.parameterType')}
        </span>
      ),
      dataIndex: 'fieldType',
      key: 'fieldType',
      render: (_: string, record: ModelConfigParam): React.JSX.Element => (
        <ParamTypeColumn
          record={record}
          handleInputParamsChange={handleInputParamsChange}
          detail={detail}
        />
      ),
    },
    {
      width: 80,
      title: (
        <span>
          <span className="text-[#F74E43] text-sm">* </span>
          {t('model.decimalPlaces')}
        </span>
      ),
      dataIndex: 'precision',
      key: 'precision',
      render: (_: number, record: ModelConfigParam): React.JSX.Element => (
        <PrecisionColumn
          record={record}
          handleInputParamsChange={handleInputParamsChange}
          handleCheckInput={handleCheckInput}
          detail={detail}
        />
      ),
    },
    {
      width: '15%',
      title: (
        <span>
          <span className="text-[#F74E43] text-sm">* </span>
          {t('model.parameterRange')}
        </span>
      ),
      dataIndex: 'range',
      key: 'range',
      render: (_: unknown, record: ModelConfigParam): React.JSX.Element => (
        <ParamRangeColumn
          record={record}
          handleInputParamsChange={handleInputParamsChange}
          exchangeMinMax={exchangeMinMax}
          detail={detail}
        />
      ),
    },
    {
      width: '10%',
      title: (
        <span>
          <span className="text-[#F74E43] text-sm">* </span>
          {t('model.defaultValue')}
        </span>
      ),
      dataIndex: 'default',
      key: 'default',
      render: (_: unknown, record: ModelConfigParam): React.JSX.Element => (
        <DefaultValueColumn
          record={record}
          handleInputParamsChange={handleInputParamsChange}
          handleCheckInput={handleCheckInput}
          detail={detail}
        />
      ),
    },
    ...(detail
      ? []
      : [
          {
            fixed: 'right' as const,
            title: t('model.operation'),
            key: 'operation',
            width: '5%',
            render: (
              _: unknown,
              record: ModelConfigParam
            ): React.JSX.Element => (
              <div className="flex items-center gap-1 h-[40px]">
                <img
                  className="w-4 h-4 cursor-pointer"
                  src={remove}
                  onClick={() => {
                    setModelParams(
                      cloneDeep(
                        modelParams.filter(item => item.id !== record.id)
                      )
                    );
                  }}
                  alt=""
                />
              </div>
            ),
          },
        ]),
  ];

  return (
    <Table
      dataSource={modelParams}
      columns={columns}
      className="tool-params-table mt-4"
      pagination={false}
      rowKey={record => String(record.id || '')}
      scroll={{ x: 'max-content' }}
    />
  );
}

export default ModelParamsTable;
