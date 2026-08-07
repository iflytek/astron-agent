import { message } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { sliceFilesAPI, getStatusAPI } from '@/services/knowledge';
import {
  Chunk,
  FileStatusResponse,
  FlexibleType,
  KnowledgeItem,
  PageData,
  UploadFile,
} from '@/types/resource';

let timer: number;

interface UseSliceOperationsProps {
  tag: string;
  defaultConfig: Record<string, FlexibleType>;
  slicing: boolean;
  setSlicing: (slicing: boolean) => void;
  sliceType: string;
  setSliceType: (type: string) => void;
  setNewSaveDisabled: (disabled: boolean) => void;
  configDetail: {
    min: number;
    max: number;
    seperator: string;
  };
  chunkRef: React.RefObject<HTMLDivElement>;
  importType: string;
  setUploadList: React.Dispatch<React.SetStateAction<UploadFile[]>>;
  setFailedList: (list: FileStatusResponse[]) => void;
  setTotal: React.Dispatch<React.SetStateAction<number>>;
  setViolationTotal: React.Dispatch<React.SetStateAction<number>>;
  setChunks: React.Dispatch<React.SetStateAction<Chunk[]>>;
  getChunks: (failedList: (string | number)[], selectType: string) => void;
  getCacheData: (cacheData: PageData<KnowledgeItem>) => void;
  selectTypeCache: React.MutableRefObject<{
    default: {};
    custom: {};
  }>;
  failedList: FileStatusResponse[];
  currentFileIds: (string | number)[];
}

/**
 * 切片操作相关的 hook
 */
export const useSliceOperations = (
  props: UseSliceOperationsProps
): {
  selectDefault: () => void;
  selectCustom: () => void;
  customSlice: (ids?: (string | number)[]) => void;
  reTry: () => void;
  currentFileIds: (string | number)[];
} => {
  const { t } = useTranslation();
  const {
    tag,
    defaultConfig,
    slicing,
    setSlicing,
    sliceType,
    setSliceType,
    setNewSaveDisabled,
    configDetail,
    chunkRef,
    importType,
    setUploadList,
    setFailedList,
    setTotal,
    setViolationTotal,
    setChunks,
    getChunks,
    getCacheData,
    selectTypeCache,
    failedList,
    currentFileIds,
  } = props;

  const getFileStatus = (type: string): void => {
    window.clearInterval(timer);
    timer = window.setInterval(() => {
      const params = {
        indexType: 0,
        tag,
        fileIds: currentFileIds,
      };
      getStatusAPI(params).then(data => {
        const doneList = data.filter(
          item => item.status === 1 || item.status === 2
        );
        const failedList = data.filter(item => item.status === 1);
        if (doneList.length === currentFileIds.length) {
          setSlicing(false);
          getChunks(
            failedList.map(item => item.id || ''),
            type
          );
          window.clearInterval(timer);
        }
        if (importType === 'web') {
          setUploadList(
            () =>
              doneList.map(item => ({
                ...item,
                type: item?.type,
                status: 'done',
                fileId: item?.id,
              })) as UploadFile[]
          );
          failedList.forEach(item => {
            item.type = item?.type || 'html';
          });
        }
        setFailedList(failedList);
      });
    }, 2000);
  };

  const defaultSlice = (ids?: (string | number)[]): void => {
    window.clearInterval(timer);
    setSlicing(true);
    setTotal(0);
    setViolationTotal(0);
    setChunks([]);
    const params = {
      tag,
      sliceConfig: defaultConfig,
      fileIds: ids || currentFileIds,
    };
    sliceFilesAPI(params)
      .then(() => {
        getFileStatus('default');
        setNewSaveDisabled(false);
      })
      .catch(() => {
        setSlicing(false);
      });
  };

  const customSlice = (ids?: (string | number)[]): void => {
    setNewSaveDisabled(true);
    window.clearInterval(timer);
    setSlicing(true);
    setTotal(0);
    setViolationTotal(0);
    setChunks([]);
    const sliceConfig = {
      tag,
      sliceConfig: {
        type: 1,
        seperator: [configDetail.seperator.replace('\\n', '\n')],
        lengthRange: [configDetail.min, configDetail.max],
      },
      fileIds: ids || currentFileIds,
    };
    sliceFilesAPI(sliceConfig)
      .then(() => {
        getFileStatus('custom');
        setNewSaveDisabled(false);
        if (chunkRef.current) {
          chunkRef.current.scrollTop = 0;
        }
      })
      .catch(() => {
        setSlicing(false);
      });
  };

  const selectDefault = (): void => {
    if (slicing) {
      message.warning(t('knowledge.slicing'));
      return;
    }
    setSliceType('default');
    window.clearInterval(timer);
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
    setSliceType('custom');
    window.clearInterval(timer);
    if (Object.keys(selectTypeCache.current.custom).length > 0) {
      getCacheData(selectTypeCache.current.custom as PageData<KnowledgeItem>);
    } else {
      setChunks([]);
      setTotal(0);
      setViolationTotal(0);
    }
  };

  const reTry = (): void => {
    const failedIds = failedList.map(item => item.id || '');
    if (sliceType === 'default') {
      defaultSlice(failedIds);
    } else {
      customSlice(failedIds);
    }
  };

  return {
    selectDefault,
    selectCustom,
    customSlice,
    reTry,
    currentFileIds,
  };
};
