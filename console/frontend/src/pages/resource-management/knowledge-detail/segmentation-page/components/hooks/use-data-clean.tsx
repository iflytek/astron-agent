import {
  embeddingBack,
  getConfigs,
  getStatusAPI,
  listPreviewKnowledgeByPage,
  sliceFilesAPI,
} from '@/services/knowledge';
import {
  Chunk,
  FileInfoV2,
  FileStatusResponse,
  FileSummaryResponse,
  KnowledgeItem,
  PageData,
  SliceFilesParams,
} from '@/types/resource';
import { modifyChunks } from '@/utils/utils';
import { message } from 'antd';
import { cloneDeep } from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

let loading: boolean = false;
let timer: number;

// 配置管理 Hook
const useConfigManagement = (
  tag: string
): {
  defaultConfig: Record<string, unknown>;
  configDetail: { min: number; max: number; seperator: string };
  setConfigDetail: React.Dispatch<
    React.SetStateAction<{ min: number; max: number; seperator: string }>
  >;
  lengthRange: number[];
  seperatorsOptions: { label: string; value: string }[];
  setSeperatorsOptions: React.Dispatch<
    React.SetStateAction<{ label: string; value: string }[]>
  >;
  initConfig: () => void;
} => {
  const [defaultConfig, setDefaultConfig] = useState({});
  const [configDetail, setConfigDetail] = useState({
    min: 1,
    max: 256,
    seperator: '\\n',
  });
  const [lengthRange, setLengthRange] = useState([1, 256]);
  const [seperatorsOptions, setSeperatorsOptions] = useState<
    {
      label: string;
      value: string;
    }[]
  >([]);
  const timerRef = useRef<number>();

  const sliceConfig = useMemo(() => {
    if (tag === 'CBG-RAG' || tag === 'Ragflow-RAG') {
      return [
        'DEFAULT_SLICE_RULES_CBG',
        'CUSTOM_SLICE_RULES_CBG',
        'CUSTOM_SLICE_SEPERATORS_CBG',
      ];
    } else if (tag === 'AIUI-RAG2') {
      return [
        'DEFAULT_SLICE_RULES_AIUI',
        'CUSTOM_SLICE_RULES_AIUI',
        'CUSTOM_SLICE_SEPERATORS_AIUI',
      ];
    } else {
      return [
        'DEFAULT_SLICE_RULES_SPARK',
        'CUSTOM_SLICE_RULES_SPARK',
        'CUSTOM_SLICE_SEPERATORS_SPARK',
      ];
    }
  }, [tag]);

  useEffect(() => {
    getConfigs(sliceConfig[0]).then(data => {
      const config = JSON.parse(data[0]?.value || '{}');
      setDefaultConfig(config);
    });

    getConfigs(sliceConfig[1]).then(data => {
      const config = JSON.parse(data[0]?.value || '{}');
      setLengthRange(config.lengthRange);
    });

    getConfigs(sliceConfig[2]).then(data => {
      setSeperatorsOptions(JSON.parse(data[0]?.value || '{}'));
    });
  }, [sliceConfig]);

  const initConfig = (): void => {
    setConfigDetail({
      min: lengthRange[0] || 0,
      max: lengthRange[1] || 0,
      seperator: '\\n',
    });
  };

  useEffect(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (configDetail.min > configDetail.max) {
        swapMinMax(configDetail);
        setConfigDetail({ ...configDetail });
      }
    }, 1000);
    return (): void => {
      window.clearTimeout(timerRef.current);
    };
  }, [configDetail]);

  const swapMinMax = (obj: { min: number; max: number }): void => {
    if (obj.min > obj.max) {
      [obj.min, obj.max] = [obj.max, obj.min];
    }
  };

  return {
    defaultConfig,
    configDetail,
    setConfigDetail,
    lengthRange,
    seperatorsOptions,
    setSeperatorsOptions,
    initConfig,
  };
};

