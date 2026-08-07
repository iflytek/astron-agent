import { message } from 'antd';
import { v4 as uuid } from 'uuid';
import clsx, { ClassValue } from 'clsx';
import { getFileInfoV2BySourceId } from '@/services/knowledge';
import { downloadKnowledgeByViolation } from '@/services/knowledge';
import http from '@/utils/http';
import {
  Chunk,
  DownloadViolationParams,
  FileItem,
  KnowledgeItem,
  FlexibleType,
  TagDto,
  JsonObject,
  JsonArray,
} from '@/types/resource';
import axios from 'axios';

export function downloadExcel(
  fileIds: (string | number)[],
  source: number,
  name: string
): void {
  const params: DownloadViolationParams = {
    fileIds,
    source,
  };
  downloadKnowledgeByViolation(params).then((data: Blob) => {
    const excelBlob = new Blob([data], {
      type: 'application/vnd.ms-excel',
    });
    const excelUrl = URL.createObjectURL(excelBlob);
    const a = document.createElement('a');
    a.href = excelUrl;
    a.download = name + '的违规详情.xls'; // 设置文件名
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(excelUrl);
  });
}

export const isJSON = (str: string): boolean | void => {
  if (typeof str == 'string') {
    try {
      const obj = JSON.parse(str);
      if (typeof obj == 'object' && obj) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }
};

export const getRouteId = (): string => {
  const arr = window.location.pathname.split('/');
  return arr[arr.length - 2] || '';
};

export const getActiveKey = (): string => {
  let key = window.location.pathname.split('/').pop();
  if (key === 'file' || key === 'segmentation') {
    key = 'document';
  }
  return key || '';
};

export const fileType = (file: FileItem): string => {
  return file.isFile ? file.fileInfoV2?.type : 'folder';
};

export const tagsModify = (tags: TagDto[]): TagDto[] => {
  const newTags: TagDto[] = [];
  tags.map(item => {
    if (item.tags?.length) {
      item.tags.map(tag => {
        newTags.push({
          ...item,
          tagName: tag,
        });
      });
    }
  });
  return newTags;
};

export const generateMeta = async (data: TagDto[]): Promise<TagDto[]> => {
  const newArr: TagDto[] = [];
  const newData = data.map(async item => {
    const data = await getFileInfoV2BySourceId(item['source_id'] || '');
    newArr.push({
      ...item,
      name: data.name,
      type: data.type || '',
    });
  });
  await Promise.all(newData);
  return newArr;
};

export function modifyChunks(chunks: KnowledgeItem[]): Chunk[] {
  return chunks.map((item: KnowledgeItem) => ({
    ...item,
    markdownContent: modifyContent(item.content),
    content: item.content?.content || item.content?.knowledge,
    tagDtoList: tagsModify(item.tagDtoList || []),
    auditSuggest: item.content?.auditSuggest || '',
    auditDetail:
      item.content?.auditDetail
        ?.map(item => item['category_description'])
        ?.join(',') || '',
  }));
}

export function modifyContent(chunk: KnowledgeItem['content']): string {
  const regex = /[{<]unused.+?[>}]/g;
  let content = chunk?.content || chunk?.knowledge || '';
  const matches = content?.match(regex);
  const references = chunk.references;
  if (matches && matches.length) {
    matches.map(item => {
      const imageInfo = references?.[item.slice(1, -1)];
      if (imageInfo && imageInfo.format === 'image') {
        content = content.replace(item, `![image](${imageInfo.link})`);
      } else if (imageInfo && imageInfo?.content) {
        content = content.replace(item, imageInfo.content);
      }
    });
  }
  return content;
}

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export const generateTypeDefault = (
  type: string
): string | number | boolean | [] => {
  if (type === 'string') {
    return '';
  } else if (type === 'integer') {
    return 0;
  } else if (type === 'boolean') {
    return false;
  } else if (type === 'number') {
    return 0;
  } else {
    return [];
  }
};
export const generateType = (suffix: string): string | void => {
  if (['pdf']?.includes(suffix)) {
    return 'pdf';
  } else if (['doc', 'docx']?.includes(suffix)) {
    return 'doc';
  } else if (['jpg', 'jpeg', 'png', 'bmp']?.includes(suffix)) {
    return 'image';
  } else if (['txt']?.includes(suffix)) {
    return 'txt';
  } else if (['md']?.includes(suffix)) {
    return 'md';
  } else if (['ppt', 'pptx']?.includes(suffix)) {
    return 'ppt';
  } else if (['xlsx', 'xls', 'csv']?.includes(suffix)) {
    return 'excel';
  } else if (['html']?.includes(suffix)) {
    return 'html';
  }
};

// 类型判断工具函数
const getValueType = (value: FlexibleType): string => {
  if (value === null) return 'string';
  if (Array.isArray(value)) return 'array';

  const type = typeof value;
  if (type === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number';
  }
  return type;
};
export const transformJsonToArray = (
  data: Record<string, FlexibleType>
): Record<string, FlexibleType>[] => {
  const processData = (
    data: FlexibleType[] | Record<string, FlexibleType>,
    parentType: string,
    isTopLevel: boolean = false
  ): Record<string, FlexibleType> => {
    const baseAttributes = {
      description: '',
      from: 2,
      location: 'query',
      open: true,
      required: true,
      ...(!isTopLevel && parentType === 'array' && { arraySon: true }),
    };

    if (Array.isArray(data)) {
      const children = [data?.[0]].map(item => {
        const type = getValueType(item);

        if (type !== 'object' && type !== 'array') {
          return {
            id: uuid(),
            name: '[Array Item]',
            default: item,
            type,
            arraySon: true,
            fatherType: 'array',
            ...baseAttributes,
          };
        }

        return {
          id: uuid(),
          name: '[Array Item]',
          ...processData(item as Record<string, FlexibleType>, 'array'),
          arraySon: true,
          fatherType: 'array',
          ...baseAttributes,
        };
      });

      return {
        id: uuid(),
        default: data,
        type: 'array',
        children,
        ...(!isTopLevel && { fatherType: parentType }),
        ...baseAttributes,
      };
    }

    if (typeof data === 'object' && data !== null) {
      const children = Object.entries(data).map(([key, value]) => {
        const type = getValueType(value);

        if (type === 'object' || type === 'array') {
          return {
            id: uuid(),
            name: key,
            ...processData(value as Record<string, FlexibleType>, 'object'),
            fatherType: 'object',
            ...baseAttributes,
          };
        }

        return {
          id: uuid(),
          name: key,
          default: value,
          type,
          fatherType: 'object',
          ...baseAttributes,
        };
      });

      return {
        id: uuid(),
        type: 'object',
        children,
        ...(!isTopLevel && { fatherType: parentType }),
        ...baseAttributes,
      };
    }

    return {
      id: uuid(),
      default: data,
      type: getValueType(data),
      ...(!isTopLevel && { fatherType: parentType }),
      ...baseAttributes,
    };
  };

  // 只处理对象作为根节点的情况
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return [];
  }
  return Object.entries(data).map(([key, value]) => {
    const type = getValueType(value);

    if (type === 'object' || type === 'array') {
      return {
        id: uuid(),
        name: key,
        ...processData(value as Record<string, FlexibleType>, type, true), // 标记为顶层元素
        description: '',
        from: 2,
        location: 'query',
        open: true,
        required: true,
        ...(type !== 'object' && { startDisabled: false }),
      };
    }

    return {
      id: uuid(),
      name: key,
      default: value,
      type,
      description: '',
      from: 2,
      location: 'query',
      open: true,
      required: true,
      startDisabled: !value,
    };
  });
};

