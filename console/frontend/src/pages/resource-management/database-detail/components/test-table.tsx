import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useEffect,
  useRef,
  JSX,
  ReactNode,
} from 'react';
import { Table, Tooltip, Popconfirm, TableColumnType, message } from 'antd';
import { fieldList, operateTableData } from '@/services/database';
import { useSize } from 'ahooks';
import dayjs from 'dayjs';
import questionIcon from '@/assets/imgs/database/question-icon.svg';
import deleteIcon from '@/assets/imgs/database/delete-circle.png';
import { DatabaseItem, TableField, OperateType } from '@/types/database';
import i18next from 'i18next';
import { ResponseBusinessError } from '@/types/global';
import styles from './test-table.module.scss';

const isDateString = (str: string): boolean => {
  const date = dayjs(str);
  if (!date.isValid()) {
    return false;
  }
  if (
    str.includes('-') &&
    (str.includes('T') || str.includes(' ')) &&
    str.includes(':')
  ) {
    return true;
  }
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;
  return isoRegex.test(str);
};

// 创建表格列配置
const createTableColumns = (
  fieldLists: TableField[],
  pagination: {
    pageNum: number;
    pageSize: number;
    total: number;
  },
  deleteRecord: (row: Record<string, unknown>) => void
): TableColumnType<Record<string, unknown>>[] => {
  if (!fieldLists.length) return [];

  const fetchColumns = fieldLists.map((item: TableField) => ({
    title: (
      <div className="flex items-center gap-[12px]">
        <div className="flex">
          {item.isRequired && <span className="text-[#F74E43]">*</span>}
          <span
            className="pl-[4px] pr-[8px] max-w-[120px] truncate"
            title={item.name}
          >
            {item.name}
          </span>
          <Tooltip placement="top" title={item.description}>
            <img src={questionIcon} className="w-[14px]" alt="" />
          </Tooltip>
        </div>
        <div className="h-[24px] flex items-center justify-center px-[12px] font-[12px] text-[#7F7F7F] bg-[#E4EAFF] rounded-[8px]">
          {item.type}
        </div>
      </div>
    ),
    dataIndex: item.name,
    key: item.id?.toString() || '',
    render: (text: string | boolean | number): ReactNode => {
      let value = text;
      if (typeof text === 'boolean' || typeof text === 'number') {
        value = text.toString();
      } else {
        if (text && isDateString(text)) {
          value = dayjs(text).format('YYYY-MM-DD HH:mm:ss');
        }
      }
      return (
        <div
          className="w-[200px] text-[#333333] truncate"
          title={value as string}
        >
          {value}
        </div>
      );
    },
  }));

  return [
    {
      title: i18next.t('database.serialNumber'),
      key: 'index',
      width: 42,
      render: (_: unknown, __: Record<string, unknown>, index: number) =>
        (pagination.pageNum - 1) * pagination.pageSize + index + 1,
    },
    ...fetchColumns,
    {
      title: i18next.t('database.action'),
      width: 62,
      fixed: 'right' as const,
      key: 'action' as const,
      render: (_: unknown, record: Record<string, unknown>) => (
        <div className="flex items-center pl-[5px] bg-[#fff] mr-[-1px]">
          <Popconfirm
            title={i18next.t('database.confirmDeleteData')}
            onConfirm={() => deleteRecord(record)}
          >
            <img
              src={deleteIcon}
              width={20}
              alt=""
              className="cursor-pointer"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];
};

type TestTableProps = {
  dataSource: Record<string, unknown>[];
  pagination: {
    pageNum: number;
    pageSize: number;
    total: number;
  };
  info: DatabaseItem;
  loading: boolean;
  type: number;
  updateTestData: () => void;
};

const TestTable = forwardRef<
  {
    getSelectRowKeys: () => string[];
    getSelectRows: () => string[];
    updateSelectRows: (rows: string[]) => void;
  },
  TestTableProps
>(function TestTable(
  { dataSource, pagination, info, loading, type, updateTestData },
  ref
): JSX.Element {
  const [selectedRows, setSelectedRows] = useState<Record<string, unknown>[]>(
    []
  );
  const [fieldLists, setFieldLists] = useState<TableField[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentSize = useSize(containerRef);
  const [tableHeight, setTableHeight] = useState<number>(0);

  useEffect(() => {
    if (contentSize) {
      setTableHeight(contentSize.height - 56);
    }
  }, [contentSize]);
  const getFieldList = async (): Promise<void> => {
    const res = await fieldList({
      tbId: info.id,
      pageNum: 1,
      pageSize: 300,
    });
    setFieldLists(res?.records || []);
  };

  useEffect(() => {
    getFieldList();
  }, []);

  const deleteRecord = async (row: Record<string, unknown>): Promise<void> => {
    const params = {
      tbId: info.id,
      execDev: type - 1,
      data: [
        {
          operateType: OperateType.DELETE,
          tableData: {
            ...row,
          },
        },
      ],
    };
    await operateTableData(params)
      .then(() => {
        updateTestData();
        updateSelectRows([String(row.id || '')]);
      })
      .catch((error: ResponseBusinessError) => {
        message.error(error.message);
      });
  };

  const mergeColumns = useMemo(() => {
    return createTableColumns(fieldLists, pagination, deleteRecord);
  }, [fieldLists, pagination, deleteRecord]);

  const onSelectChange = (
    _newSelectedRowKeys: React.Key[],
    selectedRows: Record<string, unknown>[]
  ): void => {
    setSelectedRows(selectedRows);
  };

  const rowSelection = {
    selectedRowKeys: selectedRows.map((item: Record<string, unknown>) =>
      String(item.id || '')
    ),
    onChange: onSelectChange,
    preserveSelectedRowKeys: true,
    columnWidth: 42,
  };

  const updateSelectRows = (rows: string[]): void => {
    setSelectedRows(prev => {
      return prev.filter(
        (item: Record<string, unknown>) => !rows.includes(String(item.id || ''))
      );
    });
  };

  useImperativeHandle(
    ref,
    () => ({
      getSelectRowKeys(): string[] {
        return selectedRows.map((item: Record<string, unknown>) =>
          String(item.id || '')
        );
      },
      getSelectRows(): string[] {
        return selectedRows.map((item: Record<string, unknown>) =>
          String(item.id || '')
        );
      },
      updateSelectRows,
    }),
    [selectedRows]
  );

  return (
    <div className={styles.databaseTable} ref={containerRef}>
      <Table<Record<string, unknown>>
        className={`tool-params-table`}
        pagination={false}
        columns={mergeColumns}
        dataSource={dataSource}
        rowKey={record => String(record?.id || '')}
        rowSelection={rowSelection}
        loading={loading}
        scroll={{ x: 'max-content', y: tableHeight }}
        locale={{ emptyText: ' ' }}
      />
    </div>
  );
});

export default TestTable;
