import {
  enableFlieAPI,
  getRepoUseStatus,
  listFileDirectoryTree,
  queryFileList,
  retry,
} from '@/services/knowledge';
import { FileDirectoryTreeResponse, FileItem } from '@/types/resource';
import { fileType } from '@/utils/utils';
import { useDebounceFn, useRequest } from 'ahooks';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { debounce } from 'lodash';
import { Modal } from 'antd';
import { getFixedUrl } from '@/components/workflow/utils';

// 文档数据管理 Hook
const useDocumentData = ({
  tag,
  repoId,
  pid,
  parentId,
  pagination,
  setPagination,
  setLoading,
}: {
  tag: string;
  repoId: number | string;
  pid: number;
  parentId: number | string | null;
  pagination: { current: number; pageSize: number; total: number };
  setPagination: React.Dispatch<
    React.SetStateAction<{ current: number; pageSize: number; total: number }>
  >;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}): {
  dataResource: FileItem[];
  setDataResource: React.Dispatch<React.SetStateAction<FileItem[]>>;
  directoryTree: FileDirectoryTreeResponse[];
  getDirectoryTree: () => void;
  requestRun: () => void;
  cancel: () => void;
  getFiles: () => void;
} => {
  const navigate = useNavigate();
  const [dataResource, setDataResource] = useState<FileItem[]>([]);
  const [directoryTree, setDirectoryTree] = useState<
    FileDirectoryTreeResponse[]
  >([]);

  const getDirectoryTree = useCallback((): void => {
    const params = {
      fileId: parentId || '',
      repoId,
    };
    listFileDirectoryTree(params).then(data => {
      setDirectoryTree(data);
    });
  }, [parentId, repoId]);

  const getFiles = useCallback(async (): Promise<void> => {
    setLoading(true);
    const params = {
      tag,
      parentId: parentId || pid,
      repoId,
      pageNo: pagination.current,
      pageSize: pagination.pageSize,
    };
    const data = await queryFileList(params).finally(() => setLoading(false));
    const files = data.pageData?.map((item: FileItem) => ({
      ...item,
      type: fileType(item),
      size: item.fileInfoV2?.size,
      tagDtoList: item.tagDtoList,
    }));
    setDataResource(files as FileItem[]);
    setPagination(prevPagination => ({
      ...prevPagination,
      total: data.totalCount,
    }));
  }, [
    tag,
    parentId,
    pid,
    repoId,
    pagination.current,
    pagination.pageSize,
    setLoading,
    setPagination,
  ]);

  const { run: requestRun, cancel } = useRequest(getFiles, {
    manual: true,
    pollingInterval: 15000,
    pollingWhenHidden: false,
    pollingErrorRetryCount: 3,
    refreshOnWindowFocus: false,
  });

  useEffect(() => {
    parentId && requestRun();
  }, [navigate, parentId, requestRun]);

  useEffect(() => {
    cancel();
    requestRun();
  }, [pagination.current, pagination.pageSize, cancel, requestRun]);

  useEffect(() => {
    parentId && getDirectoryTree();
  }, [parentId, getDirectoryTree]);

  return {
    dataResource,
    setDataResource,
    directoryTree,
    getDirectoryTree,
    requestRun,
    cancel,
    getFiles,
  };
};

