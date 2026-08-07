import {
  enableFlieAPI,
  enableKnowledgeAPI,
  getFileList,
  getFileSummary,
  getRepoUseStatus,
  listKnowledgeByPage,
} from '@/services/knowledge';
import {
  Chunk,
  FileInfoV2,
  FileItem,
  FileSummaryResponse,
  ListKnowledgeParams,
} from '@/types/resource';
import { getRouteId, modifyChunks } from '@/utils/utils';
import { Modal } from 'antd';
import { debounce } from 'lodash';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router-dom';

// 文件数据管理 Hook
const useFileData = (
  repoId: string,
  fileId: string | null,
  statusMap: Record<string, string>
): {
  fileList: FileItem[];
  setFileList: (fileList: FileItem[]) => void;
  fileInfo: FileInfoV2;
  setFileInfo: (fileInfo: FileInfoV2) => void;
  parameters: FileSummaryResponse;
  setParameters: (parameters: FileSummaryResponse) => void;
  getFiles: () => void;
  getFileInfo: () => void;
  otherFiles: FileItem[];
  fileStatusMsg: string | null | undefined;
} => {
  const location = useLocation();
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [fileInfo, setFileInfo] = useState<FileInfoV2>({} as FileInfoV2);
  const [parameters, setParameters] = useState<FileSummaryResponse>(
    {} as FileSummaryResponse
  );

  const getFiles = useCallback((): void => {
    getFileList(repoId).then(data => {
      setFileList(data);
    });
  }, [repoId]);

  const getFileInfo = useCallback((): void => {
    const params = {
      tag: 'CBG-RAG',
      fileIds: [fileId || ''],
    };
    getFileSummary(params).then(data => {
      setFileInfo((data.fileInfoV2 || {}) as FileInfoV2);
      setParameters(data);
    });
  }, [fileId]);

  const otherFiles = useMemo(() => {
    return fileList.filter(item => item.id != fileId);
  }, [fileList, fileId]);

  const fileStatusMsg = useMemo(() => {
    if (!fileInfo) return null;
    const status = fileInfo.status;
    return statusMap[status as unknown as keyof typeof statusMap];
  }, [fileInfo, statusMap]);

  useEffect(() => {
    getFiles();
  }, [getFiles]);

  useEffect(() => {
    getFileInfo();
  }, [location, getFileInfo]);

  return {
    fileList,
    setFileList,
    fileInfo,
    setFileInfo,
    parameters,
    setParameters,
    getFiles,
    getFileInfo,
    otherFiles,
    fileStatusMsg,
  };
};

