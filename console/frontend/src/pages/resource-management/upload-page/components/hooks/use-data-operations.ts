import React, { useState, useRef } from 'react';
import {
  listPreviewKnowledgeByPage,
  createHtmlFile,
} from '@/services/knowledge';
import { modifyChunks } from '@/utils/utils';
import cloneDeep from 'lodash/cloneDeep';
import {
  Chunk,
  FileStatusResponse,
  FlexibleType,
  KnowledgeItem,
  PageData,
  UploadFile,
} from '@/types/resource';
import { useSliceOperations } from './use-slice-operations';

let currentFileIds: (string | number)[] = [];

interface UseDataOperationsProps {
  tag: string;
  setSparkFiles: React.Dispatch<React.SetStateAction<UploadFile[]>>;
  repoId: string;
  fileIds: (string | number)[];
  setFileIds: React.Dispatch<React.SetStateAction<(string | number)[]>>;
  setUploadList: React.Dispatch<React.SetStateAction<UploadFile[]>>;
  importType: string;
  linkValue: string;
  parentId: number | string;
  defaultConfig: Record<string, FlexibleType>;
  slicing: boolean;
  setSlicing: (slicing: boolean) => void;
  sliceType: string;
  setSliceType: (type: string) => void;
  setSaveDisabled: (disabled: boolean) => void;
  failedList: FileStatusResponse[];
  setFailedList: (list: FileStatusResponse[]) => void;
  setNewSaveDisabled: (disabled: boolean) => void;
  configDetail: {
    min: number;
    max: number;
    seperator: string;
  };
  chunkRef: React.RefObject<HTMLDivElement>;
}

/**
 * 数据操作相关的 hook
 */
export const useDataOperations = (
  props: UseDataOperationsProps
): {
  linkList: string[];
  total: number;
  chunks: Chunk[];
  setChunks: React.Dispatch<React.SetStateAction<Chunk[]>>;
  violationIds: string[];
  setViolationIds: React.Dispatch<React.SetStateAction<string[]>>;
  violationTotal: number;
  selectDefault: () => void;
  selectCustom: () => void;
  customSlice: (ids?: (string | number)[]) => void;
  initializeData: () => void;
  reTry: () => void;
  cleanup: () => void;
} => {
  const {
    tag,
    setSparkFiles,
    repoId,
    fileIds,
    setFileIds,
    setUploadList,
    importType,
    linkValue,
    parentId,
    defaultConfig,
    slicing,
    setSlicing,
    sliceType,
    setSliceType,
    setSaveDisabled,
    failedList,
    setFailedList,
    setNewSaveDisabled,
    configDetail,
    chunkRef,
  } = props;

  const [linkList, setLinkList] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [violationIds, setViolationIds] = useState<string[]>([]);
  const [violationTotal, setViolationTotal] = useState(0);
  const selectTypeCache = useRef({
    default: {},
    custom: {},
  });

  const getCacheData = (cacheData: PageData<KnowledgeItem>): void => {
    setChunks(modifyChunks(cacheData.pageData || []));
    setTotal(cacheData.totalCount);
    setViolationTotal((cacheData.extMap?.auditBlockCount as number) || 0);
    if (cacheData?.fileSliceCount) {
      setSparkFiles(sparkFiles =>
        sparkFiles?.map(file => ({
          ...file,
          paraCount: cacheData?.fileSliceCount?.[file?.['fileId'] || ''],
        }))
      );
    }
    if (chunkRef.current) {
      chunkRef.current.scrollTop = 0;
    }
  };

  const getChunks = (
    failedList: (string | number)[],
    selectType: string
  ): void => {
    const fileIds = currentFileIds.filter(item => !failedList.includes(item));
    if (fileIds.length === 0) {
      setChunks([]);
      selectTypeCache.current[
        selectType as keyof typeof selectTypeCache.current
      ] = {};
    } else {
      const params = {
        tag,
        fileIds,
        pageNo: 1,
        pageSize: 10,
      };

      listPreviewKnowledgeByPage(params).then(data => {
        const chunks = modifyChunks(data.pageData || []);
        selectTypeCache.current[
          selectType as keyof typeof selectTypeCache.current
        ] = cloneDeep(data);

        setChunks(chunks);
        setTotal(data.totalCount);
        setViolationTotal((data.extMap?.auditBlockCount as number) || 0);
        if (data?.fileSliceCount) {
          setSparkFiles(sparkFiles =>
            sparkFiles?.map(file => ({
              ...file,
              paraCount: data?.fileSliceCount?.[file?.['fileId'] || ''],
            }))
          );
        }
      });
    }
  };

  const { selectDefault, selectCustom, customSlice, reTry } =
    useSliceOperations({
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
    });

  const initializeData = (): void => {
    setSaveDisabled(true);
    setNewSaveDisabled(true);

    if (importType === 'web') {
      const linkArr = linkValue.split('\n');
      setLinkList(linkArr);
    }
    if (importType === 'text') {
      currentFileIds = fileIds;
    } else {
      const htmlAddressList = linkValue.split('\n');
      const params = {
        repoId,
        parentId,
        htmlAddressList,
      };
      createHtmlFile(params).then(data => {
        const fileIds = data.map(item => item.id);
        currentFileIds = fileIds;
        setFileIds(fileIds);
      });
    }
  };

  const cleanup = (): void => {
    setSlicing(false);
  };

  return {
    linkList,
    total,
    chunks,
    setChunks,
    violationIds,
    setViolationIds,
    violationTotal,
    selectDefault,
    selectCustom,
    customSlice,
    initializeData,
    reTry,
    cleanup,
  };
};