// 搜索功能 Hook
const useDocumentSearch = ({
  tag,
  repoId,
  parentId,
  requestRun,
  cancel,
  setLoading,
}: {
  tag: string;
  repoId: number | string;
  parentId: number | string | null;
  requestRun: () => void;
  cancel: () => void;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}): {
  searchValue: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  searchData: FileItem[];
  setSearchData: React.Dispatch<React.SetStateAction<FileItem[]>>;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  requestSearchFilesRun: (value: string) => void;
} => {
  const [searchValue, setSearchValue] = useState('');
  const [searchData, setSearchData] = useState<FileItem[]>([]);
  const controllerRef = useRef<AbortController | null>(null);

  const connectToSSE = useCallback(
    async (searchValue: string): Promise<void> => {
      setSearchData([]);
      setLoading(true);
      if (controllerRef.current) {
        controllerRef.current?.abort();
        controllerRef.current = null;
      }
      controllerRef.current = new AbortController();

      // 获取访问令牌
      const accessToken = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      await fetchEventSource(
        `${getFixedUrl('/file/search-file')}?fileName=${encodeURIComponent(
          searchValue
        )}&repoId=${repoId}&pid=${parentId}&tag=${tag}`,
        {
          signal: controllerRef?.current?.signal,
          headers,
          async onopen(response) {
            if (response.ok) {
              setLoading(false);
            } else {
              throw new Error(`Failed to establish SSE connection`);
            }
          },
          onmessage(event) {
            if (event.data === 'bye') {
              controllerRef.current?.abort();
              controllerRef.current = null;
              return;
            }
            const item = JSON.parse(event.data);
            item.type = fileType(item);
            const regexPattern = new RegExp(searchValue, 'gi');
            item.name = item.name.replaceAll(
              regexPattern,
              '<span style="color:#6356EA;font-weight:600;display:inline-block;padding:4px 0px;background:#dee2f9">$&</span>'
            );

            setSearchData(resultList => [...resultList, item]);
          },
          onerror(error) {
            setLoading(false);
            controllerRef.current?.abort();
            controllerRef.current = null;
          },
          openWhenHidden: true,
        }
      );
    },
    [tag, repoId, parentId, setLoading]
  );

  const { run: requestSearchFilesRun, cancel: searchRunCancel } = useRequest(
    connectToSSE,
    {
      manual: true,
      pollingInterval: 15000,
      pollingWhenHidden: false,
      pollingErrorRetryCount: 3,
      refreshOnWindowFocus: false,
    }
  );

  const searchFileDebounce = useCallback(
    debounce((value: string) => {
      if (value) {
        cancel();
        requestSearchFilesRun(value);
      } else {
        searchRunCancel();
        requestRun();
      }
    }, 500),
    [
      repoId,
      parentId,
      cancel,
      requestSearchFilesRun,
      searchRunCancel,
      requestRun,
    ]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchValue(value);
      searchFileDebounce(value);
    },
    [searchFileDebounce]
  );

  return {
    searchValue,
    setSearchValue,
    searchData,
    setSearchData,
    handleInputChange,
    requestSearchFilesRun,
  };
};