// 分页和数据管理 Hook
const usePaginationAndData = (
  tag: string,
  fileId: string
): {
  chunkRef: React.RefObject<HTMLDivElement>;
  pageNumber: number;
  setPageNumber: React.Dispatch<React.SetStateAction<number>>;
  chunks: Chunk[];
  setChunks: React.Dispatch<React.SetStateAction<Chunk[]>>;
  total: number;
  setTotal: React.Dispatch<React.SetStateAction<number>>;
  hasMore: boolean;
  setHasMore: React.Dispatch<React.SetStateAction<boolean>>;
  violationTotal: number;
  setViolationTotal: React.Dispatch<React.SetStateAction<number>>;
  getChunks: (
    selectType: string,
    failList: FileStatusResponse[]
  ) => Promise<PageData<KnowledgeItem> | null>;
  getCacheData: (cacheData: PageData<KnowledgeItem>) => void;
  resetData: () => void;
} => {
  const [pageNumber, setPageNumber] = useState(1);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [violationTotal, setViolationTotal] = useState(0);
  const chunkRef = useRef<HTMLDivElement | null>(null);

  const fetchMoreData = (): void => {
    const params = {
      tag,
      fileIds: [fileId],
      pageNo: pageNumber,
      pageSize: 10,
    };
    listPreviewKnowledgeByPage(params).then(data => {
      const newChunks = modifyChunks(data.pageData || []);
      setChunks(prevItems => [...prevItems, ...newChunks]);
      setPageNumber(prevPageNumber => prevPageNumber + 1);
      loading = false;
      if (total > chunks.length + 10) {
        setHasMore(true);
      } else {
        setHasMore(false);
      }
    });
  };

  const handleScroll = (): void => {
    const element = chunkRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;

    if (scrollTop + clientHeight >= scrollHeight - 200 && hasMore && !loading) {
      loading = true;
      fetchMoreData();
    }
  };

  const getChunks = (
    selectType: string,
    failList: FileStatusResponse[]
  ): Promise<PageData<KnowledgeItem> | null> => {
    const params = {
      tag,
      fileIds: [fileId],
      pageNo: 1,
      pageSize: 10,
    };
    return listPreviewKnowledgeByPage(params).then(data => {
      const chunks = modifyChunks(data.pageData || []);
      setChunks(chunks);
      setPageNumber(2);
      setTotal(data.totalCount);
      setViolationTotal((data.extMap?.auditBlockCount as number) || 0);
      if (data.totalCount > 10) {
        setHasMore(true);
      } else {
        setHasMore(false);
      }
      return failList.length === 0 ? data : null;
    });
  };

  const getCacheData = (cacheData: PageData<KnowledgeItem>): void => {
    setChunks(modifyChunks(cacheData.pageData || []));
    setPageNumber(2);
    setTotal(cacheData.totalCount);
    setViolationTotal((cacheData.extMap?.auditBlockCount as number) || 0);
    if (cacheData.totalCount > 10) {
      setHasMore(true);
    } else {
      setHasMore(false);
    }
  };

  const resetData = (): void => {
    setChunks([]);
    setTotal(0);
    setViolationTotal(0);
    if (chunkRef.current) {
      chunkRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    const element = chunkRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
    }

    return (): void => {
      if (element) {
        element.removeEventListener('scroll', handleScroll);
      }
    };
  }, [pageNumber, hasMore, chunks]);

  return {
    chunkRef,
    pageNumber,
    setPageNumber,
    chunks,
    setChunks,
    total,
    setTotal,
    hasMore,
    setHasMore,
    violationTotal,
    setViolationTotal,
    getChunks,
    getCacheData,
    resetData,
  };
};

