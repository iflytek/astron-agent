import dayjs from 'dayjs';
import styles from '../index.module.scss';

// 导入工具函数
import * as utils from './utils';

// 导入类型定义
export type { DataType } from './type';
import type { TimeOption } from './type';

// 导入图标
import diamondBlue from '@/assets/imgs/trace/diamond-blue.svg';
import diamondYellow from '@/assets/imgs/trace/diamond-yellow.svg';
import diamondOrange from '@/assets/imgs/trace/diamond-orange.svg';

// ==================== 常量定义 ====================
export const SEPERATOR = '~';

// ==================== 时间范围配置 ====================
/** ## 定义时间范围映射 */
export const timeRangeMap = {
  '0': {
    unit: 'day' as const,
    amount: 5,
    label: '最近5天',
    icon: null,
    style: null,
  },
  '1': {
    // unit: "month" as const,
    unit: 'day' as const,
    amount: 15,
    label: '最近15天',
    icon: diamondBlue,
    style: styles.blue,
  },
  '2': {
    // unit: "year" as const,
    unit: 'day' as const,
    amount: 90,
    label: '最近3个月',
    icon: diamondYellow,
    style: styles.yellow,
  },
  '3': {
    unit: 'year' as const,
    amount: 1,
    label: '最近一年',
    icon: diamondOrange,
    style: styles.orange,
  },
};

// ==================== 表格配置 ====================
/** ## 表格列配置 */
export const columnsMap = {
  Status: {
    title: 'status',
    dataIndex: 'statusCode',
    key: 'statusCode',
    render: (statusCode: number, isEnglish: boolean) => {
      const color = statusCode === 0 ? 'success' : 'error';
      const text = isEnglish
        ? statusCode === 0
          ? 'Success'
          : 'Failure'
        : statusCode === 0
          ? '成功'
          : '失败';
      return { props: { color }, children: text };
    },
    width: 100,
  },
  SID: {
    title: 'sid',
    dataIndex: 'sid',
    key: 'sid',
    width: 200,
    ellipsis: true,
  },
  Question: {
    title: 'question',
    dataIndex: 'question',
    key: 'question',
    ellipsis: true,
    width: 230,
  },
  Answer: {
    title: 'answer',
    dataIndex: 'answer',
    key: 'answer',
    ellipsis: true,
    width: 230,
  },
  Duration: {
    title: 'duration',
    dataIndex: 'duration',
    key: 'duration',
    ellipsis: true,
    render: (duration: number) => utils.durationToSeconds(duration, true),
    width: 100,
  },
  StartTime: {
    title: 'start_time',
    dataIndex: 'startTime',
    key: 'startTime',
    ellipsis: true,
    width: 200,
  },
  EndTime: {
    title: 'end_time',
    dataIndex: 'endTime',
    key: 'endTime',
    ellipsis: true,
    width: 200,
  },
  QuestionTokens: {
    title: 'question_tokens',
    dataIndex: 'questionTokens',
    key: 'questionTokens',
    ellipsis: true,
    width: 200,
  },
  PromptTokens: {
    title: 'prompt_tokens',
    dataIndex: 'promptTokens',
    key: 'promptTokens',
    ellipsis: true,
    width: 200,
  },
  TotalTokens: {
    title: 'total_tokens',
    dataIndex: 'totalTokens',
    key: 'totalTokens',
    ellipsis: true,
    width: 200,
  },
};

/** ## 必选且不可更改的选项 */
export const requiredOptions = [
  'Status',
  'SID',
  'Question',
  'Answer',
  'Duration',
  'StartTime',
  'EndTime',
];

/** ## 列管理选项 */
export const checkboxOptions = [
  { label: 'Status', value: 'Status', disabled: true },
  { label: 'SID', value: 'SID', disabled: true },
  { label: 'Question', value: 'Question', disabled: true },
  { label: 'Answer', value: 'Answer', disabled: true },
  { label: 'Duration', value: 'Duration', disabled: true },
  { label: 'Start Time', value: 'StartTime', disabled: true },
  { label: 'End Time', value: 'EndTime', disabled: true },
  { label: 'Question Tokens', value: 'QuestionTokens' },
  { label: 'Prompt Tokens', value: 'PromptTokens' },
  { label: 'Total Tokens', value: 'TotalTokens' },
];

/** ## 输入字段优先级 */
export const INPUT_FIELD_PRIORITY = [
  'input',
  'prompt',
  'text',
  'AGENT_USER_INPUT',
];

/** ## 输出字段优先级 */
export const OUTPUT_FIELD_PRIORITY = ['output', 'data'];

// ==================== 工具函数封装 ====================
/** ## 将searchValue转换为日期格式 */
export const searchValueFormat = (value: string): string => {
  return utils.searchValueFormat(value, timeRangeMap, SEPERATOR);
};

/** ## 将searchValue转换为RangePicker需要的dayjs格式 */
export const convertSearchValueToRange = (value: string) => {
  return utils.convertSearchValueToRange(value, SEPERATOR);
};

/** ## 判断日期是否在可选范围内 */
export const createDateRangeValidator = (
  searchValue: string,
  rangeValue: any
) => {
  return utils.createDateRangeValidator(searchValue, rangeValue, SEPERATOR);
};

/** ## 生成列表查询参数 */
export const generateListParams = (
  searchValue: string,
  pagination: any,
  format: string = 'YYYY-MM-DD HH:mm:ss',
  extraParams: Record<string, any> = {}
) => {
  return utils.generateListParams(
    searchValue,
    pagination,
    SEPERATOR,
    format,
    extraParams
  );
};

/** ## 检查时间范围是否在套餐权限内 */
export const checkTimeRangeInPackagePermission = (
  value: string,
  availableOptionsOptions: TimeOption[]
) => {
  return utils.checkTimeRangeInPackagePermission(
    value,
    availableOptionsOptions
  );
};

// ==================== 直接导出工具函数 ====================
// 数据处理相关
export const {
  isValidJson,
  parseJsonValue,
  durationToSeconds,
  transformTraceData,
  convertToTree,
  findFieldByPriority,
} = utils;

// 导出工具函数类型
export type { TraceData, TraceNode } from './utils';
