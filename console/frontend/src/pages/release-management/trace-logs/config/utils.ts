import dayjs from 'dayjs';

import type { TimeOption } from './type';

/**
 * 判断参数是否是有效的json对象
 * @param str 字符串
 * @returns 是否是有效的json对象
 */
export const isValidJson = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * 通用JSON解析函数 - 获取指定字段或第一个键值
 * @param jsonStr 要解析的JSON字符串
 * @param fieldName 可选的字段名，如果指定则直接返回该字段值
 * @returns 解析后的值，失败时返回'-'
 */
export const parseJsonValue = (jsonStr: string, fieldName?: string) => {
  if (!isValidJson(jsonStr)) return '-';

  const parsedObj = JSON.parse(jsonStr);

  // 如果指定了字段名，直接返回该字段值
  if (fieldName) {
    return parsedObj[fieldName] ?? '-';
  }

  // 如果没有指定字段名，返回第一个键值
  const values = Object.values(parsedObj);
  return values.length > 0 ? (values[0] ?? '-') : '-';
};

/**
 * duration ms 转为 s
 * @param duration 毫秒时间
 * @param isAllToSeconds 是否全部转为s
 * @returns 如果小于1000 返回xxxms 否则返回xxxs
 */
export const durationToSeconds = (
  duration: number,
  isAllToSeconds: boolean = false
): string => {
  if (duration === 0) {
    return '0.00s';
  }

  if (!duration) {
    return '-';
  }

  if (duration < 1000 && !isAllToSeconds) {
    return `${parseInt(duration.toString())}ms`;
  }

  const fixDigits = duration >= 1000 ? 2 : 3;

  return `${(duration / 1000).toFixed(fixDigits)}s`;
};

/**
 * 转换追踪数据，处理持续时间
 * @param data 原始追踪数据
 * @returns 转换后的数据
 */
export interface TraceData {
  func_id: string;
  duration: number | string;
  next_log_ids?: string[];
  [key: string]: any;
}

export const transformTraceData = (data: TraceData): TraceData => {
  // 处理func_id不符合"xx::xx"格式的情况
  const funcIdParts = data.func_id.split('::');
  const func_id: string =
    funcIdParts.length > 1 ? funcIdParts[1] || '' : data.func_id || '';
  const func_code = funcIdParts.length > 0 ? funcIdParts[0] : '';

  const executionTime = durationToSeconds(
    typeof data.duration === 'number' ? data.duration : Number(data.duration),
    true
  );

  return {
    ...data,
    func_code,
    func_id,
    executionTime,
  };
};

/**
 * 将traceData转换为树形结构
 * @param data 原始数据数组
 * @param rootData 根节点数据
 * @param showEndNode 是否显示node-end节点
 * @returns 转换后的树形结构
 */
export interface TraceNode extends TraceData {
  children?: TraceNode[];
  key?: string;
  data?: any;
  selectable?: boolean;
  isVirtual?: boolean;
}