export const extractAllIdsOptimized = (
  data: JsonObject[] | Record<string, JsonObject>
): string[] => {
  const ids: string[] = [];
  const stack = Array.isArray(data) ? [...data] : [data];

  while (stack.length) {
    const node = stack.pop();

    if (node?.type === 'array' || node?.type === 'object') {
      ids.push(node.id as string);
    }

    if (node?.children) {
      stack.push(...(node.children as JsonObject[]));
    }
  }

  return ids;
};

export const convertToDesiredFormat = (
  data: Record<string, JsonObject | JsonArray>,
  parentType: string | null = null,
  isArraySon: boolean = false
): Record<string, FlexibleType>[] => {
  return Object.entries(data).map(([key, value]) => {
    const type = getValueType(value);
    const isComplexType = type === 'object' || type === 'array';

    const baseItem: Record<string, FlexibleType> = {
      id: uuid(),
      name: key,
      description: isComplexType ? '' : value === null ? '' : String(value),
      type,
      open: true,
      nameErrMsg: '',
      descriptionErrMsg: '',
    };

    if (parentType === 'array' || isArraySon) {
      baseItem.fatherType = parentType || '';
      baseItem.arraySon = true;
    }

    if (isComplexType) {
      if (type === 'array') {
        baseItem.children = [(value as JsonArray)?.[0]]?.map(item => ({
          id: uuid(),
          name: '[Array Item]',
          description: typeof item === 'object' ? '' : item,
          type:
            typeof item === 'object' && !Array.isArray(item)
              ? 'object'
              : typeof item,
          open: true,
          fatherType: 'array',
          arraySon: true,
          descriptionErrMsg: '',
          children:
            typeof item === 'object'
              ? convertToDesiredFormat(
                  item as Record<string, JsonObject | JsonArray>,
                  'array',
                  true
                )
              : undefined,
        }));
      } else {
        baseItem.children = convertToDesiredFormat(
          value as Record<string, JsonObject | JsonArray>,
          'object',
          isArraySon
        );
      }
    }

    return baseItem;
  });
};