// 模态框状态管理 Hook
const useDocumentModals = (): {
  addFolderModal: boolean;
  setAddFolderModal: React.Dispatch<React.SetStateAction<boolean>>;
  deleteModal: boolean;
  setDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  tagsModal: boolean;
  setTagsModal: React.Dispatch<React.SetStateAction<boolean>>;
  currentFile: FileItem;
  setCurrentFile: React.Dispatch<React.SetStateAction<FileItem>>;
  modalType: string;
  setModalType: React.Dispatch<React.SetStateAction<string>>;
} => {
  const [addFolderModal, setAddFolderModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [tagsModal, setTagsModal] = useState(false);
  const [currentFile, setCurrentFile] = useState<FileItem>({} as FileItem);
  const [modalType, setModalType] = useState('create');

  return {
    addFolderModal,
    setAddFolderModal,
    deleteModal,
    setDeleteModal,
    tagsModal,
    setTagsModal,
    currentFile,
    setCurrentFile,
    modalType,
    setModalType,
  };
};

// 文件操作 Hook
const useDocumentActions = ({
  tag,
  searchValue,
  searchData,
  setSearchData,
  setDataResource,
  requestRun,
  requestSearchFilesRun,
  setLoading,
}: {
  tag: string;
  searchValue: string;
  searchData: FileItem[];
  setSearchData: React.Dispatch<React.SetStateAction<FileItem[]>>;
  setDataResource: React.Dispatch<React.SetStateAction<FileItem[]>>;
  requestRun: () => void;
  requestSearchFilesRun: (value: string) => void;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}): {
  enableFile: (record: FileItem) => void;
  retrySegmentation: (record: FileItem) => void;
  showConfirmModal: (record: FileItem) => void;
  handleValidateWorkflow: (record: FileItem) => void;
  run: (record: FileItem) => void;
} => {
  const { t } = useTranslation();

  const enableFile = useCallback(
    (record: FileItem): void => {
      const enabled = record.fileInfoV2?.enabled ? 0 : 1;
      const params = {
        id: record.id,
        enabled,
      };
      enableFlieAPI(params).then(() => {
        if (searchValue) {
          setSearchData(files => {
            const currentFile = searchData.find(item => item.id === record.id);
            if (currentFile?.fileInfoV2) {
              currentFile.fileInfoV2.enabled = enabled;
            }
            return [...files];
          });
        } else {
          setDataResource(files => {
            const currentFile = files.find(item => item.id === record.id);
            if (currentFile?.fileInfoV2) {
              currentFile.fileInfoV2.enabled = enabled;
            }
            return [...files];
          });
        }
      });
    },
    [searchValue, searchData, setSearchData, setDataResource]
  );

  const retrySegmentation = useCallback(
    (record: FileItem): void => {
      setLoading(true);
      const { fileInfoV2, fileId } = record;
      const params = {
        sliceConfig: fileInfoV2.sliceConfig
          ? JSON.parse(fileInfoV2.sliceConfig)
          : {},
        fileIds: [fileId],
        tag,
      };
      retry(params)
        .then(() => {
          if (searchValue) {
            requestSearchFilesRun(searchValue);
          } else {
            requestRun();
          }
        })
        .catch(() => {
          setLoading(false);
        });
    },
    [tag, searchValue, requestSearchFilesRun, requestRun, setLoading]
  );

  const showConfirmModal = useCallback(
    (record: FileItem): void => {
      Modal.confirm({
        title: t('knowledge.confirmDisabled'),
        icon: null,
        content: '',
        okText: t('common.confirm'),
        cancelText: t('common.cancel'),
        centered: true,
        autoFocusButton: null,
        onOk() {
          return enableFile(record);
        },
      });
    },
    [t, enableFile]
  );

  const handleValidateWorkflow = useCallback(
    (record: FileItem): void => {
      getRepoUseStatus({ repoId: record.appId || '' }).then(status => {
        if (status) {
          showConfirmModal(record);
        } else {
          enableFile(record);
        }
      });
    },
    [showConfirmModal, enableFile]
  );

  const { run } = useDebounceFn(
    (record: FileItem) => {
      const enable = !!record.fileInfoV2?.enabled;
      if (enable) {
        handleValidateWorkflow(record);
      } else {
        enableFile(record);
      }
    },
    { wait: 1000, leading: true, trailing: false }
  );

  return {
    enableFile,
    retrySegmentation,
    showConfirmModal,
    handleValidateWorkflow,
    run,
  };
};

// 分页和导航 Hook
const useDocumentPagination = ({
  tag,
  repoId,
  pid,
  setParentId,
  pagination,
  setPagination,
  setSearchValue,
}: {
  tag: string;
  repoId: number | string;
  pid: number;
  setParentId: React.Dispatch<React.SetStateAction<number | string | null>>;
  pagination: { current: number; pageSize: number; total: number };
  setPagination: React.Dispatch<
    React.SetStateAction<{ current: number; pageSize: number; total: number }>
  >;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
}): {
  handleRowClick: (record: FileItem) => void;
  rowProps: (record: FileItem) => { onClick?: () => void } | {};
  handleTableChange: (page: number, pageSize: number) => void;
} => {
  const navigate = useNavigate();

  const handleRowClick = useCallback(
    (record: FileItem): void => {
      if (record.isFile) {
        navigate(
          `/resource/knowledge/detail/${repoId}/file?parentId=${pid}&fileId=${record.fileId}&tag=${tag}`
        );
      } else {
        setParentId(record.id);
        setPagination(prevPagination => ({
          ...prevPagination,
          current: 1,
        }));
        setSearchValue('');
      }
    },
    [navigate, repoId, pid, tag, setParentId, setPagination, setSearchValue]
  );

  const rowProps = useCallback(
    (record: FileItem): { onClick?: () => void } | {} => {
      return tag !== 'SparkDesk-RAG'
        ? {
            onClick: () => handleRowClick(record),
          }
        : {};
    },
    [tag, handleRowClick]
  );

  const handleTableChange = useCallback(
    (page: number, pageSize: number): void => {
      pagination.current = page;
      pagination.pageSize = pageSize;
      setPagination({ ...pagination });
    },
    [pagination, setPagination]
  );

  return {
    handleRowClick,
    rowProps,
    handleTableChange,
  };
};

// UI 相关 Hook
const useDocumentUI = (
  tag: string
): {
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  allowUploadFileContent: string;
  clickOutside: (event: MouseEvent) => void;
  optionsRef: React.RefObject<HTMLDivElement>;
} => {
  const { t } = useTranslation();
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);

  const allowUploadFileContent = useMemo(() => {
    return tag === 'AIUI-RAG2'
      ? t('knowledge.xingchenFormatSupport')
      : t('knowledge.sparkFormatSupport');
  }, [tag, t]);

  const clickOutside = useCallback((event: MouseEvent): void => {
    if (
      optionsRef.current &&
      !optionsRef.current.contains(event.target as Node)
    ) {
      // setOptionsId('');
    }
  }, []);

  useEffect(() => {
    document.body.addEventListener('click', clickOutside);
    return (): void => document.body.removeEventListener('click', clickOutside);
  }, [clickOutside]);

  return {
    loading,
    setLoading,
    allowUploadFileContent,
    clickOutside,
    optionsRef,
  };
};

