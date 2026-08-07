import React, { useRef, useEffect } from 'react';
import {
  Chunk,
  FileStatusResponse,
  FlexibleType,
  UploadFile,
} from '@/types/resource';
import { useConfigManagement } from './use-config-management';
import { useDataOperations } from './use-data-operations';
import { usePagination } from './use-pagination';

interface UseDataCleanProps {
  tag: string;
  setSparkFiles: React.Dispatch<React.SetStateAction<UploadFile[]>>;
  uploadList: UploadFile[];
  repoId: string;
  lengthRange: number[];
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
}

export const useDataClean = (
  props: UseDataCleanProps
): {
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
  linkList: string[];
  total: number;
  chunks: Chunk[];
  violationIds: string[];
  setViolationIds: React.Dispatch<React.SetStateAction<string[]>>;
  violationTotal: number;
  slicing: boolean;
  selectDefault: () => void;
  selectCustom: () => void;
  customSlice: (ids?: (string | number)[]) => void;
  initConfig: () => void;
  reTry: () => void;
} => {
  const {
    tag,
    setSparkFiles,
    repoId,
    lengthRange,
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
  } = props;

  const chunkRef = useRef<HTMLDivElement | null>(null);

  // 配置管理
  const { configDetail, setConfigDetail, initConfig } = useConfigManagement({
    lengthRange,
  });

  // 数据操作
  const {
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
  } = useDataOperations({
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
  });

  // 分页和滚动
  usePagination({
    tag,
    fileIds,
    total,
    chunks,
    setChunks,
    chunkRef,
  });

  // 初始化数据
  useEffect(() => {
    initializeData();
    return cleanup;
  }, []);

  return {
    chunkRef,
    configDetail,
    setConfigDetail,
    linkList,
    total,
    chunks,
    violationIds,
    setViolationIds,
    violationTotal,
    slicing,
    selectDefault,
    selectCustom,
    customSlice,
    initConfig,
    reTry,
  };
};