// Chunks 数据管理 Hook
const useFileChunks = (
  fileId: string | null,
  getFileInfo: () => void
): {
  chunks: Chunk[];
  setChunks: (chunks: Chunk[]) => void;
  pageNumber: number;
  setPageNumber: React.Dispatch<React.SetStateAction<number>>;
  hasMore: boolean;
  setHasMore: React.Dispatch<React.SetStateAction<boolean>>;
  searchValue: string;

  violationTotal: number;
  setViolationTotal: React.Dispatch<React.SetStateAction<number>>;
  isViolation: boolean;

  loadingData: boolean;
  setLoadingData: React.Dispatch<React.SetStateAction<boolean>>;
  currentChunk: Chunk;
  setCurrentChunk: React.Dispatch<React.SetStateAction<Chunk>>;
  fetchData: (value?: string) => void;
  moreData: () => void;
  handleScroll: () => void;
  fetchDataDebounce: (e: React.ChangeEvent<HTMLInputElement>) => void;
  enableChunk: (record: Chunk, checked: boolean) => void;
  resetKnowledge: () => void;
  chunkRef: React.RefObject<HTMLDivElement>;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  setIsViolation: React.Dispatch<React.SetStateAction<boolean>>;
} => {
  const location = useLocation();
  const chunkRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<boolean>(false);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [violationTotal, setViolationTotal] = useState(0);
  const [isViolation, setIsViolation] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [currentChunk, setCurrentChunk] = useState<Chunk>({} as Chunk);

  const fetchData = useCallback(
    (value?: string): void => {
      loadingRef.current = true;
      setLoadingData(true);
      setChunks([]);
      if (chunkRef.current) {
        chunkRef.current.scrollTop = 0;
      }
      const params: ListKnowledgeParams = {
        fileIds: [fileId || ''],
        pageNo: 1,
        pageSize: 20,
        query: value !== undefined ? value?.trim() : searchValue,
      };
      if (isViolation) params.auditType = 1;
      listKnowledgeByPage(params)
        .then(data => {
          const newChunks = modifyChunks(data.pageData || []);
          setPageNumber(2);
          setChunks(() => newChunks);
          if (data.totalCount > 20) {
            setHasMore(true);
          } else {
            setHasMore(false);
          }
          setViolationTotal((data.extMap?.auditBlockCount as number) || 0);
        })
        .finally(() => {
          loadingRef.current = false;
          setLoadingData(false);
        });
    },
    [fileId, searchValue, isViolation]
  );

  const moreData = useCallback((): void => {
    loadingRef.current = true;
    setLoadingData(true);

    const params = {
      fileIds: [fileId || ''],
      pageNo: pageNumber,
      pageSize: 20,
      query: searchValue,
    };
    listKnowledgeByPage(params)
      .then(data => {
        const newChunks = modifyChunks(data.pageData || []);
        if (data.totalCount > chunks.length + 20) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
        setPageNumber(number => number + 1);
        setChunks(prevItems => [...prevItems, ...newChunks]);
        setViolationTotal((data.extMap?.auditBlockCount as number) || 0);
      })
      .finally(() => {
        loadingRef.current = false;
        setLoadingData(false);
      });
  }, [fileId, pageNumber, searchValue, chunks.length]);

  const handleScroll = useCallback((): void => {
    const element = chunkRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;

    if (
      scrollTop + clientHeight >= scrollHeight - 10 &&
      !loadingRef.current &&
      hasMore
    ) {
      moreData();
    }
  }, [hasMore, moreData]);

  const fetchDataDebounce = useCallback(
    debounce((e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      fetchData(value);
    }, 500),
    [fetchData]
  );

  const enableChunk = useCallback(
    (record: Chunk, checked: boolean): void => {
      const findChunk =
        chunks.find(item => item.id === record.id) || ({} as Chunk);
      findChunk.enabled = checked;
      setChunks([...chunks]);
      const params = {
        id: record.id,
        enabled: checked ? 1 : 0,
      };
      enableKnowledgeAPI(params).then(data => {
        if (checked) {
          findChunk.id = data;
          setChunks([...chunks]);
        }
      });
    },
    [chunks]
  );

  const resetKnowledge = useCallback((): void => {
    fetchData();
    getFileInfo();
  }, [fetchData, getFileInfo]);

  useEffect(() => {
    fetchData();
  }, [isViolation, location, fetchData]);

  return {
    chunks,
    setChunks,
    pageNumber,
    setPageNumber,
    hasMore,
    setHasMore,
    searchValue,
    setSearchValue,
    violationTotal,
    setViolationTotal,
    isViolation,
    setIsViolation,
    loadingData,
    setLoadingData,
    currentChunk,
    setCurrentChunk,
    fetchData,
    moreData,
    handleScroll,
    fetchDataDebounce,
    enableChunk,
    resetKnowledge,
    chunkRef,
  };
};

// 模态框状态管理 Hook
const useFileModals = (): {
  editModal: boolean;
  setEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  addModal: boolean;
  setAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  deleteModal: boolean;
  setDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  showParameter: boolean;
  setShowParameter: React.Dispatch<React.SetStateAction<boolean>>;
  showMore: boolean;
  setShowMore: React.Dispatch<React.SetStateAction<boolean>>;
  moreTagsId: string[];
  setMoreTagsId: React.Dispatch<React.SetStateAction<string[]>>;
  clickOutside: () => void;
} => {
  const [editModal, setEditModal] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [showParameter, setShowParameter] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [moreTagsId, setMoreTagsId] = useState<string[]>([]);

  const clickOutside = useCallback((): void => {
    setShowMore(false);
  }, []);

  useEffect(() => {
    document.documentElement.addEventListener('click', clickOutside);
    return (): void =>
      document.documentElement.removeEventListener('click', clickOutside);
  }, [clickOutside]);

  return {
    editModal,
    setEditModal,
    addModal,
    setAddModal,
    deleteModal,
    setDeleteModal,
    showParameter,
    setShowParameter,
    showMore,
    setShowMore,
    moreTagsId,
    setMoreTagsId,
    clickOutside,
  };
};