export const useDocumentPage = ({
  tag,
  repoId,
  pid,
}: {
  tag: string;
  repoId: number | string;
  pid: number;
}): {
  run: (record: FileItem) => void;
  retrySegmentation: (record: FileItem) => void;
  showConfirmModal: (record: FileItem) => void;
  handleValidateWorkflow: (record: FileItem) => void;
  dataResource: FileItem[];
  directoryTree: FileDirectoryTreeResponse[];
  addFolderModal: boolean;
  setAddFolderModal: React.Dispatch<React.SetStateAction<boolean>>;
  deleteModal: boolean;
  setDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  tagsModal: boolean;
  setTagsModal: React.Dispatch<React.SetStateAction<boolean>>;
  currentFile: FileItem;
  setCurrentFile: React.Dispatch<React.SetStateAction<FileItem>>;
  modalType: string;
  setModalType: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  allowUploadFileContent: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  rowProps: (record: FileItem) => { onClick?: () => void } | {};
  handleTableChange: (page: number, pageSize: number) => void;
  parentId: number | string | null;
  setParentId: React.Dispatch<React.SetStateAction<number | string | null>>;
  pagination: { current: number; pageSize: number; total: number };
  setPagination: React.Dispatch<
    React.SetStateAction<{ current: number; pageSize: number; total: number }>
  >;
  searchValue: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  searchData: FileItem[];
  getFiles: () => void;
} => {
  const navigate = useNavigate();
  const [parentId, setParentId] = useState<number | string | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const ui = useDocumentUI(tag);
  const documentData = useDocumentData({
    tag,
    repoId,
    pid,
    parentId,
    pagination,
    setPagination,
    setLoading: ui.setLoading,
  });
  const search = useDocumentSearch({
    tag,
    repoId,
    parentId,
    requestRun: documentData.requestRun,
    cancel: documentData.cancel,
    setLoading: ui.setLoading,
  });
  const modals = useDocumentModals();
  const actions = useDocumentActions({
    tag,
    searchValue: search.searchValue,
    searchData: search.searchData,
    setSearchData: search.setSearchData,
    setDataResource: documentData.setDataResource,
    requestRun: documentData.requestRun,
    requestSearchFilesRun: search.requestSearchFilesRun,
    setLoading: ui.setLoading,
  });
  const paginationHooks = useDocumentPagination({
    tag,
    repoId,
    pid,
    setParentId,
    pagination,
    setPagination,
    setSearchValue: search.setSearchValue,
  });

  useEffect(() => {
    setParentId(pid);
  }, [navigate, pid]);

  return {
    // 文件操作相关
    run: actions.run,
    retrySegmentation: actions.retrySegmentation,
    showConfirmModal: actions.showConfirmModal,
    handleValidateWorkflow: actions.handleValidateWorkflow,
    // 数据相关
    dataResource: documentData.dataResource,
    directoryTree: documentData.directoryTree,
    // 模态框相关
    ...modals,
    // UI 相关
    loading: ui.loading,
    allowUploadFileContent: ui.allowUploadFileContent,
    // 搜索相关
    handleInputChange: search.handleInputChange,
    // 分页和导航相关
    rowProps: paginationHooks.rowProps,
    handleTableChange: paginationHooks.handleTableChange,
    parentId,
    setParentId,
    pagination,
    setPagination,
    searchValue: search.searchValue,
    setSearchValue: search.setSearchValue,
    searchData: search.searchData,
    getFiles: documentData.getFiles,
  };
};
