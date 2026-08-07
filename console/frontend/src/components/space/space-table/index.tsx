import React, {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';
import { Table, message } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ColumnsType, TableProps } from 'antd/es/table';
import ButtonGroup, { ButtonConfig } from '@/components/button-group';
import Empty from '@/components/space/empty';
import styles from './index.module.scss';

// 分页配置接口
export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number, range: [number, number]) => string;
  pageSizeOptions?: string[];
  position?: (
    | 'topLeft'
    | 'topCenter'
    | 'topRight'
    | 'bottomLeft'
    | 'bottomCenter'
    | 'bottomRight'
  )[];
}

// 列配置接口
export interface SpaceColumnConfig<T = any> {
  title: string;
  dataIndex: string;
  key: string;
  width?: number | string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sorter?: boolean | ((a: T, b: T) => number);
  sortOrder?: 'ascend' | 'descend' | null;
  fixed?: 'left' | 'right';
  align?: 'left' | 'center' | 'right';
}

// 操作列配置接口
export interface ActionColumnConfig<T = any> {
  title?: string;
  width?: number | string;
  fixed?: 'left' | 'right';
  getActionButtons: (record: T, index: number) => ButtonConfig[];
}

// 查询参数接口
export interface QueryParams {
  current: number;
  pageSize: number;
  searchValue?: string;
  roleFilter?: string;
  [key: string]: any;
}

// 查询结果接口
export interface QueryResult<T = any> {
  data: T[];
  total: number;
  success?: boolean;
}

// SpaceTable 组件属性接口
export interface SpaceTableProps<T = any> {
  // 初始化加载数据
  initLoad?: boolean;

  // 数据查询函数
  queryData: (params: QueryParams) => Promise<QueryResult<T>>;

  // 列配置
  columns: SpaceColumnConfig<T>[];

  // 操作列配置（可选）
  actionColumn?: ActionColumnConfig<T>;

  // 分页配置
  pagination?: Partial<PaginationConfig>;

  // 表格其他属性
  rowKey?: string | ((record: T) => string);
  loading?: boolean;
  className?: string;
  scroll?: TableProps<T>['scroll'];

  // 外部查询参数
  extraParams?: Record<string, any>;

  // 成功/错误回调
  onSuccess?: (data: T[], total: number) => void;
  onError?: (error: any) => void;

  // 自定义空状态
  locale?: TableProps<T>['locale'];
}

// 添加 ref 方法接口
export interface SpaceTableRef {
  reload: () => Promise<void>;
}

const SpaceTable = forwardRef(function SpaceTable<
  T extends Record<string, any> = any,
>(props: SpaceTableProps<T>, ref: React.ForwardedRef<SpaceTableRef>) {
  const { t } = useTranslation();
  const {
    initLoad = true,
    queryData,
    columns,
    actionColumn,
    pagination: paginationConfig,
    rowKey = 'id',
    loading: externalLoading,
    className,
    scroll = {
      scrollToFirstRowOnChange: true,
      y: 'max(120px, calc(100% - 60px))',
    },
    extraParams = {},
    onSuccess,
    onError,
    locale,
    ...restProps
  } = props;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const isMounted = useRef(false);
  const [pagination, setPagination] = useState<PaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: false,
    showTotal: (total, range) => t('space.totalDataCount', { total }),
    pageSizeOptions: ['10', '20', '50'],
    position: ['bottomCenter'],
    ...paginationConfig,
  });
  const extraParamsRef = useRef(extraParams);

  // 加载数据
  const loadData = useCallback(
    async (paginationParams?: { current: number; pageSize: number }) => {
      if (externalLoading !== undefined) {
        // 如果外部控制loading状态，则不设置内部loading
      } else {
        setLoading(true);
      }

      try {
        const params: QueryParams = {
          current: paginationParams?.current || pagination.current,
          pageSize: paginationParams?.pageSize || pagination.pageSize,
          ...extraParams,
        };

        const result = await queryData(params);
        if (result.success !== false) {
          setData(result.data);
          setPagination(prev => ({
            ...prev,
            total: result.total,
            ...(paginationParams || {}),
          }));

          onSuccess?.(result.data, result.total);
        } else {
          throw new Error(t('space.queryFailed'));
        }
      } catch (error) {
        onError?.(error);
      } finally {
        setLoading(false);
      }
    },
    [
      extraParams,
      queryData,
      onSuccess,
      onError,
      pagination.current,
      pagination.pageSize,
      t,
    ]
  );

  useEffect(() => {
    // 当 initLoad 为 true 加载数据
    if (initLoad) {
      loadData();
    }
  }, [initLoad]);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      extraParamsRef.current = extraParams;
      return;
    }
    if (
      JSON.stringify(extraParamsRef.current) !== JSON.stringify(extraParams)
    ) {
      // 组件挂载后，监听extraParams变化，重置分页并加载数据
      loadData({ current: 1, pageSize: pagination.pageSize });
      extraParamsRef.current = extraParams;
    }
  }, [extraParams]);

  // 分页变化处理
  const handlePaginationChange = (page: number, pageSize: number) => {
    loadData({ current: page, pageSize });
  };

  // 暴露方法给外部
  useImperativeHandle(ref, () => ({
    reload: loadData,
  }));

  // 构建最终的列配置
  const finalColumns: ColumnsType<T> = [
    ...columns.map(col => ({
      title: col.title,
      dataIndex: col.dataIndex,
      key: col.key,
      width: col.width,
      render: col.render,
      sorter: col.sorter,
      sortOrder: col.sortOrder,
      fixed: col.fixed,
      align: col.align,
    })),
    ...(actionColumn
      ? [
          {
            title: actionColumn.title || t('space.operation'),
            key: 'action',
            width: actionColumn.width || 200,
            fixed: actionColumn.fixed,
            render: (_: any, record: T, index: number) => {
              const actionButtons = actionColumn.getActionButtons(
                record,
                index
              );

              return (
                <div className={styles.actionCell}>
                  <ButtonGroup buttons={actionButtons} />
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <div className={styles.spaceTable} style={{ height: '100%' }}>
      <div className={styles.tableContainer} style={{ height: '100%' }}>
        <Table<T>
          style={{ height: '100%' }}
          className={`xingchen-table space ${styles.table} ${className || ''}`}
          columns={finalColumns}
          dataSource={data}
          rowKey={rowKey}
          loading={loading}
          pagination={{
            ...pagination,
            onChange: handlePaginationChange,
            className: styles.pagination,
          }}
          scroll={scroll}
          locale={{
            ...locale,
            emptyText: <Empty />,
          }}
          {...restProps}
        />
      </div>
    </div>
  );
}) as <T extends Record<string, any> = any>(
  props: SpaceTableProps<T> & { ref?: React.ForwardedRef<SpaceTableRef> }
) => React.ReactElement;

export default SpaceTable;