// 文件操作 Hook
const useFileActions = (
  fileInfo: FileInfoV2,
  parameters: FileSummaryResponse,
  fileStatusMsg: string | null | undefined,
  getFileInfo: () => void,
  fetchData: (value?: string) => void
): {
  onEnable: () => Promise<string>;
  showConfirmModal: () => void;
  handleValidateWorkflow: () => void;
  handleEnableFile: () => void;
} => {
  const { t } = useTranslation();
  const repoId = getRouteId() as string;

  const onEnable = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const enable = !!fileInfo.enabled;
      enableFlieAPI({
        id: parameters?.fileDirectoryTreeId || 0,
        enabled: enable ? 0 : 1,
      })
        .then(() => {
          getFileInfo();
          fetchData();
          resolve('');
        })
        .catch(error => reject(error));
    });
  }, [
    fileInfo.enabled,
    parameters?.fileDirectoryTreeId,
    getFileInfo,
    fetchData,
  ]);

  const showConfirmModal = useCallback((): void => {
    Modal.confirm({
      title: t('knowledge.confirmDisabled'),
      icon: null,
      content: '',
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      centered: true,
      autoFocusButton: null,
      onOk() {
        return onEnable();
      },
    });
  }, [t, onEnable]);

  const handleValidateWorkflow = useCallback((): void => {
    getRepoUseStatus({ repoId }).then(status => {
      if (status) {
        showConfirmModal();
      } else {
        onEnable();
      }
    });
  }, [repoId, showConfirmModal, onEnable]);

  const handleEnableFile = useCallback((): void => {
    if (fileStatusMsg !== 'success') return;
    const enable = !!fileInfo.enabled;
    if (enable) {
      handleValidateWorkflow();
      return;
    }
    onEnable();
  }, [fileStatusMsg, fileInfo.enabled, handleValidateWorkflow, onEnable]);

  return {
    onEnable,
    showConfirmModal,
    handleValidateWorkflow,
    handleEnableFile,
  };
};

export const useFilePage = ({
  statusMap,
}: {
  statusMap: Record<string, string>;
}): {
  fileList: FileItem[];
  setFileList: (fileList: FileItem[]) => void;
  fileInfo: FileInfoV2;
  setFileInfo: (fileInfo: FileInfoV2) => void;
  parameters: FileSummaryResponse;
  setParameters: (parameters: FileSummaryResponse) => void;
  getFiles: () => void;
  getFileInfo: () => void;
  otherFiles: FileItem[];
  fileStatusMsg: string | null | undefined;
  searchRef: React.RefObject<HTMLInputElement>;
  pid: string | null;
  tag: string | null;
  resetKnowledge: () => void;
  currentChunk: Chunk;
  setCurrentChunk: React.Dispatch<React.SetStateAction<Chunk>>;
  enableChunk: (record: Chunk, checked: boolean) => void;
  fetchData: (value?: string) => void;
  moreData: () => void;
  handleScroll: () => void;
  fetchDataDebounce: (e: React.ChangeEvent<HTMLInputElement>) => void;
  editModal: boolean;
  setEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  addModal: boolean;
  setAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  deleteModal: boolean;
  setDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  showParameter: boolean;
  setShowParameter: React.Dispatch<React.SetStateAction<boolean>>;
  showMore: boolean;
  setShowMore: React.Dispatch<React.SetStateAction<boolean>>;
  moreTagsId: string[];
  setMoreTagsId: React.Dispatch<React.SetStateAction<string[]>>;
  clickOutside: () => void;
  onEnable: () => Promise<string>;
  showConfirmModal: () => void;
  handleValidateWorkflow: () => void;
  handleEnableFile: () => void;
  fileId: string | null;
  repoId: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  setIsViolation: React.Dispatch<React.SetStateAction<boolean>>;

  violationTotal: number;
  chunkRef: React.RefObject<HTMLDivElement>;

  loadingData: boolean;
  isViolation: boolean;
  chunks: Chunk[];
} => {
  const searchRef = useRef<HTMLInputElement | null>(null);
  const repoId = getRouteId() as string;
  const [searchParams] = useSearchParams();
  const pid = searchParams.get('parentId');
  const fileId = searchParams.get('fileId');
  const tag = searchParams.get('tag');

  const fileData = useFileData(repoId, fileId, statusMap);
  const fileChunks = useFileChunks(fileId, fileData.getFileInfo);
  const fileModals = useFileModals();
  const fileActions = useFileActions(
    fileData.fileInfo,
    fileData.parameters,
    fileData.fileStatusMsg,
    fileData.getFileInfo,
    fileChunks.fetchData
  );

  return {
    // 文件数据相关
    ...fileData,
    // Chunks 相关
    ...fileChunks,
    // 模态框相关
    ...fileModals,
    // 文件操作相关
    ...fileActions,
    // 其他
    searchRef,
    pid,
    tag,
    fileId,
    repoId,
  };
};