// /api/s3/presign

/**
 * Upload image utility function
 * @param file - The image file to upload
 * @param objectKey - Optional custom object key (will generate unique key if not provided)
 * @returns Promise with the uploaded file URL
 */
export interface UploadFileResponse {
  url: string;
  objectKey: string;
  fileName: string;
  bucket: string;
}

export interface PresignResponse {
  url: string;
  bucket: string;
  objectKey: string;
}

export async function uploadFile(
  file: File,
  module: string
): Promise<UploadFileResponse> {
  try {
    // module name + 时间戳
    const objectKey = `${module}/${Date.now()}.${file.name.split('.').pop() || ''}`;
    const response = await http.get<PresignResponse>('/api/s3/presign', {
      params: {
        objectKey: objectKey,
        contentType: file.type,
      },
    });
    const { url, bucket, objectKey: responseObjectKey } = response as any;
    const putResponse = await axios
      .create({
        headers: {
          'Content-Type': file.type,
        },
      })
      .put(url, file, {
        headers: {
          'Content-Type': file.type,
        },
      });
    const fileUrl = url.split('?')[0];
    return {
      url: fileUrl,
      objectKey: responseObjectKey,
      fileName: file.name,
      bucket,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to upload image';
    throw new Error(errorMessage);
  }
}

/**
 * 文本中间字符替换为星号（脱敏）
 * @param text 原始文本（必填）
 * @param options 配置项（可选）
 * - prefixLen 前面保留的字符数，默认 1
 * - suffixLen 后面保留的字符数，默认 1
 * - starLen 星号长度，默认 2（文本较长时自动调整，避免星号过多）
 * @returns 脱敏后的文本
 */
export const maskMiddleText = (
  text: string,
  options: { prefixLen?: number; suffixLen?: number; starLen?: number } = {}
) => {
  // 处理边界：文本为空、null/undefined 或非字符串，直接返回空
  if (!text || typeof text !== 'string') return '';

  // 默认配置
  const { prefixLen = 2, suffixLen = 2, starLen = 2 } = options;
  const textLen = text.length;

  // 情况1：文本长度 ≤ 保留的前后字符总和 → 不脱敏（避免星号覆盖所有字符）
  if (textLen <= prefixLen + suffixLen) {
    return text;
  }

  // 情况2：文本较长 → 截取前后字符，中间加星
  const prefix = text.slice(0, prefixLen); // 前面保留的字符
  const suffix = text.slice(-suffixLen); // 后面保留的字符
  // 动态调整星号长度：若文本过长，星号最多显示 6 个（避免视觉冗余）
  const finalStarLen = Math.min(starLen, textLen - prefixLen - suffixLen, 6);
  const stars = '*'.repeat(finalStarLen); // 生成对应长度的星号

  return `${prefix}${stars}${suffix}`;
};
