import React, { useRef, useImperativeHandle, forwardRef, JSX } from 'react';
import { Table, Input, Select, Switch, DatePicker, InputNumber } from 'antd';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import formSelect from '@/assets/imgs/common/arrow-down.png';
import remove from '@/assets/imgs/common/input-remove.png';
import { ColumnType } from 'antd/es/table';
import { TableField } from '@/types/database';
import { Dayjs } from 'dayjs';

const typeOptions = [
  {
    label: 'String',
    value: 'String',
  },
  {
    label: 'Number',
    value: 'Number',
  },
  {
    label: 'Integer',
    value: 'Integer',
  },
  {
    label: 'Time',
    value: 'Time',
  },
  {
    label: 'Boolean',
    value: 'Boolean',
  },
];

const createNameColumn = (
  handleInputParamsChange: (
    id: number | null,
    key: string,
    value: string | number | boolean | string[] | null | undefined
  ) => void,
  handleCheckInput: (
    currentParam: TableField,
    key: keyof TableField,
    errMsg: string
  ) => boolean
): ColumnType<TableField> => {
  const { t } = useTranslation();
  return {
    title: (
      <div className="flex items-center gap-2">
        <span>
          <span className="text-[#F74E43] text-xs">* </span>
          {t('database.fieldName')}
        </span>
      </div>
    ),
    dataIndex: 'name',
    key: 'name',
    width: '20%',
    render: (name: string, record: TableField) => (
      <div className="flex flex-col w-full gap-1">
        <Input
          placeholder={t('database.pleaseEnterFieldNameInput')}
          className="params-input w-[90%]"
          value={name}
          disabled={record?.isSystem}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            handleInputParamsChange(record.id, 'name', e.target.value);
            handleCheckInput(
              record,
              'name',
              t('database.pleaseEnterFieldNameInput')
            );
          }}
          maxLength={60}
          onBlur={() => {
            handleCheckInput(
              record,
              'name',
              t('database.pleaseEnterFieldNameInput')
            );
          }}
        />
        {record?.nameErrMsg && (
          <div className="flex items-center gap-1">
            <p className="text-[#F74E43] text-[12px]">{record?.nameErrMsg}</p>
          </div>
        )}
      </div>
    ),
  };
};

const createTypeColumn = (
  handleBatchInputParamsChange: (
    id: number | null,
    updates: Record<
      string,
      string | number | boolean | string[] | null | undefined
    >
  ) => void
): ColumnType<TableField> => {
  const { t } = useTranslation();
  return {
    title: (
      <div className="flex items-center gap-2">
        <span>
          <span className="text-[#F74E43] text-xs">* </span>
          {t('database.fieldType')}
        </span>
      </div>
    ),
    dataIndex: 'type',
    key: 'type',
    width: '15%',
    render: (type: string, record: TableField) => (
      <Select
        suffixIcon={<img src={formSelect} className="w-4 h-4" />}
        placeholder={t('database.pleaseSelectType')}
        className="w-[90%] params-select"
        disabled={record?.isSystem}
        options={typeOptions}
        value={type}
        onChange={(value: string) => {
          // 使用批量更新避免竞争条件
          handleBatchInputParamsChange(record?.id, {
            type: value,
            defaultValue: '',
          });
        }}
      />
    ),
  };
};

const createDescriptionColumn = (
  handleInputParamsChange: (
    id: number | null,
    key: string,
    value: string | number | boolean | string[] | null | undefined
  ) => void,
  handleCheckInput: (
    currentParam: TableField,
    key: keyof TableField,
    errMsg: string
  ) => boolean
): ColumnType<TableField> => {
  const { t } = useTranslation();
  return {
    title: (
      <div className="flex items-center gap-2">
        <span>
          <span className="text-[#F74E43] text-xs">* </span>
          {t('database.fieldDescription')}
        </span>
      </div>
    ),
    dataIndex: 'description',
    key: 'description',
    render: (description: string, record: TableField) => (
      <div className="flex flex-col gap-1">
        <Input
          placeholder={t('database.pleaseEnterDescription')}
          className="params-input w-[90%]"
          disabled={record?.isSystem}
          value={description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            handleInputParamsChange(
              record.id ?? 0,
              'description',
              e.target.value
            );
            handleCheckInput(
              record,
              'description',
              t('database.pleaseEnterDescription')
            );
          }}
          onBlur={() =>
            handleCheckInput(
              record,
              'description',
              t('database.pleaseEnterDescription')
            )
          }
        />
        {record?.descriptionErrMsg && (
          <div className="flex items-center gap-1">
            <p className="text-[#F74E43] text-[12px]">
              {record?.descriptionErrMsg}
            </p>
          </div>
        )}
      </div>
    ),
  };
};