export const convertToTree = (
  data: TraceData[],
  rootData?: any,
  showEndNode: boolean = true
): TraceNode[] => {
  if (!data || data.length === 0) {
    return [];
  }

  const traceNodes = data.map(node => transformTraceData(node));
  const traceNodesById = new Map<string, TraceNode>();

  traceNodes.forEach(node => {
    if (node.id) {
      traceNodesById.set(node.id, node as TraceNode);
    }
  });

  const findNodeByLogId = (logId: string): TraceNode | undefined => {
    if (!logId) {
      return undefined;
    }

    const exactNode = traceNodesById.get(logId);
    if (exactNode) {
      return exactNode;
    }

    return traceNodes.find(
      node => node.id && typeof node.id === 'string' && node.id.includes(logId)
    ) as TraceNode | undefined;
  };

  const buildNodeKey = (parentKey: string, nodeId?: string, suffix?: string) =>
    [parentKey, nodeId || 'unknown', suffix].filter(Boolean).join('_');

  const buildTree = (
    sourceNode: TraceNode,
    nodeKey: string,
    visited: Set<string> = new Set()
  ): TraceNode => {
    const currentNode: TraceNode = {
      ...sourceNode,
      key: nodeKey,
    };

    if (!sourceNode.id || visited.has(sourceNode.id)) {
      return currentNode;
    }

    visited.add(sourceNode.id);

    const nextLogIds = sourceNode.next_log_ids || [];
    currentNode.children = [];

    for (const nextId of nextLogIds) {
      const childNode = findNodeByLogId(nextId);

      if (!childNode) {
        continue;
      }

      if (!showEndNode && childNode.func_code === 'node-end') {
        continue;
      }

      currentNode.children.push(
        buildTree(
          childNode,
          buildNodeKey(nodeKey, childNode.id),
          new Set(visited)
        )
      );
    }

    return currentNode;
  };

  // 找到根节点（以node-start::开头的func_id）
  let rootNode: TraceNode | null = null;

  for (const node of traceNodes) {
    const funcId = node.func_id;
    if (
      funcId &&
      typeof funcId === 'string' &&
      funcId.startsWith('node-start::')
    ) {
      rootNode = {
        ...node,
        key: node.id,
        data: rootData || node.data || {},
      };
      break;
    }
  }

  // 如果没有找到根节点，返回空数组
  if (!rootNode) {
    return [];
  }

  const attachIterationGroups = (currentNode: TraceNode) => {
    currentNode.children?.forEach(child => attachIterationGroups(child));

    if (!currentNode.func_id?.startsWith('iteration::')) {
      return;
    }

    const iterationStartNodeId =
      currentNode.data?.config?.IterationStartNodeId ||
      currentNode.data?.config?.iterationStartNodeId;

    if (!iterationStartNodeId || typeof iterationStartNodeId !== 'string') {
      return;
    }

    const iterationRuns = traceNodes.filter(
      node => node.func_id === iterationStartNodeId
    ) as TraceNode[];

    if (!iterationRuns.length) {
      return;
    }

    const iterationOptionNodes = iterationRuns.map((node, index) => {
      const optionLabel = `第${index + 1}次`;
      const optionKey = buildNodeKey(
        currentNode.key || currentNode.id || 'iteration',
        'iteration-option',
        `${index + 1}`
      );

      return {
        id: `iteration-option-${currentNode.id}-${index + 1}`,
        key: optionKey,
        func_id: `iteration-option::${index + 1}`,
        func_code: 'iteration-option',
        func_name: optionLabel,
        node_name: optionLabel,
        func_type: 'iteration-option',
        node_type: 'iteration-option',
        duration: node.duration,
        executionTime: node.executionTime,
        data: {},
        selectable: false,
        isVirtual: true,
        children: [
          buildTree(node, buildNodeKey(optionKey, node.id), new Set<string>()),
        ],
      } as TraceNode;
    });

    const existingChildren = currentNode.children || [];
    const filteredChildren = existingChildren.filter(
      child => child.func_id !== iterationStartNodeId
    );

    currentNode.children = [...iterationOptionNodes, ...filteredChildren];
  };

  // 从根节点开始构建树
  const tree = [buildTree(rootNode, rootNode.id || 'root')];
  tree.forEach(node => attachIterationGroups(node));

  return tree;
};

/**
 * 将searchValue转换为日期格式
 * @param value 搜索值
 * @param timeRangeMap 时间范围映射
 * @param SEPERATOR 分隔符
 * @returns 格式化后的时间范围字符串
 */
export const searchValueFormat = (
  value: string,
  timeRangeMap: any,
  SEPERATOR: string
): string => {
  const now = dayjs();

  const timeRange = timeRangeMap[value];
  if (timeRange) {
    const startTime = now
      .subtract(timeRange.amount, timeRange.unit)
      .format('YYYY-MM-DD 00:00:00');
    const endTime = now.format('YYYY-MM-DD HH:mm:ss');
    return `${startTime}${SEPERATOR}${endTime}`;
  }

  return value;
};

/**
 * 将searchValue转换为RangePicker需要的dayjs格式
 * @param value 搜索值
 * @param SEPERATOR 分隔符
 * @returns dayjs日期范围数组或null
 */
export const convertSearchValueToRange = (value: string, SEPERATOR: string) => {
  if (!value) return null;

  const [startStr, endStr] = value.split(SEPERATOR);
  if (!startStr || !endStr) return null;

  return [dayjs(startStr), dayjs(endStr)];
};

/**
 * 判断日期是否在可选范围内
 * @param searchValue 搜索值
 * @param rangeValue 范围值
 * @param SEPERATOR 分隔符
 * @returns 日期校验函数
 */
export const createDateRangeValidator = (
  searchValue: string,
  rangeValue: any,
  SEPERATOR: string
) => {
  return (current: dayjs.Dayjs) => {
    if (!rangeValue) return false;

    // 获取当前选择的时间范围
    const [start, end] =
      convertSearchValueToRange(searchValue, SEPERATOR) || [];

    // 限制可选范围为当前选择的时间范围内
    if (!start || !end) return false;

    return (
      current.isBefore(start.startOf('day')) ||
      current.isAfter(end.endOf('day'))
    );
  };
};

/**
 * 生成列表查询参数
 * @param searchValue 搜索值
 * @param pagination 分页信息
 * @param SEPERATOR 分隔符
 * @param format 日期格式，用于指导时间补全规则
 * @param extraParams 额外的查询参数，如 {appid: 'xxx', userId: 'yyy'}
 * @returns 查询参数对象
 */
