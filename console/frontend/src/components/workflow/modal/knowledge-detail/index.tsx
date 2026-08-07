import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import {
  getKnowledgeDetail,
  queryFileList,
  getFileList,
  getFileSummary,
  listKnowledgeByPage,
  enableKnowledgeAPI,
  enableFlieAPI,
  listFileDirectoryTree,
} from '@/services/knowledge';
import { modifyChunks } from '@/utils';
import { debounce, cloneDeep } from 'lodash';
import { fileType, generateType } from '@/utils';
import { useTranslation } from 'react-i18next';
import {
  Input,
  Button,
  Tooltip,
  Table,
  Pagination,
  Spin,
  Switch,
  TableColumnsType,
} from 'antd';
import { typeList } from '@/constants';
import { useMemoizedFn } from 'ahooks';
import { generateKnowledgeOutput } from '@/components/workflow/utils/reactflowUtils';
import MarkdownRender from '@/components/markdown-render';
import {
  KnowledgeDetailProps,
  EditChunkProps,
  FileDetailProps,
  KnowledgeFileItem,
  DirectoryItem,
  PaginationState,
  KnowledgeDetailModalInfo,
  FileInfo,
  ChunkItem,
  useKnowledgeDetailProps,
  useFileDetailProps,
} from '@/components/workflow/types';
import { Icons } from '@/components/workflow/icons';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { getFixedUrl, getAuthorization } from '@/components/workflow/utils';