// 数据切片管理 Hook
const useDataSlicing = (params: {
  tag: string;
  fileId: string;
  defaultConfig: Record<string, unknown>;
  configDetail: { min: number; max: number; seperator: string };
  getChunks: (
    selectType: string,
    failList: FileStatusResponse[]
  ) => Promise<PageData<KnowledgeItem> | null>;
  getCacheData: (cacheData: PageData<KnowledgeItem>) => void;
  resetData: () => void;
}): {
  sliceType: string;
  setSliceType: React.Dispatch<React.SetStateAction<string>>;
  slicing: boolean;
  setSlicing: React.Dispatch<React.SetStateAction<boolean>>;
  saveDisable: boolean;
  setSaveDisable: React.Dispatch<React.SetStateAction<boolean>>;
  failedList: FileStatusResponse[];
  setFailedList: React.Dispatch<React.SetStateAction<FileStatusResponse[]>>;
  sliceFile: (config?: SliceFilesParams) => void;
  selectDefault: () => void;
  selectCustom: () => void;
  selectTypeCache: React.RefObject<{
    default: PageData<KnowledgeItem> | Record<string, never>;
    custom: PageData<KnowledgeItem> | Record<string, never>;
  }>;
} => {
  const {
    tag,
    fileId,
    defaultConfig,
    configDetail,
    getChunks,
    getCacheData,
    resetData,
  } = params;
  const { t } = useTranslation();
  const [sliceType, setSliceType] = useState('');
  const [slicing, setSlicing] = useState(false);
  const [saveDisable, setSaveDisable] = useState(false);
  const [failedList, setFailedList] = useState<FileStatusResponse[]>([]);
  const selectTypeCache = useRef({
    default: {},
    custom: {},
  });

  const defaultSlice = (config?: SliceFilesParams): void => {
    setSaveDisable(true);
    setSlicing(true);
    resetData();
    const params = {
      sliceConfig: config || defaultConfig,
      fileIds: [fileId],
      tag,
    };
    sliceFilesAPI(params).then(() => {
      setSaveDisable(false);
      getFileStatus('default');
    });
  };

  const sliceFile = (config?: SliceFilesParams): void => {
    setSaveDisable(true);
    setSlicing(true);
    resetData();
    const sliceConfig = {
      sliceConfig: config || {
        type: 1,
        seperator: [configDetail.seperator.replace('\\n', '\n')],
        lengthRange: [configDetail.min, configDetail.max],
      },
      fileIds: [fileId],
      tag,
    };
    sliceFilesAPI(sliceConfig)
      .then(() => {
        setSaveDisable(false);
        getFileStatus('custom');
      })
      .catch(() => {
        setSlicing(false);
      });
  };

  const getFileStatus = (type: string): void => {
    window.clearInterval(timer);
    timer = window.setInterval(() => {
      const params = {
        indexType: 0,
        tag,
        fileIds: [fileId],
      };
      getStatusAPI(params).then(data => {
        const doneList = data.filter(
          item => item.status === 1 || item.status === 2 || item.status === 5
        );
        const failedList = data.filter(item => item.status === 1);
        if (doneList.length === 1) {
          setSlicing(false);
          getChunks(type, failedList).then(cacheData => {
            if (cacheData) {
              selectTypeCache.current[
                type as keyof typeof selectTypeCache.current
              ] = cloneDeep(cacheData);
            } else {
              selectTypeCache.current[
                type as keyof typeof selectTypeCache.current
              ] = {};
            }
          });
          window.clearInterval(timer);
        }
        setFailedList(failedList);
      });
    }, 1000);
  };

  const selectDefault = (): void => {
    if (slicing) {
      message.warning(t('knowledge.slicing'));
      return;
    }
    setSliceType('default');
    if (Object.keys(selectTypeCache.current.default).length > 0) {
      getCacheData(selectTypeCache.current.default as PageData<KnowledgeItem>);
    } else {
      defaultSlice();
    }
  };

  const selectCustom = (): void => {
    if (slicing) {
      message.warning(t('knowledge.slicing'));
      return;
    }
    window.clearInterval(timer);
    setSliceType('custom');
    if (Object.keys(selectTypeCache.current.custom).length > 0) {
      getCacheData(selectTypeCache.current.custom as PageData<KnowledgeItem>);
    } else {
      resetData();
    }
  };

  return {
    sliceType,
    setSliceType,
    slicing,
    setSlicing,
    saveDisable,
    setSaveDisable,
    failedList,
    setFailedList,
    sliceFile,
    selectDefault,
    selectCustom,
    selectTypeCache,
  };
};

// 保存操作管理 Hook
const useSaveOperation = (
  repoId: string,
  tag: string,
  fileInfo: FileInfoV2,
  pid: string
): {
  saveLoading: boolean;
  setSaveLoading: React.Dispatch<React.SetStateAction<boolean>>;
  handleSave: () => void;
} => {
  const navigate = useNavigate();
  const [saveLoading, setSaveLoading] = useState(false);

  const handleSave = (): void => {
    setSaveLoading(true);
    const params: {
      repoId: string;
      tag: string;
      configs: Record<string, string | number | boolean>;
      fileIds: (string | number)[];
      sparkFiles?: {
        fileId: string | number;
        fileName: string;
        charCount: number;
      }[];
    } = {
      repoId,
      tag,
      configs: {},
      fileIds: [fileInfo.id],
    };
    if (tag === 'SparkDesk-RAG') {
      params.sparkFiles = [
        {
          fileId: fileInfo.id,
          fileName: fileInfo.name,
          charCount: fileInfo.charCount,
        },
      ];
    }
    embeddingBack(params)
      .then(() => {
        navigate(`/resource/knowledge/detail/${repoId}/document?tag=${tag}`, {
          state: {
            parentId: pid,
          },
        });
      })
      .finally(() => {
        setSaveLoading(false);
      });
  };

  return {
    saveLoading,
    setSaveLoading,
    handleSave,
  };
};