export const generateListParams = (
  searchValue: string,
  pagination: any,
  SEPERATOR: string,
  format: string = 'YYYY-MM-DD HH:mm:ss',
  extraParams: Record<string, any> = {}
) => {
  const [startTime, endTime] = searchValue.split(SEPERATOR);

  /**
   * 根据format格式补全时间字符串
   * @param timeStr 原始时间字符串
   * @param isEndTime 是否为结束时间（影响补全策略）
   * @returns 补全后的时间字符串
   */
  const completeTimeByFormat = (
    timeStr: string,
    isEndTime: boolean = false
  ): string => {
    if (!timeStr) return timeStr;

    // 根据format确定期望的格式长度和结构
    const formatParts = format.split(' ');
    const datePart = formatParts[0] || 'YYYY-MM-DD'; // 日期部分格式
    const timePart = formatParts[1] || 'HH:mm:ss'; // 时间部分格式

    // 检查当前时间字符串的格式
    const timeStrParts = timeStr.split(' ');
    const currentDatePart = timeStrParts[0] || '';
    const currentTimePart = timeStrParts[1] || '';

    let completedTimeStr = timeStr;

    // 如果没有时间部分，根据format添加默认时间
    if (!currentTimePart && timePart) {
      const defaultTime = isEndTime
        ? getDefaultEndTime(timePart)
        : getDefaultStartTime(timePart);
      completedTimeStr = `${currentDatePart} ${defaultTime}`;
    }
    // 如果有时间部分但不完整，进行补全
    else if (currentTimePart && timePart) {
      const completedTime = completeTimePart(
        currentTimePart,
        timePart,
        isEndTime
      );
      completedTimeStr = `${currentDatePart} ${completedTime}`;
    }

    return completedTimeStr;
  };

  /**
   * 获取默认开始时间
   * @param timePart 时间格式部分
   * @returns 默认开始时间字符串
   */
  const getDefaultStartTime = (timePart: string): string => {
    if (timePart.includes('HH:mm:ss')) return '00:00:00';
    if (timePart.includes('HH:mm')) return '00:00';
    if (timePart.includes('HH')) return '00';
    return '00:00:00';
  };

  /**
   * 获取默认结束时间
   * @param timePart 时间格式部分
   * @returns 默认结束时间字符串
   */
  const getDefaultEndTime = (timePart: string): string => {
    if (timePart.includes('HH:mm:ss')) return '23:59:59';
    if (timePart.includes('HH:mm')) return '23:59';
    if (timePart.includes('HH')) return '23';
    return '23:59:59';
  };

  /**
   * 补全时间部分
   * @param currentTime 当前时间字符串
   * @param expectedFormat 期望的时间格式
   * @param isEndTime 是否为结束时间
   * @returns 补全后的时间字符串
   */
  const completeTimePart = (
    currentTime: string,
    expectedFormat: string,
    isEndTime: boolean
  ): string => {
    const timeParts = currentTime.split(':');
    const expectedParts = expectedFormat.split(':').length;

    // 根据期望格式补全缺失的时间部分
    while (timeParts.length < expectedParts) {
      if (timeParts.length === 1) {
        // 缺少分钟，补全为00或59
        timeParts.push(isEndTime ? '59' : '00');
      } else if (timeParts.length === 2) {
        // 缺少秒，补全为00或59
        timeParts.push(isEndTime ? '59' : '00');
      }
    }

    return timeParts.slice(0, expectedParts).join(':');
  };

  // 使用新的补全逻辑
  const formattedStartTime = completeTimeByFormat(startTime ?? '', false);
  const formattedEndTime = completeTimeByFormat(endTime ?? '', true);

  return {
    startTime: formattedStartTime,
    endTime: formattedEndTime,
    page: pagination.current || 1,
    pageSize: pagination.pageSize || 10,
    ...extraParams, // 合并外部传入的额外参数
  };
};

/**
 * 检查时间范围是否在套餐权限内
 * @param value 时间范围
 * @param availableOptionsOptions 套餐权限选项
 * @returns 是否在套餐权限内
 */
export const checkTimeRangeInPackagePermission = (
  value: string,
  availableOptionsOptions: TimeOption[]
) => {
  const isInPackagePermission = availableOptionsOptions.some(
    option => option.value === value
  );
  return isInPackagePermission;
};

/**
 * 通用字段查找方法 - 按优先级查找对象中的字段
 * @param obj 要查找的对象
 * @param fields 字段优先级数组
 * @returns 找到的字段值或空字符串
 */
export const findFieldByPriority = (obj: any, fields: string[]): string => {
  if (!obj) return '';

  for (const field of fields) {
    if (obj[field]) {
      return obj[field];
    }
  }
  return '';
};