function KnowledgePreviewModal(): React.ReactElement {
  const knowledgeDetailModalOpen = useFlowsManager(
    state => state.knowledgeDetailModalInfo?.open
  );
  const [currentTab, setCurrentTab] = useState('knowledge');
  const [parentId, setParentId] = useState(-1);
  const [fileId, setFileId] = useState(-1);

  return (
    <>
      {knowledgeDetailModalOpen
        ? createPortal(
            <div
              className="mask"
              style={{
                zIndex: 1002,
              }}
              onClick={e => e?.stopPropagation()}
              onKeyDown={e => e?.stopPropagation()}
            >
              <div className="p-6 pr-0 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md min-w-[820px] h-[80vh] flex flex-col w-3/4">
                {currentTab === 'knowledge' && (
                  <KnowledgeDetail
                    parentId={parentId}
                    setParentId={setParentId}
                    setCurrentTab={setCurrentTab}
                    setFileId={setFileId}
                  />
                )}
                {currentTab === 'file' && (
                  <FileDetail
                    fileId={fileId}
                    setCurrentTab={setCurrentTab}
                    setFileId={setFileId}
                  />
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

const KnowledgeHeader = ({
  knowledgeDetail,
  setKnowledgeDetailModalInfo,
}): React.ReactElement => {
  return (
    <div className="flex items-center justify-between font-medium pr-6">
      <div className="flex items-center gap-2">
        <img src={Icons.knowledgeDetail.folder} className="w-8 h-8" alt="" />
        <span className="font-semibold">{knowledgeDetail.name}</span>
      </div>
      <img
        src={Icons.knowledgeDetail.close}
        className="w-3 h-3 cursor-pointer"
        alt=""
        onClick={() =>
          setKnowledgeDetailModalInfo({
            open: false,
            nodeId: '',
            repoId: '',
          })
        }
      />
    </div>
  );
};

const KnowledgeToolbar = ({
  isPro,
  id,
  directoryTree,
  setParentId,
  pagination,
  searchValue,
  handleInputChange,
  checkedIds,
  repoId,
  knowledgeDetailModalInfo,
  ragType,
  tag,
}): React.ReactElement => {
  const { t } = useTranslation();
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const setNode = currentStore(state => state.setNode);
  const checkNode = currentStore(state => state.checkNode);
  const handleKnowledgesChange = useMemoizedFn((knowledge: unknown): void => {
    autoSaveCurrentFlow();
    if (isPro) {
      setNode(id, old => {
        const findKnowledgeIndex = old.data.nodeParam.repoList?.findIndex(
          item => item.id === knowledge.id
        );
        if (findKnowledgeIndex === -1) {
          old.data.nodeParam.repoIds.push(
            knowledge.coreRepoId || knowledge.outerRepoId
          );
          old.data.nodeParam.repoList.push(knowledge);
        } else {
          old.data.nodeParam.repoIds.splice(findKnowledgeIndex, 1);
          old.data.nodeParam.repoList.splice(findKnowledgeIndex, 1);
        }
        if (knowledge?.tag === 'CBG-RAG') {
          old.data.nodeParam.repoType = 2;
        } else {
          old.data.nodeParam.repoType = 3;
        }
        return {
          ...cloneDeep(old),
        };
      });
    } else {
      setNode(id, old => {
        const findKnowledgeIndex = old.data.nodeParam.repoList?.findIndex(
          item => item.id === knowledge.id
        );
        if (findKnowledgeIndex === -1) {
          old.data.nodeParam.repoId.push(
            knowledge.coreRepoId || knowledge.outerRepoId
          );
          old.data.nodeParam.repoList.push(knowledge);
        } else {
          old.data.nodeParam.repoId.splice(findKnowledgeIndex, 1);
          old.data.nodeParam.repoList.splice(findKnowledgeIndex, 1);
        }
        old.data.nodeParam.ragType = knowledge?.tag;
        old.data.outputs = generateKnowledgeOutput(knowledge?.tag);
        return {
          ...cloneDeep(old),
        };
      });
    }
    checkNode(id);
    canPublishSetNot();
  });
  return (
    <div className="mt-6 flex items-center justify-between pr-6">
      <div className="flex items-center">
        {directoryTree.length > 0 && (
          <div className="flex mr-4">
            <img
              src={Icons.knowledgeDetail.folder}
              className="w-[22px] h-[22px] mr-2"
              alt=""
            />
            {directoryTree.map((item: unknown, index) => (
              <span key={index} className="flex items-center">
                <span
                  title={item.name}
                  className="max-w-[100px] text-overflow cursor-pointer"
                  onClick={() => setParentId(item.parentId)}
                >
                  {item.name}
                </span>
                {index !== directoryTree.length - 1 && <span>/</span>}
              </span>
            ))}
            <span className="bg-[#F0F3F9] rounded-md py-1 px-2 text-desc ml-2">
              {pagination.total}
              {t('knowledge.items')}
            </span>
          </div>
        )}
        <div className="relative">
          <img
            src={Icons.knowledgeDetail.search}
            className="w-4 h-4 absolute left-[14px] top-[13px] z-10"
            alt=""
          />
          <Input
            className="global-input w-[320px] pl-10"
            placeholder={t('knowledge.pleaseEnter')}
            value={searchValue}
            onChange={handleInputChange}
          />
        </div>
      </div>
      <Tooltip
        overlayClassName="black-tooltip"
        title={t('workflow.nodes.relatedKnowledgeModal.knowledgeTypeTip')}
      >
        {checkedIds.includes(repoId) ? (
          <Button
            type="primary"
            onClick={() => {
              handleKnowledgesChange(knowledgeDetailModalInfo);
            }}
          >
            {t('workflow.nodes.relatedKnowledgeModal.remove')}
          </Button>
        ) : (
          <Button
            disabled={ragType && tag !== ragType}
            type="primary"
            onClick={() => {
              handleKnowledgesChange(knowledgeDetailModalInfo);
            }}
          >
            {t('workflow.nodes.relatedKnowledgeModal.add')}
          </Button>
        )}
      </Tooltip>
    </div>
  );
};

const KnowledgeSkeleton = (): React.ReactElement => {
  return (
    <div className="w-full">
      <div className="w-full h-[50px] bg-[#f9fafb] flex items-center">
        <div className="w-1/3 flex pl-5">
          <div className="w-[80px] h-[20px] bg-[#f4f5fa] rounded-2xl"></div>
        </div>
        <div className="flex-1 pl-5">
          <div className="w-[80px] h-[20px] bg-[#f4f5fa] rounded-2xl"></div>
        </div>
      </div>
      <div className="w-full h-[80px] bg-[#ffffff] flex items-center">
        <div className="w-1/3 flex pl-5">
          <div className="w-[240px] h-[20px] bg-[#f7f8fc] rounded-2xl"></div>
        </div>
        <div className="flex-1 pl-5">
          <div className="w-[240px] h-[20px] bg-[#f7f8fc] rounded-2xl"></div>
        </div>
      </div>
    </div>
  );
};

const KnowledgeTable = ({
  searchValue,
  setSearchData,
  setDataResource,
  setCurrentTab,
  setFileId,
  setPagination,
  setSearchValue,
  tag,
  pagination,
  searchData,
  dataResource,
  setParentId,
}): React.ReactElement => {
  const { t } = useTranslation();
  const columns: TableColumnsType<KnowledgeFileItem> = [
    {
      title: t('knowledge.fileName'),
      dataIndex: 'name',
      key: 'name',
      render: (name, record): React.ReactElement => {
        return (
          <div className="flex items-center">
            {record.type === 'folder' ? (
              <img src={typeList.get(record.type)} className="w-10 h-10" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#F0F3F9] flex justify-center items-center">
                <img
                  src={typeList.get(
                    generateType((record.type || '').toLowerCase()) || 'default'
                  )}
                  className="w-[22px] h-[22px]"
                  alt=""
                />
              </div>
            )}
            <span
              className="text-second font-medium ml-1.5 text-overflow max-w-[500px]"
              title={name}
              dangerouslySetInnerHTML={{ __html: name }}
            ></span>
            {record.type === 'folder' && (
              <img
                src={Icons.knowledgeDetail.rightarow}
                className="w-5 h-5 ml-1"
                alt=""
              />
            )}
          </div>
        );
      },
    },
    {
      width: 100,
      title: t('knowledge.characterCount'),
      dataIndex: 'number',
      key: 'number',
      render: (_, record): string | undefined => {
        return record.isFile ? record.fileInfoV2?.charCount : undefined;
      },
    },
    {
      width: 100,
      title: t('knowledge.hitCount'),
      dataIndex: 'hitCount',
      key: 'hitCount',
      render: (hitCount): React.ReactElement => {
        return (
          <div style={{ color: hitCount ? '#2f2f2f' : '#a4a4a4' }}>
            {hitCount}
          </div>
        );
      },
    },
    {
      width: 180,
      title: t('knowledge.uploadTime'),
      dataIndex: 'createTime',
      key: 'createTime',
    },
    {
      width: 100,
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled, item): React.ReactElement | null => {
        return item.isFile ? (
          <Switch
            disabled={['block', 'review'].includes(item.auditSuggest || '')}
            size="small"
            checked={item.fileInfoV2?.enabled}
            onChange={(checked, event) => enableFile(item, event)}
            className="list-switch ml-4"
          />
        ) : null;
      },
    },
  ];
  function enableFile(
    record: KnowledgeFileItem,
    event: React.MouseEvent
  ): void {
    event.stopPropagation();
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
            currentFile.fileInfoV2.enabled = enabled === 1;
          }
          return [...files];
        });
      } else {
        setDataResource(files => {
          const currentFile = files.find(item => item.id === record.id);
          if (currentFile?.fileInfoV2) {
            currentFile.fileInfoV2.enabled = enabled === 1;
          }
          return [...files];
        });
      }
    });
  }
  function handleRowClick(record: KnowledgeFileItem): void {
    if (record.isFile) {
      setCurrentTab('file');
      setFileId(record.fileId || 0);
    } else {
      setParentId(record.id);
      setPagination(prevPagination => ({
        ...prevPagination,
        current: 1,
      }));
      setSearchValue('');
    }
  }
  function rowProps(record: KnowledgeFileItem): unknown {
    return tag !== 'SparkDesk-RAG'
      ? {
          onClick: () => handleRowClick(record),
        }
      : {};
  }

  function handleTableChange(page: number, pageSize: number): void {
    setPagination({ ...pagination, current: page, pageSize });
  }
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="file-list flex-1 overflow-auto mb-4">
        <Table
          dataSource={searchValue ? searchData : dataResource}
          columns={columns}
          className="document-table h-full"
          onRow={rowProps}
          pagination={false}
          rowKey={record => record.id}
        />
      </div>
      <div className="flex items-center justify-center h-[80px] px-6 relative">
        <div className="text-[#979797] text-sm pt-4 absolute left-6">
          {t('effectEvaluation.totalDataItems', {
            count: pagination?.total,
          })}
        </div>
        <Pagination
          className="flow-pagination-tamplate custom-pagination"
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onChange={handleTableChange}
          showSizeChanger
        />
      </div>
    </div>
  );
};