const createDefaultValueColumn = (
  handleInputParamsChange: (
    id: number,
    key: string,
    value: string | number | boolean | string[] | null | undefined
  ) => void
): ColumnType<TableField> => {
  const { t } = useTranslation();
  return {
    title: (
      <div className="flex items-center gap-2">
        <span>{t('database.defaultValue')}</span>
      </div>
    ),
    dataIndex: 'defaultValue',
    key: 'defaultValue',
    width: '20%',
    render: (defaultValue: string, record: TableField) => (
      <div className="w-[90%]">
        {record.type === 'String' && (
          <Input
            placeholder={t('database.defaultValue')}
            disabled={record?.isSystem}
            className="params-input w-[100%]"
            value={defaultValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              handleInputParamsChange(
                record?.id,
                'defaultValue',
                e.target.value
              );
            }}
          />
        )}
        {record?.type === 'Boolean' && (
          <Select
            placeholder={t('database.defaultValue')}
            style={{ width: '100%' }}
            value={defaultValue || null}
            className="params-select"
            onChange={(value: string) =>
              handleInputParamsChange(record?.id, 'defaultValue', value)
            }
          >
            <Select.Option value={'true'}>true</Select.Option>
            <Select.Option value={'false'}>false</Select.Option>
          </Select>
        )}
        {record?.type === 'Time' && (
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            className="params-select-time"
            disabled={record?.isSystem}
            placeholder={t('database.defaultValue')}
            style={{ width: '100%' }}
            value={record?.defaultValue ? dayjs(record?.defaultValue) : null}
            onChange={(_date: Dayjs, dateString: string | string[]) => {
              handleInputParamsChange(
                record?.id,
                'defaultValue',
                dateString as string
              );
            }}
          />
        )}
        {(record?.type === 'Number' || record?.type === 'Integer') && (
          <InputNumber
            style={{ width: '100%' }}
            placeholder={t('database.defaultValue')}
            className="params-input-number"
            disabled={record?.isSystem}
            controls={record.type === 'Number'}
            precision={record.type === 'Number' ? undefined : 0}
            value={record.defaultValue ? Number(record.defaultValue) : null}
            onChange={(value: number | null) =>
              handleInputParamsChange(record?.id, 'defaultValue', value)
            }
          />
        )}
      </div>
    ),
  };
};

const createRequiredColumn = (
  handleInputParamsChange: (
    id: number | null,
    key: string,
    value: string | number | boolean | string[] | null | undefined
  ) => void
): ColumnType<TableField> => {
  const { t } = useTranslation();
  return {
    title: (
      <div className="flex items-center gap-2">
        <span>{t('database.isRequired')}</span>
      </div>
    ),
    dataIndex: 'isRequired',
    key: 'isRequired',
    width: '10%',
    render: (required: boolean, record: TableField) => (
      <div className="h-[32px] flex items-center">
        <Switch
          disabled={record?.isSystem}
          className="list-switch"
          checked={required}
          onChange={(checked: boolean) =>
            handleInputParamsChange(record?.id, 'isRequired', checked)
          }
        />
      </div>
    ),
  };
};

const createOperationColumn = (
  onDel: (record: TableField) => void
): ColumnType<TableField> => {
  const { t } = useTranslation();
  return {
    title: (
      <div className="flex items-center gap-2">
        <span>{t('database.operation')}</span>
      </div>
    ),
    key: 'operation',
    width: 62,
    align: 'center' as const,
    render: (_: unknown, record: TableField) => (
      <div className="h-[32px] flex items-center justify-center">
        <img
          className="w-4 h-4 cursor-pointer"
          style={{
            cursor: record.isSystem ? 'not-allowed' : 'pointer',
          }}
          src={remove}
          onClick={() => {
            if (record.isSystem) {
              return;
            }
            onDel(record);
          }}
          alt=""
        />
      </div>
    ),
  };
};

const createColumns = (
  handleInputParamsChange: (
    id: number | null,
    key: string,
    value: string | number | boolean | string[] | null | undefined
  ) => void,
  handleBatchInputParamsChange: (
    id: number | null,
    updates: Record<
      string,
      string | number | boolean | string[] | null | undefined
    >
  ) => void,
  handleCheckInput: (
    currentParam: TableField,
    key: keyof TableField,
    errMsg: string
  ) => boolean,
  onDel: (record: TableField) => void
): ColumnType<TableField>[] => [
  createNameColumn(handleInputParamsChange, handleCheckInput),
  createTypeColumn(handleBatchInputParamsChange),
  createDescriptionColumn(handleInputParamsChange, handleCheckInput),
  createDefaultValueColumn(handleInputParamsChange),
  createRequiredColumn(handleInputParamsChange),
  createOperationColumn(onDel),
];

function DataBaseTable(
  {
    dataSource,
    handleInputParamsChange,
    handleBatchInputParamsChange,
    handleCheckInput,
    onDel,
  }: {
    dataSource: TableField[];
    handleInputParamsChange: (
      id: number | null,
      key: string,
      value: string | number | boolean | string[] | null | undefined
    ) => void;
    handleBatchInputParamsChange: (
      id: number | null,
      updates: Record<
        string,
        string | number | boolean | string[] | null | undefined
      >
    ) => void;
    handleCheckInput: (
      currentParam: TableField,
      key: keyof TableField,
      errMsg: string
    ) => boolean;
    onDel: (record: TableField) => void;
  },
  ref: React.ForwardedRef<{
    scrollTableBottom: () => void;
  }>
): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableRef = useRef<any>(null);
  const columns = createColumns(
    handleInputParamsChange,
    handleBatchInputParamsChange,
    handleCheckInput,
    onDel
  );

  const scrollTableBottom = (): void => {
    window.setTimeout(() => {
      const tableDome =
        tableRef.current?.firstChild?.querySelector('.ant-table-body');
      if (tableDome) {
        tableDome.scrollTop = tableDome.scrollHeight;
      }
    }, 0);
  };

  useImperativeHandle(
    ref,
    () => ({
      scrollTableBottom,
    }),
    [ref]
  );

  return (
    <Table
      className="mt-4 tool-params-table"
      ref={tableRef}
      pagination={false}
      columns={columns}
      dataSource={dataSource}
      rowKey={record => record?.id ?? 0}
      scroll={{ y: 64 * 5 }}
    />
  );
}

export default forwardRef(DataBaseTable);
