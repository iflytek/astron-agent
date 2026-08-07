import { useEffect, useState, useRef, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import useOrderStore from '@/store/spark-store/order-store';

import {
  Select,
  DatePicker,
  Button,
  Table,
  Checkbox,
  Popover,
  Tag,
} from 'antd';
import { BarsOutlined } from '@ant-design/icons';
import type { DatePickerProps, GetProps } from 'antd';
import CheckModal from './CheckModal';
import ExportBtn from './ExportBtn';
import dayjs from 'dayjs';
import { useSlot } from '../detail-list-page';
import eventBus from '@/utils/event-bus';

import styles from './index.module.scss';
import classNames from 'classnames';

// 从config统一入口导入所有需要的配置、工具函数和类型
import {
  SEPERATOR,
  timeRangeMap,
  searchValueFormat,
  convertSearchValueToRange,
  createDateRangeValidator,
  generateListParams,
  columnsMap,
  requiredOptions,
  checkboxOptions,
  // 工具函数
  parseJsonValue,
  convertToTree,
  checkTimeRangeInPackagePermission,
  // 类型定义
  type DataType,
} from './config';

import { getTraceList as getTraceListAPI } from '@/services/trace';
import { useTranslation } from 'react-i18next';

const { RangePicker } = DatePicker;
type RangePickerProps = GetProps<typeof DatePicker.RangePicker>;

const index = () => {
  const { record, botId } = useOutletContext<{
    record: any;
    botId: string;
  }>();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  // 使用插槽hook
  const { registerSlotContent, unregisterSlotContent } = useSlot();

  // 每分钟触发的心跳，用于刷新 sourceOptions
  const [sourceOptionsTick, setSourceOptionsTick] = useState(0);
  const lastMinuteRef = useRef<number>(new Date().getMinutes());
  useEffect(() => {
    const timer = setInterval(() => {
      const currentMinute = new Date().getMinutes();
      if (currentMinute !== lastMinuteRef.current) {
        lastMinuteRef.current = currentMinute;
        setSourceOptionsTick(v => v + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /** ## 生成选择器选项 */
  const sourceOptions = useMemo(() => {
    return Object.entries(timeRangeMap).map(([key, config]) => {
      return {
        key,
        label: config.icon ? (
          <div className={styles.select_label}>
            <span>{t(`releaseDetail.TraceLogPage.${config.label}`)}</span>
            <span
              className={classNames(styles.select_label_icon, config.style)}
            >
              <img
                src={config.icon}
                alt={`${t(`releaseDetail.TraceLogPage.${config.label}`)} icon`}
              />
            </span>
          </div>
        ) : (
          t(`releaseDetail.TraceLogPage.${config.label}`)
        ),
        value: key,
      };
    });
  }, [sourceOptionsTick]);

  const [currentColumns, setCurrentColumns] = useState<any[]>([]); //设置当前列
  const [selectedOptions, setSelectedOptions] =
    useState<string[]>(requiredOptions);
  const [searchValue, setSearchValue] = useState(sourceOptions[0]?.key || '');
  const [rangeValue, setRangeValue] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [dataSource, setDataSource] = useState<DataType[]>([]);

  const { orderTraceAndIcon: orderType } = useOrderStore(
    state => state.orderDerivedInfo
  );

  // 初始化时设置RangePicker的值
  useEffect(() => {
    const range = convertSearchValueToRange(searchValueFormat(searchValue));
    setRangeValue(range);
  }, []);

  // 当searchValue改变时更新RangePicker的值
  useEffect(() => {
    const range = convertSearchValueToRange(searchValueFormat(searchValue));
    setRangeValue(range);
  }, [searchValue, sourceOptionsTick]);

  // 根据用户套餐类型获取可用的时间范围选项
  const getAvailableTimeOptions = (orderType: number) => {
    switch (orderType) {
      case 0:
        return sourceOptions.filter(opt => opt.key.includes('0')); // 只能查5天
      case 1:
        return sourceOptions.filter(
          opt => opt.key.includes('0') || opt.key.includes('1')
        ); // 15天
      case 2:
        return sourceOptions.filter(opt => !opt.key.includes('3')); // 90天
      case 3:
        return sourceOptions; // 1年
      default:
        return sourceOptions.filter(opt => opt.key.includes('0')); // 默认只允许5天
    }
  };

  // 获取当前可用的时间范围选项
  const [availableOptions, setAvailableOptions] = useState(sourceOptions);

  /** ## 监听用户套餐 */
  useEffect(() => {
    console.log('orderType: ', orderType);
    const options = getAvailableTimeOptions(orderType);
    setAvailableOptions(options);

    // 如果当前选择的值不在新选项中，自动切换到第一个可用选项
    if (!options.some(opt => opt.value === searchValue)) {
      setSearchValue(options[0]?.value || '');
    }
  }, [orderType]);

  // const onOk = (
  //   value: DatePickerProps["value"] | RangePickerProps["value"]
  // ) => {
  //   console.log("onOk: ", value);
  // };

  // 创建序号列
  const createIndexColumn = () => ({
    title: t('releaseDetail.TraceLogPage.serialNumber'),
    dataIndex: 'index',
    key: 'index',
    render: (_: any, __: any, index: number) =>
      (pagination.current - 1) * pagination.pageSize + index + 1,
    width: 100,
  });

  // 处理Status列的渲染，config.ts中返回的格式需要转换为Tag组件
  const processColumnsForRender = (columns: any[]) => {
    return columns.map(column => {
      if (column.key === 'statusCode' && typeof column.render === 'function') {
        const originalRender = column.render;
        return {
          ...column,
          render: (value: any) => {
            const result = originalRender(value, isEnglish);
            return <Tag color={result.props.color}>{result.children}</Tag>;
          },
        };
      }
      return column;
    });
  };

  // 根据选中的选项更新表格列
  useEffect(() => {
    const optionColumns = selectedOptions.map(
      option => columnsMap[option as keyof typeof columnsMap]
    );
    const processedColumns = processColumnsForRender([
      createIndexColumn(),
      ...optionColumns,
    ]);
    setCurrentColumns(processedColumns);
  }, [selectedOptions, pagination.current, pagination.pageSize]);

  useEffect(() => {
    // 初始化表格列
    const initialColumns = requiredOptions.map(
      option => columnsMap[option as keyof typeof columnsMap]
    );
    const processedColumns = processColumnsForRender([
      createIndexColumn(),
      ...initialColumns,
    ]);
    setCurrentColumns(processedColumns);
  }, []);

  // 处理复选框变更，确保必选项始终被选中
  const handleCheckboxChange = (checkedValues: string[]) => {
    // 合并必选项和用户选择的项
    const combinedValues = [...requiredOptions];

    // 添加用户选择的非必选项
    checkedValues.forEach(value => {
      if (!requiredOptions.includes(value)) {
        combinedValues.push(value);
      }
    });

    setSelectedOptions(combinedValues);
  };

  //列管理内容
  const popoverContent = (
    <div className={styles.checkbox_group_container}>
      <Checkbox.Group
        options={checkboxOptions}
        className={styles.checkbox_group}
        value={selectedOptions}
        onChange={handleCheckboxChange}
      />
      <div
        onClick={() => setSelectedOptions(requiredOptions)}
        className={styles.reset_button}
      >
        {t('releaseDetail.TraceLogPage.resetToDefault')}
      </div>
    </div>
  );

  /** ## 处理trace列表数据 */
  const handleTraceData = (res: any) => {
    const { pageData, totalCount } = res;

    return {
      total: totalCount || 0,
      data: (pageData?.[0] || []).map((item: any) => {
        const { sub, startTime, endTime, usage, trace, status, ...rest } = item;

        // 使用通用解析函数
        const statusCode = parseJsonValue(status, 'code');
        const question = parseJsonValue(rest?.question);
        const answer = parseJsonValue(rest?.answer);
        const rootData = {
          input: {
            input: question,
          },
          output: {
            output: answer,
          },
        };

        return {
          ...rest,
          question,
          answer,
          startTime: dayjs(startTime).format('YYYY-MM-DD HH:mm:ss'),
          endTime: dayjs(endTime).format('YYYY-MM-DD HH:mm:ss'),
          sub,
          ...(sub === 'workflow' && {
            questionTokens: usage?.questionTokens,
            promptTokens: usage?.promptTokens,
            totalTokens: usage?.totalTokens,
          }),
          trace: convertToTree(trace, rootData),
          status,
          statusCode,
        };
      }),
    };
  };

  /** ## 获取trace列表数据 */
  const getTraceList = async (customParams?: any) => {
    if (!customParams) return;

    // TODO: 调用接口获取trace列表数据
    setLoading(true);

    try {
      const res = await getTraceListAPI(customParams);
      const { data, total } = handleTraceData(res);

      setDataSource(data);
      setPagination(prev => ({
        ...prev,
        total: total,
      }));
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  /** ## 重置搜索 */
  const resetSearch = () => {
    // TODO: 重置搜索条件
    const _searchValue = sourceOptions[0]?.value ?? '';
    setSearchValue(_searchValue);

    const _pagination = {
      current: 1,
      pageSize: 10,
      total: 0,
    };
    setPagination(_pagination);

    const params = generateListParams(
      searchValueFormat(_searchValue),
      _pagination,
      'YYYY-MM-DD HH:mm:ss',
      { botId }
    );
    getTraceList(params);
  };

  /** ## 搜索 */
  const search = () => {
    const _pagination = {
      ...pagination,
      current: 1,
      total: 0,
    };
    setPagination(_pagination);

    const params = generateListParams(
      searchValueFormat(searchValue),
      _pagination,
      'YYYY-MM-DD HH:mm:ss',
      { botId }
    );
    getTraceList(params);
  };

  /** ## 分页 */
  const handlePageChange = ({ current, pageSize }: any) => {
    console.log({ current, pageSize }, '======== pagination =======');
    const newCurrent = pageSize !== pagination.pageSize ? 1 : current;
    const _pagination = {
      ...pagination,
      current: newCurrent,
      pageSize,
    };
    setPagination(_pagination);

    const params = generateListParams(
      searchValueFormat(searchValue),
      _pagination,
      'YYYY-MM-DD HH:mm:ss',
      { botId }
    );
    getTraceList(params);
  };

  /** ## 选择时间范围 */
  const handleSelectChange = (value: string) => {
    console.log('Selected Source: ', value);
    // 判断时间范围是否在套餐权限内
    const isInPackagePermission = checkTimeRangeInPackagePermission(
      value,
      availableOptions
    );
    if (!isInPackagePermission) {
      eventBus.emit('showComboModal');
      return;
    }

    setSearchValue(value);
    // 选择预定义时间范围后自动搜索
    const params = generateListParams(
      searchValueFormat(value),
      pagination,
      'YYYY-MM-DD HH:mm:ss',
      { botId }
    );
    getTraceList(params);
  };

  /** ## 处理时间范围变更 */
  const handleRangeChange = (value: any, dateString: string[]) => {
    console.log('Selected Time: ', value);
    setRangeValue(value);
    const params = generateListParams(
      dateString.join(SEPERATOR),
      pagination,
      'YYYY-MM-DD HH:mm',
      { botId }
    );
    getTraceList(params);
  };

  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<DataType | null>(null);

  // 处理行点击
  const handleRowClick = (record: DataType) => {
    setSelectedRecord(record);
    setIsModalVisible(true);
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  // 创建日期范围验证器
  const dateRangeValidator = createDateRangeValidator(searchValue, rangeValue);

  // 创建配置展示元素
  const configContent = (
    <div className={styles.slot_header}>
      <div className={styles.header_left}>
        <Select
          options={sourceOptions}
          style={{ width: 180 }}
          value={searchValue}
          onChange={value => {
            handleSelectChange(value);
          }}
        />
        <RangePicker
          className={styles.range_picker}
          // showTime={{ format: "HH:mm" }}
          format="YYYY-MM-DD HH:mm"
          value={rangeValue}
          // onChange={(value, dateString) => {
          //   console.log("Selected Time: ", value);
          //   console.log("Formatted Selected Time: ", dateString);
          //   handleRangeChange(value, dateString);
          // }}
          // onOk={onOk}
          disabled={true}
          disabledDate={dateRangeValidator}
        />
        <Button size="small" type="default" onClick={resetSearch}>
          {t('releaseDetail.TraceLogPage.reset')}
        </Button>
        <Button size="small" type="primary" onClick={search}>
          {t('releaseDetail.TraceLogPage.search')}
        </Button>
        <ExportBtn timeRange={rangeValue} record={record} botId={botId} />
      </div>

      <div className={styles.header_right}>
        <Popover
          content={popoverContent}
          title={null}
          trigger="click"
          arrow={false}
          placement="bottomRight"
        >
          <Button icon={<BarsOutlined />} size="small" type="primary">
            {t('releaseDetail.TraceLogPage.columnManage')}
          </Button>
        </Popover>
      </div>
    </div>
  );

  // 注册插槽内容
  useEffect(() => {
    registerSlotContent(configContent);

    // 组件卸载时清理插槽内容
    return () => {
      unregisterSlotContent();
    };
  }, [
    searchValue,
    rangeValue,
    selectedOptions,
    registerSlotContent,
    unregisterSlotContent,
  ]);

  useEffect(() => {
    search();
  }, []);

  return (
    <div className={styles.trace_logs}>
      <div className={styles.content}>
        <div className={styles.table}>
          <Table<DataType>
            className="xingchen-table"
            columns={currentColumns}
            dataSource={dataSource}
            pagination={{
              position: ['bottomCenter'],
              showTotal: (total, range) =>
                `${t('releaseDetail.TraceLogPage.total')}${total}${t(
                  'releaseDetail.TraceLogPage.dataItems'
                )}`,
              ...pagination,
              showSizeChanger: true,
            }}
            scroll={{
              scrollToFirstRowOnChange: true,
              x: 'max(1000px, calc(100vw - 600px))',
              y: 'max(200px ,calc(100vh - 350px))',
            }}
            onRow={record => ({
              onClick: () => handleRowClick(record),
              style: { cursor: 'pointer' },
            })}
            loading={loading}
            rowKey={record => record.sid}
            onChange={handlePageChange}
          />
        </div>
        <CheckModal
          visible={isModalVisible}
          onCancel={handleCloseModal}
          record={selectedRecord}
        />
      </div>
    </div>
  );
};

export default index;
