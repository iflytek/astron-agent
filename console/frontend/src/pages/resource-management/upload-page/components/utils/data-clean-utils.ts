/**
 * 数据清洗相关工具函数
 */

/**
 * 交换对象中的 min 和 max 值
 */
export const swapMinMax = (obj: { min: number; max: number }): void => {
  if (obj.min > obj.max) {
    [obj.min, obj.max] = [obj.max, obj.min];
  }
};

/**
 * 检查配置是否有效
 */
export const isConfigValid = (config: {
  min: number;
  max: number;
  seperator: string;
}): boolean => {
  return config.min > 0 && config.max > 0 && config.seperator.trim() !== '';
};

/**
 * 格式化分隔符
 */
export const formatSeparator = (separator: string): string => {
  return separator.replace('\\n', '\n');
};

/**
 * 生成切片配置
 */
export const generateSliceConfig = (
  tag: string,
  configDetail: { min: number; max: number; seperator: string },
  fileIds: (string | number)[]
): {
  tag: string;
  sliceConfig: {
    type: number;
    seperator: string[];
    lengthRange: number[];
  };
  fileIds: (string | number)[];
} => {
  return {
    tag,
    sliceConfig: {
      type: 1,
      seperator: [formatSeparator(configDetail.seperator)],
      lengthRange: [configDetail.min, configDetail.max],
    },
    fileIds,
  };
};

/**
 * 生成状态查询参数
 */
export const generateStatusParams = (
  tag: string,
  fileIds: (string | number)[]
): {
  indexType: number;
  tag: string;
  fileIds: (string | number)[];
} => {
  return {
    indexType: 0,
    tag,
    fileIds,
  };
};

/**
 * 生成分页查询参数
 */
export const generatePageParams = (
  tag: string,
  fileIds: (string | number)[],
  pageNo: number,
  pageSize: number = 10
): {
  tag: string;
  fileIds: (string | number)[];
  pageNo: number;
  pageSize: number;
} => {
  return {
    tag,
    fileIds,
    pageNo,
    pageSize,
  };
};