// UI 状态管理 Hook
const useUIState = (): {
  violationIds: string[];
  setViolationIds: React.Dispatch<React.SetStateAction<string[]>>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  knowledgeSelectRef: React.RefObject<HTMLDivElement>;
} => {
  const [violationIds, setViolationIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const knowledgeSelectRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (
        knowledgeSelectRef.current &&
        !knowledgeSelectRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    window.addEventListener('click', handleClickOutside);

    return (): void => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return {
    violationIds,
    setViolationIds,
    open,
    setOpen,
    knowledgeSelectRef,
  };
};

export const useDataClean = ({
  tag,
  sliceData,
  fileId,
  fileInfo,
  repoId,
  pid,
}: {
  tag: string;
  sliceData: FileSummaryResponse;
  fileId: string;
  fileInfo: FileInfoV2;
  repoId: string;
  pid: string;
}): {
  chunkRef: React.RefObject<HTMLDivElement>;
  configDetail: {
    min: number;
    max: number;
    seperator: string;
  };
  setConfigDetail: React.Dispatch<
    React.SetStateAction<{
      min: number;
      max: number;
      seperator: string;
    }>
  >;
  handleSave: () => void;
  sliceType: string;
  setSliceType: React.Dispatch<React.SetStateAction<string>>;
  failedList: FileStatusResponse[];
  setFailedList: React.Dispatch<React.SetStateAction<FileStatusResponse[]>>;
  violationIds: string[];
  setViolationIds: React.Dispatch<React.SetStateAction<string[]>>;
  violationTotal: number;
  setViolationTotal: React.Dispatch<React.SetStateAction<number>>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  seperatorsOptions: { label: string; value: string }[];
  setSeperatorsOptions: React.Dispatch<
    React.SetStateAction<{ label: string; value: string }[]>
  >;
  lengthRange: number[];
  saveDisable: boolean;
  setSaveDisable: React.Dispatch<React.SetStateAction<boolean>>;
  saveLoading: boolean;
  setSaveLoading: React.Dispatch<React.SetStateAction<boolean>>;
  pageNumber: number;
  setPageNumber: React.Dispatch<React.SetStateAction<number>>;
  chunks: Chunk[];
  setChunks: React.Dispatch<React.SetStateAction<Chunk[]>>;
  total: number;
  setTotal: React.Dispatch<React.SetStateAction<number>>;
  hasMore: boolean;
  setHasMore: React.Dispatch<React.SetStateAction<boolean>>;
  slicing: boolean;
  setSlicing: React.Dispatch<React.SetStateAction<boolean>>;
  sliceFile: (config?: SliceFilesParams) => void;
  selectDefault: () => void;
  selectCustom: () => void;
  knowledgeSelectRef: React.RefObject<HTMLDivElement>;
  initConfig: () => void;
} => {
  // 使用拆分的子 hooks
  const configManager = useConfigManagement(tag);
  const paginationManager = usePaginationAndData(tag, fileId);
  const saveManager = useSaveOperation(repoId, tag, fileInfo, pid);
  const uiManager = useUIState();
  const dataSliceManager = useDataSlicing({
    tag,
    fileId,
    defaultConfig: configManager.defaultConfig,
    configDetail: configManager.configDetail,
    getChunks: paginationManager.getChunks,
    getCacheData: paginationManager.getCacheData,
    resetData: paginationManager.resetData,
  });

  const pollFileStatus = (sliceType: string): void => {
    window.clearInterval(timer);

    timer = window.setInterval(() => {
      const statusParams = {
        indexType: 0,
        tag,
        fileIds: [fileId],
      };

      getStatusAPI(statusParams)
        .then(data => {
          const doneList = data.filter(
            item => item.status === 1 || item.status === 2 || item.status === 5
          );
          const failedList = data.filter(item => item.status === 1);

          dataSliceManager.setFailedList(failedList);

          if (doneList.length === 1) {
            window.clearInterval(timer);
            dataSliceManager.setSlicing(false);

            const previewParams = {
              tag,
              fileIds: [fileId],
              pageNo: 1,
              pageSize: 10,
            };

            listPreviewKnowledgeByPage(previewParams)
              .then(previewData => {
                const chunks = modifyChunks(previewData.pageData || []);
                paginationManager.setChunks(chunks);
                paginationManager.setPageNumber(2);
                paginationManager.setTotal(previewData.totalCount);
                paginationManager.setViolationTotal(
                  (previewData.extMap?.auditBlockCount as number) || 0
                );

                if (previewData.totalCount > 10) {
                  paginationManager.setHasMore(true);
                } else {
                  paginationManager.setHasMore(false);
                }

                if (dataSliceManager.selectTypeCache.current) {
                  dataSliceManager.selectTypeCache.current[
                    sliceType as 'default' | 'custom'
                  ] = cloneDeep(previewData);
                }
              })
              .catch(error => {
                console.error('获取预览数据失败:', error);
                dataSliceManager.setSlicing(false);
              });
          } else {
            dataSliceManager.setSlicing(true);
          }
        })
        .catch(error => {
          console.error('检查文件状态失败:', error);
          dataSliceManager.setSlicing(false);
          window.clearInterval(timer);
        });
    }, 1000);
  };

  const initializeData = (sliceType: string): void => {
    dataSliceManager.setSlicing(true);

    pollFileStatus(sliceType);
  };

  const oldSlice = (): void => {
    if (sliceData.sliceType === 1) {
      const configParameter = {
        min: sliceData.lengthRange[0] || 0,
        max: sliceData.lengthRange[1] || 0,
        seperator:
          sliceData.seperator[0] === '\n'
            ? '\\n'
            : sliceData.seperator[0] || '',
      };
      configManager.setConfigDetail({ ...configParameter });
      dataSliceManager.setSliceType('custom');
      initializeData('custom');
    } else if (sliceData.sliceType === 0) {
      dataSliceManager.setSliceType('default');
      configManager.initConfig();
      initializeData('default');
    } else {
      dataSliceManager.setSliceType('default');
      configManager.initConfig();

      initializeData('default');
    }
  };

  useEffect(() => {
    oldSlice();
  }, [sliceData]);

  useEffect(() => {
    return (): void => {
      window.clearTimeout(timer);
      dataSliceManager.setSlicing(false);
    };
  }, []);

  return {
    // 配置相关
    configDetail: configManager.configDetail,
    setConfigDetail: configManager.setConfigDetail,
    seperatorsOptions: configManager.seperatorsOptions,
    setSeperatorsOptions: configManager.setSeperatorsOptions,
    // 分页和数据相关
    chunkRef: paginationManager.chunkRef,
    pageNumber: paginationManager.pageNumber,
    setPageNumber: paginationManager.setPageNumber,
    chunks: paginationManager.chunks,
    setChunks: paginationManager.setChunks,
    total: paginationManager.total,
    setTotal: paginationManager.setTotal,
    hasMore: paginationManager.hasMore,
    setHasMore: paginationManager.setHasMore,
    violationTotal: paginationManager.violationTotal,
    setViolationTotal: paginationManager.setViolationTotal,
    // 切片相关
    sliceType: dataSliceManager.sliceType,
    setSliceType: dataSliceManager.setSliceType,
    slicing: dataSliceManager.slicing,
    setSlicing: dataSliceManager.setSlicing,
    saveDisable: dataSliceManager.saveDisable,
    setSaveDisable: dataSliceManager.setSaveDisable,
    failedList: dataSliceManager.failedList,
    setFailedList: dataSliceManager.setFailedList,
    sliceFile: dataSliceManager.sliceFile,
    selectDefault: dataSliceManager.selectDefault,
    selectCustom: dataSliceManager.selectCustom,
    // 保存相关
    saveLoading: saveManager.saveLoading,
    setSaveLoading: saveManager.setSaveLoading,
    handleSave: saveManager.handleSave,
    // UI 状态相关
    violationIds: uiManager.violationIds,
    setViolationIds: uiManager.setViolationIds,
    open: uiManager.open,
    setOpen: uiManager.setOpen,

    lengthRange: configManager.lengthRange,
    knowledgeSelectRef: uiManager.knowledgeSelectRef,
    initConfig: configManager.initConfig,
  };
};