const useKnowledgeDetail = ({
  setSearchValue,
  parentId,
  setSearchData,
  setLoading,
  setDataResource,
  pagination,
  setPagination,
  setDirectoryTree,
}): useKnowledgeDetailProps => {
  const controllerRef = useRef<AbortController | null>(null);
  const knowledgeDetailModalInfo = useFlowsManager(
    state => state.knowledgeDetailModalInfo
  );
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const nodes = currentStore(state => state.nodes);
  const repoId = useMemo(
    () => knowledgeDetailModalInfo.repoId,
    [knowledgeDetailModalInfo]
  );
  const tag = useMemo(
    () => (knowledgeDetailModalInfo as KnowledgeDetailModalInfo).tag,
    [knowledgeDetailModalInfo]
  );
  const id = useMemo(
    () => knowledgeDetailModalInfo?.nodeId,
    [knowledgeDetailModalInfo]
  );
  const repoList = useMemo(() => {
    return nodes?.find(item => item.id === id)?.data.nodeParam.repoList || [];
  }, [nodes, knowledgeDetailModalInfo?.nodeId]);
  const checkedIds = useMemo(() => {
    return repoList?.map(item => item?.id) || [];
  }, [repoList]);
  const ragType = useMemo(() => {
    return repoList?.[0]?.tag || '';
  }, [repoList]);
  const isPro = useMemo(() => {
    return id?.startsWith('knowledge-pro-base');
  }, [id]);
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchValue(value);
      searchFileDebounce(value);
    },
    [repoId, parentId]
  );

  const searchFileDebounce = useCallback(
    debounce(value => {
      connectToSSE(value);
    }, 500),
    [repoId, parentId]
  );

  const connectToSSE = useCallback(
    async (searchValue: string): Promise<void> => {
      setSearchData([]);
      setLoading(true);
      if (controllerRef.current) {
        controllerRef.current?.abort();
        controllerRef.current = null;
      }
      controllerRef.current = new AbortController();

      await fetchEventSource(
        getFixedUrl(
          `/file/search-file?fileName=${encodeURIComponent(
            searchValue
          )}&repoId=${repoId}&pid=${parentId}&tag=${tag}`
        ),
        {
          signal: controllerRef?.current?.signal,
          headers: {
            Authorization: getAuthorization(),
          },
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
          onerror() {
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

  function getFiles(): void {
    setLoading(true);
    const params = {
      tag,
      parentId: parentId || -1,
      repoId,
      pageNo: pagination.current,
      pageSize: pagination.pageSize,
    };
    queryFileList(params)
      .then(data => {
        const files = data.pageData.map((item: unknown) => ({
          ...item,
          type: fileType(item),
          size: item.fileInfoV2?.size,
        }));
        setDataResource(files);
        setPagination(prevPagination => ({
          ...prevPagination,
          total: data.totalCount,
        }));
      })
      .finally(() => setLoading(false));
  }

  function getDirectoryTree(): void {
    const params = {
      fileId: parentId,
      repoId,
    };
    listFileDirectoryTree(params).then(data => {
      setDirectoryTree(data);
    });
  }

  return {
    getDirectoryTree,
    getFiles,
    repoId,
    tag,
    isPro,
    id,
    handleInputChange,
    checkedIds,
    ragType,
  };
};

function KnowledgeDetail({
  setCurrentTab,
  parentId,
  setParentId,
  setFileId,
}: KnowledgeDetailProps): React.ReactElement {
  const knowledgeDetailModalInfo = useFlowsManager(
    state => state.knowledgeDetailModalInfo
  );
  const setKnowledgeDetailModalInfo = useFlowsManager(
    state => state.setKnowledgeDetailModalInfo
  );
  const [knowledgeDetail, setKnowledgeDetail] = useState<{ name: string }>({
    name: '',
  });
  const [searchValue, setSearchValue] = useState<string>('');
  const [searchData, setSearchData] = useState<KnowledgeFileItem[]>([]);
  const [directoryTree, setDirectoryTree] = useState<DirectoryItem[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [dataResource, setDataResource] = useState<KnowledgeFileItem[]>([]);

  const {
    getDirectoryTree,
    getFiles,
    repoId,
    tag,
    isPro,
    id,
    handleInputChange,
    checkedIds,
    ragType,
  } = useKnowledgeDetail({
    setSearchValue,
    parentId,
    setSearchData,
    setLoading,
    setDataResource,
    pagination,
    setPagination,
    setDirectoryTree,
  });

  useEffect(() => {
    parentId && getDirectoryTree();
  }, [parentId]);

  useEffect(() => {
    if (repoId && tag) {
      getKnowledgeDetail(
        knowledgeDetailModalInfo.repoId,
        (knowledgeDetailModalInfo as KnowledgeDetailModalInfo).tag || ''
      ).then((res: unknown) => {
        setKnowledgeDetail(res);
      });
    }
  }, [knowledgeDetailModalInfo]);

  useEffect(() => {
    parentId && getFiles();
  }, [pagination.current, pagination.pageSize, parentId]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <KnowledgeHeader
        knowledgeDetail={knowledgeDetail}
        setKnowledgeDetailModalInfo={setKnowledgeDetailModalInfo}
      />
      <KnowledgeToolbar
        isPro={isPro}
        id={id}
        directoryTree={directoryTree}
        setParentId={setParentId}
        pagination={pagination}
        searchValue={searchValue}
        handleInputChange={handleInputChange}
        checkedIds={checkedIds}
        repoId={repoId}
        knowledgeDetailModalInfo={knowledgeDetailModalInfo}
        ragType={ragType}
        tag={tag}
      />
      <div className="mt-6 pr-6 flex-1 overflow-hidden">
        {loading && dataResource.length === 0 ? (
          <KnowledgeSkeleton />
        ) : (
          <KnowledgeTable
            searchValue={searchValue}
            setSearchData={setSearchData}
            setDataResource={setDataResource}
            setCurrentTab={setCurrentTab}
            setFileId={setFileId}
            setPagination={setPagination}
            setSearchValue={setSearchValue}
            tag={tag}
            pagination={pagination}
            searchData={searchData}
            dataResource={dataResource}
            setParentId={setParentId}
          />
        )}
      </div>
    </div>
  );
}

function EditChunk({
  setEditModal,
  currentChunk,
  enableChunk,
  fileInfo,
}: EditChunkProps): React.ReactElement {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setChecked(currentChunk.enabled ? true : false);
  }, []);

  return (
    <div
      className="mask"
      style={{
        zIndex: 999,
      }}
    >
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md w-[600px]">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <img src={Icons.knowledgeDetail.order} className="w-3 h-3" alt="" />
            <span
              className="ml-1 text-xs text-[#F6B728]"
              style={{
                fontFamily: 'SF Pro Text, SF Pro Text-600',
                fontStyle: 'italic',
              }}
            >
              00{currentChunk.index}
            </span>
            <div className="items-center flex">
              <img
                src={Icons.knowledgeDetail.text}
                className="w-3 h-3 ml-1.5"
                alt=""
              />
              <span className="text-desc ml-1">{currentChunk.charCount}</span>
              <img
                src={Icons.knowledgeDetail.target}
                className="w-3 h-3 ml-1.5"
                alt=""
              />
              <span className="text-desc ml-1">
                {currentChunk.testHitCount}
              </span>
              <img
                src={typeList.get(fileInfo?.type)}
                className="w-4 h-4 ml-1.5"
                alt=""
              />
              <span
                className="text-second text-xs font-medium ml-1 text-overflow max-w-[300px]"
                title={fileInfo.name}
              >
                {fileInfo.name}
              </span>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center">
              <span
                className={`w-[9px] h-[9px] ${
                  checked ? 'bg-[#13A10E]' : 'bg-[#757575]'
                } rounded-full`}
              ></span>
              <span
                className={`${
                  checked ? 'text-[#13A10E]' : 'text-[#757575]'
                } text-sm ml-2`}
              >
                {checked ? t('knowledge.enabled') : t('knowledge.disabled')}
              </span>
            </div>
            <Switch
              disabled={['block', 'review'].includes(
                currentChunk.auditSuggest || ''
              )}
              size="small"
              checked={checked}
              onChange={checked => {
                setChecked(checked);
                enableChunk(currentChunk, checked);
              }}
              className="list-switch ml-4"
            />
          </div>
        </div>
        <div className="mt-[18px] max-h-[320px] overflow-y-auto text-second text-sm break-words min-h-[100px]">
          <MarkdownRender
            content={currentChunk.markdownContent}
            isSending={false}
          />
        </div>
        <div className="mt-3 border-t border-[#e8e8e8] pt-2 pb-1 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="rounded-md border border-[#D7DFE9] px-4 py-1 text-second text-sm cursor-pointer"
              onClick={() => setEditModal(false)}
            >
              {t('common.cancel')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FileHeader = ({
  setCurrentTab,
  otherFiles,
  setShowMore,
  fileInfo,
  showMore,
  searchRef,
  setSearchValue,
  setFileId,
  setKnowledgeDetailModalInfo,
}): React.ReactElement => {
  return (
    <div className="flex justify-between items-center pb-4 border-b border-[#E2E8FF] pr-6">
      <div className="flex items-center gap-2">
        <img
          src={Icons.knowledgeDetail.arrowLeft}
          className="w-7 h-7 cursor-pointer"
          onClick={() => setCurrentTab('knowledge')}
          alt=""
        />
        <span
          className="flex justify-between items-center py-2 px-3.5 bg-[#F9FAFB] w-[400px] relative rounded-lg"
          style={{
            cursor: otherFiles.length > 0 ? 'pointer' : 'auto',
          }}
          onClick={event => {
            event.stopPropagation();
            setShowMore(showMore => !showMore);
          }}
        >
          <div className="w-full flex items-center flex-1">
            <img
              src={typeList.get(
                generateType((fileInfo?.type || '').toLowerCase()) || 'default'
              )}
              className="w-[22px] h-[22px] flex-shrink-0"
              alt=""
            />
            <p
              className="ml-2 flex-1 text-overflow text-second font-medium text-sm"
              title={fileInfo.name}
            >
              {fileInfo.name}
            </p>
          </div>
          {otherFiles.length > 0 && (
            <img
              src={Icons.knowledgeDetail.select}
              className="w-4 h-4"
              alt=""
            />
          )}
          {showMore && otherFiles.length > 0 && (
            <div className="absolute right-0 top-[42px] list-options py-3.5 pt-2 w-full z-50 max-h-[205px] overflow-auto">
              {otherFiles.map(item => (
                <div
                  key={item.id}
                  className="w-full px-5 py-1.5 pr-4 text-desc font-medium hover:bg-[#F9FAFB] flex items-center cursor-pointer"
                  onClick={() => {
                    if (searchRef.current) {
                      searchRef.current.value = '';
                      searchRef.current.setAttribute('placeholder', '请输入');
                    }
                    setSearchValue('');
                    setFileId(item.id);
                  }}
                >
                  <img
                    src={typeList.get(
                      generateType((item.type || '').toLowerCase()) || 'default'
                    )}
                    className="w-4 h-4 flex-shrink-0"
                    alt=""
                  />
                  <span
                    className="ml-2.5 flex-1 text-overflow"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </span>
      </div>
      <img
        src={Icons.knowledgeDetail.close}
        className="w-3 h-3 cursor-pointer"
        alt=""
        onClick={() =>
          setKnowledgeDetailModalInfo({
            open: false,
            nodeId: '',
            repoId: '',
          })
        }
      />
    </div>
  );
};

const FileSearch = ({ searchRef, fetchDataDebounce }): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className="relative">
          <img
            src={Icons.knowledgeDetail.search}
            className="w-4 h-4 absolute left-[28px] top-[13px] z-10"
            alt=""
          />
          <input
            ref={searchRef}
            className="global-input ml-3 w-[320px] pl-10 h-10"
            placeholder={t('knowledge.pleaseEnter')}
            onChange={fetchDataDebounce}
          />
        </div>
      </div>
    </div>
  );
};

const ChunkList = ({
  chunks,
  chunkRef,
  handleScroll,
  setCurrentChunk,
  setEditModal,
  enableChunk,
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <>
      {chunks.length > 0 && (
        <div
          className="flex-1 overflow-auto"
          ref={chunkRef}
          onScroll={handleScroll}
        >
          <div className="mt-4 grid sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-3 gap-4 items-end">
            {chunks.map((item: unknown, index) => (
              <div
                key={item.id}
                className="rounded-xl bg-[#F6F6FD] p-4 h-[220px] flex flex-col group cursor-pointer file-chunk-item"
                onClick={() => {
                  setCurrentChunk({ ...item, index: index + 1 });
                  setEditModal(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {['block', 'review'].includes(item.auditSuggest) && (
                      <div className="rounded border border-[#FFA19B] bg-[#fff5f4] px-2 py-1 text-[#E92215] text-xs mr-2.5">
                        {t('knowledge.violation')}
                      </div>
                    )}
                    <img
                      src={Icons.knowledgeDetail.order}
                      className="w-3 h-3"
                      alt=""
                    />
                    <span
                      className="ml-1 text-xs text-[#F6B728]"
                      style={{ fontFamily: 'SF Pro Text, SF Pro Text-600' }}
                    >
                      00{index + 1}
                    </span>
                    {item.source === 1 && (
                      <div className="flex items-center">
                        <img
                          src={Icons.knowledgeDetail.useradd}
                          className="w-3 h-3 ml-1.5"
                          alt=""
                        />
                        <span className="text-desc ml-1">
                          {t('knowledge.manual')}
                        </span>
                      </div>
                    )}
                    <div className="items-center hidden group-hover:flex">
                      <img
                        src={Icons.knowledgeDetail.text}
                        className="w-3 h-3 ml-1.5"
                        alt=""
                      />
                      <span className="text-desc ml-1">
                        {item.content?.length}
                      </span>
                      <img
                        src={Icons.knowledgeDetail.target}
                        className="w-3 h-3 ml-1.5"
                        alt=""
                      />
                      <span className="text-desc ml-1">0</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center">
                      <span
                        className={`w-2 h-2 ${
                          item.enabled ? 'bg-[#13A10E]' : 'bg-[#757575]'
                        } rounded-full`}
                      ></span>
                      <span className="text-desc ml-1.5">
                        {item.enabled
                          ? t('knowledge.enabled')
                          : t('knowledge.disabled')}
                      </span>
                    </div>
                    <Switch
                      disabled={['block', 'review'].includes(item.auditSuggest)}
                      size="small"
                      checked={item.enabled ? true : false}
                      onChange={(checked, event) => {
                        event.stopPropagation();
                        enableChunk(item, checked);
                      }}
                      className="list-switch group-hover:block hidden ml-2"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-hidden relative mt-2 text-second text-sm">
                  <div className="chunk-text-bg"></div>
                  <MarkdownRender
                    content={item.markdownContent}
                    isSending={false}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

const FileParameters = ({ parameters }): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div
      className="h-full border-l border-[#E2E8FF] transition-all overflow-auto"
      style={{ width: '16%' }}
    >
      <div className="w-full h-full px-6">
        <h2 className="text-second font-semibold text-2xl">
          {t('knowledge.technicalParameters')}
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col">
            <div className="text-second font-medium">
              {t('knowledge.segmentIdentifier')}
            </div>
            <p className="text-[#757575] text-xl font-medium">
              {parameters.sliceType === 0
                ? t('knowledge.automatic')
                : t('knowledge.customized')}
            </p>
          </div>
          <div className="flex flex-col">
            <div className="text-second font-medium">
              {t('knowledge.hitCount')}
            </div>
            <p className="text-[#757575] text-xl font-medium">
              {parameters.hitCount}
            </p>
          </div>
          <div className="flex flex-col">
            <div className="text-second font-medium">
              {t('knowledge.paragraphLength')}
            </div>
            <p className="text-[#757575] text-xl font-medium">
              {parameters.lengthRange && parameters.lengthRange[1]}{' '}
              {t('knowledge.characters')}
            </p>
          </div>
          <div className="flex flex-col">
            <div className="text-second font-medium">
              {t('knowledge.averageParagraphLength')}
            </div>
            <p className="text-[#757575] text-xl font-medium">
              {parameters.knowledgeAvgLength} {t('knowledge.characters')}
            </p>
          </div>
          <div className="flex flex-col">
            <div className="text-second font-medium">
              {t('knowledge.paragraphCount')}
            </div>
            <p className="text-[#757575] text-xl font-medium">
              {parameters.knowledgeCount} {t('knowledge.paragraphs')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const useFileDetail = ({
  knowledgeDetailModalInfo,
  fileId,
  fileList,
  setFileList,
  setFileInfo,
  setParameters,
  loadingRef,
  setLoadingData,
  setChunks,
  chunkRef,
  searchValue,
  setPageNumber,
  setHasMore,
  setSearchValue,
  hasMore,
  pageNumber,
  chunks,
}): useFileDetailProps => {
  const repoId = useMemo(
    () => knowledgeDetailModalInfo.repoId,
    [knowledgeDetailModalInfo]
  );
  const tag = useMemo(
    () => (knowledgeDetailModalInfo as KnowledgeDetailModalInfo).tag,
    [knowledgeDetailModalInfo]
  );

  const otherFiles = useMemo(() => {
    return fileList.filter(item => item.id !== fileId);
  }, [fileList, fileId]);

  function getFiles(): void {
    getFileList(repoId).then(data => {
      setFileList(data);
    });
  }

  function getFileInfo(): void {
    const params = {
      tag,
      fileIds: [fileId],
    };
    getFileSummary(params).then(data => {
      setFileInfo(data.fileInfoV2);
      setParameters(data);
    });
  }

  function fetchData(value?: string): void {
    loadingRef.current = true;
    setLoadingData(true);
    setChunks([]);
    if (chunkRef.current) {
      chunkRef.current.scrollTop = 0;
    }
    const params: unknown = {
      fileIds: [fileId],
      pageNo: 1,
      pageSize: 20,
      query: value !== undefined ? value?.trim() : searchValue,
    };
    listKnowledgeByPage(params)
      .then(data => {
        const newChunks = modifyChunks(data.pageData);
        setPageNumber(2);
        setChunks(() => newChunks);
        if (data.totalCount > 20) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      })
      .finally(() => {
        loadingRef.current = false;
        setLoadingData(false);
      });
  }

  const fetchDataDebounce = useCallback(
    debounce((e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      fetchData(value);
    }, 500),
    [searchValue]
  );

  function handleScroll(): void {
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
  }

  function moreData(): void {
    loadingRef.current = true;
    setLoadingData(true);

    const params = {
      fileIds: [fileId],
      pageNo: pageNumber,
      pageSize: 20,
      query: searchValue,
    };
    listKnowledgeByPage(params)
      .then(data => {
        const newChunks = modifyChunks(data.pageData);
        if (data.totalCount > chunks.length + 20) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
        setPageNumber(number => number + 1);
        setChunks(prevItems => [...prevItems, ...newChunks]);
      })
      .finally(() => {
        loadingRef.current = false;
        setLoadingData(false);
      });
  }

  function enableChunk(record: ChunkItem, checked: boolean): void {
    const findChunk = chunks.find(item => item.id === record.id);
    if (findChunk) {
      findChunk.enabled = checked;
    }
    setChunks([...chunks]);
    const params = {
      id: record.id,
      enabled: checked ? 1 : 0,
    };
    enableKnowledgeAPI(params).then(data => {
      if (checked && findChunk) {
        findChunk.id = data;
        setChunks([...chunks]);
      }
    });
  }
  return {
    getFiles,
    getFileInfo,
    fetchData,
    enableChunk,
    fetchDataDebounce,
    handleScroll,
    otherFiles,
  };
};

function FileDetail({
  setCurrentTab,
  fileId,
  setFileId,
}: FileDetailProps): React.ReactElement {
  const chunkRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const loadingRef = useRef<boolean>(false);
  const knowledgeDetailModalInfo = useFlowsManager(
    state => state.knowledgeDetailModalInfo
  );
  const setKnowledgeDetailModalInfo = useFlowsManager(
    state => state.setKnowledgeDetailModalInfo
  );
  const [fileList, setFileList] = useState<KnowledgeFileItem[]>([]);
  const [showMore, setShowMore] = useState<boolean>(false);
  const [fileInfo, setFileInfo] = useState<FileInfo>({} as FileInfo);
  const [searchValue, setSearchValue] = useState<string>('');
  const [parameters, setParameters] = useState<unknown>({});
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [currentChunk, setCurrentChunk] = useState<ChunkItem>({} as ChunkItem);
  const [editModal, setEditModal] = useState<boolean>(false);

  const {
    getFiles,
    getFileInfo,
    fetchData,
    enableChunk,
    fetchDataDebounce,
    handleScroll,
    otherFiles,
  } = useFileDetail({
    knowledgeDetailModalInfo,
    fileId,
    fileList,
    setFileList,
    setFileInfo,
    setParameters,
    loadingRef,
    setLoadingData,
    setChunks,
    chunkRef,
    searchValue,
    setPageNumber,
    setHasMore,
    setSearchValue,
    hasMore,
    pageNumber,
    chunks,
  });

  useEffect(() => {
    getFiles();
  }, []);

  useEffect(() => {
    getFileInfo();
  }, []);

  useEffect(() => {
    document.documentElement.addEventListener('click', clickOutside);
    return (): void =>
      document.documentElement.removeEventListener('click', clickOutside);
  }, []);

  function clickOutside(): void {
    setShowMore(false);
  }

  useEffect(() => {
    fetchData();
  }, [fileId]);

  return (
    <>
      {editModal && (
        <EditChunk
          fileInfo={fileInfo}
          currentChunk={currentChunk}
          setEditModal={setEditModal}
          enableChunk={enableChunk}
        />
      )}
      <FileHeader
        setCurrentTab={setCurrentTab}
        otherFiles={otherFiles}
        setShowMore={setShowMore}
        fileInfo={fileInfo}
        showMore={showMore}
        searchRef={searchRef}
        setSearchValue={setSearchValue}
        setFileId={setFileId}
        setKnowledgeDetailModalInfo={setKnowledgeDetailModalInfo}
      />
      <div className="flex-1 w-full flex pt-4 gap-6 overflow-auto relative pr-6">
        <div className="h-full flex flex-col flex-1 overflow-hidden">
          <FileSearch
            searchRef={searchRef}
            fetchDataDebounce={fetchDataDebounce}
          />
          <ChunkList
            chunks={chunks}
            chunkRef={chunkRef}
            handleScroll={handleScroll}
            setCurrentChunk={setCurrentChunk}
            setEditModal={setEditModal}
            enableChunk={enableChunk}
          />
          {loadingData && <Spin className="mt-6" />}
        </div>
        <FileParameters parameters={parameters} />
      </div>
    </>
  );
}

export default KnowledgePreviewModal;
