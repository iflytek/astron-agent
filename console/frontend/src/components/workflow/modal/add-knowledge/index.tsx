import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMemoizedFn } from 'ahooks';
import { cloneDeep } from 'lodash';
import { Button, Input, Select, Spin, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { configListRepos } from '@/services/knowledge';
import { debounce } from 'lodash';
import dayjs from 'dayjs';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { generateKnowledgeOutput } from '@/components/workflow/utils/reactflowUtils';
import {
  KnowledgeItem,
  KnowledgeListItem,
  NodeItem,
  OrderByType,
  VersionType,
  useAddKnowledgeProps,
} from '@/components/workflow/types';
import { Icons } from '@/components/workflow/icons';

const useAddKnowledge = (): useAddKnowledgeProps => {
  const { t } = useTranslation();
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const knowledgeModalInfo = useFlowsManager(state => state.knowledgeModalInfo);
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const currentStore = getCurrentStore();
  const nodes = currentStore(state => state.nodes);
  const setNode = currentStore(state => state.setNode);
  const checkNode = currentStore(state => state.checkNode);
  const [allData, setAllData] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [orderBy, setOrderBy] = useState<OrderByType>('create_time');
  const [tag, setTag] = useState<VersionType | undefined>(undefined);

  const id = useMemo(
    (): string | undefined => knowledgeModalInfo?.nodeId,
    [knowledgeModalInfo]
  );

  const repoList = useMemo((): KnowledgeListItem[] => {
    return (
      nodes?.find((item: NodeItem) => item.id === id)?.data.nodeParam
        .repoList || []
    );
  }, [nodes, id]);

  const isPro = useMemo(() => {
    return id?.startsWith('knowledge-pro-base');
  }, [id]);

  const getKnowledges = (value?: string): void => {
    setLoading(true);
    const params = {
      pageNo: 1,
      pageSize: 999,
      content: value !== undefined ? value?.trim() : '',
      orderBy,
      tag,
    };

    configListRepos(params)
      .then(data => {
        setAllData(data.pageData || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getKnowledges();
  }, [orderBy, tag]);

  const getKnowledgesDebounce = useCallback(
    debounce((e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      getKnowledges(value);
    }, 500),
    [orderBy, tag]
  );

  const checkedIds = useMemo(() => {
    return repoList?.map(item => item?.id) || [];
  }, [repoList]);

  const ragType = useMemo(() => {
    return repoList?.[0]?.tag || '';
  }, [repoList]);

  const handleKnowledgesChange = useMemoizedFn(
    (knowledge: KnowledgeItem): void => {
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
    }
  );

  const versionList = useMemo(() => {
    const options = [
      {
        label: t('workflow.nodes.relatedKnowledgeModal.xingpu'),
        value: 'CBG-RAG',
      },
      {
        label: 'Ragflow',
        value: 'Ragflow-RAG',
      },
    ];
    return options;
  }, []);
  return {
    allData,
    setAllData,
    loading,
    setLoading,
    tag,
    setTag,
    orderBy,
    versionList,
    getKnowledgesDebounce,
    setOrderBy,
    handleKnowledgesChange,
    ragType,
    checkedIds,
  };
};

const KnowledgeList = ({
  loading,
  allData,
  ragType,
  id,
  handleKnowledgesChange,
  checkedIds,
  orderBy,
}): React.ReactElement => {
  const { t } = useTranslation();
  const setKnowledgeDetailModalInfo = useFlowsManager(
    state => state.setKnowledgeDetailModalInfo
  );
  if (loading) return <Spin spinning={loading} />;
  if (allData.length === 0)
    return (
      <div className="mt-3 flex flex-col justify-center items-center gap-[30px] text-desc h-full">
        <img
          src={Icons.addKnowledge.listEmpty}
          className="w-[124px] h-[122px]"
          alt=""
        />
        <p>{t('workflow.nodes.relatedKnowledgeModal.noDocuments')}</p>
      </div>
    );
  return (
    <>
      {allData.map((item: KnowledgeItem) => {
        return (
          <div
            key={item.id}
            className="flex flex-col bg-[#F7F7FA] p-4 rounded-lg"
          >
            <div className="flex items-center gap-2.5">
              <img
                src={Icons.addKnowledge.knowledge}
                className="w-7 h-7"
                alt=""
              />
              <div className="flex items-center flex-1 overflow-hidden gap-2">
                <p
                  className="max-w-[500px] text-overflow text-sm font-medium"
                  title={item.name}
                >
                  {item.name}
                </p>
                <img src={item?.corner} className="h-[20px]" alt="" />
              </div>
              <div
                className="border border-[#E5E5E5] py-1 px-6 rounded-lg cursor-pointer"
                onClick={() => {
                  setKnowledgeDetailModalInfo({
                    ...item,
                    open: true,
                    nodeId: id,
                    repoId: item.id,
                  });
                }}
              >
                {t('workflow.nodeList.details')}
              </div>
              <Tooltip
                overlayClassName="black-tooltip"
                title={t(
                  'workflow.nodes.relatedKnowledgeModal.knowledgeTypeTip'
                )}
              >
                <div
                  style={{
                    cursor:
                      ragType && item?.tag !== ragType
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                  onClick={() => {
                    if (ragType && item?.tag !== ragType) return;
                    handleKnowledgesChange(item);
                  }}
                >
                  {checkedIds.includes(item.id) ? (
                    <div
                      className="bg-[#EBEBF1] py-1 px-6 rounded-lg"
                      style={{
                        border: '1px solid transparent',
                      }}
                    >
                      {t('workflow.nodes.relatedKnowledgeModal.remove')}
                    </div>
                  ) : (
                    <div className="border border-[#E5E5E5] py-1 px-6 rounded-lg">
                      {t('workflow.nodes.relatedKnowledgeModal.add')}
                    </div>
                  )}
                </div>
              </Tooltip>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 pl-[38px]">
              <img
                src={Icons.chatResult.resultCopy}
                className="w-3 h-3"
                alt=""
              />
              <p className="text-[#757575] text-xs">
                {orderBy === 'create_time'
                  ? `${t(
                      'workflow.nodes.relatedKnowledgeModal.createTimePrefix'
                    )}${dayjs(item?.createTime)?.format('YYYY-MM-DD HH:mm:ss')}`
                  : `${t(
                      'workflow.nodes.relatedKnowledgeModal.updateTimePrefix'
                    )}${dayjs(item?.updateTime)?.format(
                      'YYYY-MM-DD HH:mm:ss'
                    )}`}
              </p>
            </div>
          </div>
        );
      })}
    </>
  );
};

const AddKnowledge = (): React.ReactElement => {
  const { t } = useTranslation();
  const knowledgeModalInfo = useFlowsManager(state => state.knowledgeModalInfo);
  const setKnowledgeModalInfo = useFlowsManager(
    state => state.setKnowledgeModalInfo
  );
  const {
    tag,
    setTag,
    orderBy,
    versionList,
    getKnowledgesDebounce,
    loading,
    handleKnowledgesChange,
    ragType,
    checkedIds,
    allData,
    setOrderBy,
  } = useAddKnowledge();
  return (
    <>
      {knowledgeModalInfo.open
        ? createPortal(
            <div
              className="mask"
              style={{
                zIndex: 1001,
              }}
            >
              <div className="p-6 pr-0 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md min-w-[820px] h-[570px] flex flex-col">
                <div className="flex items-center justify-between font-medium pr-6">
                  <span className="font-semibold">
                    {t('workflow.nodes.relatedKnowledgeModal.title')}
                  </span>
                  <img
                    src={Icons.advancedConfig.close}
                    className="w-3 h-3 cursor-pointer"
                    alt=""
                    onClick={() =>
                      setKnowledgeModalInfo({
                        open: false,
                        nodeId: '',
                      })
                    }
                  />
                </div>
                <div className="mt-4 text-sm flex items-center justify-between gap-2.5 pr-6">
                  <div className="flex items-center gap-2.5">
                    <Select
                      placeholder={t(
                        'workflow.nodes.relatedKnowledgeModal.versionSelection'
                      )}
                      suffixIcon={
                        <img
                          src={Icons.advancedConfig.formSelect}
                          className="w-4 h-4 "
                        />
                      }
                      className="p-0"
                      style={{ height: 40, width: 160 }}
                      value={tag}
                      onChange={value => setTag(value)}
                      options={versionList}
                      allowClear
                    />
                    <Select
                      suffixIcon={
                        <img
                          src={Icons.advancedConfig.formSelect}
                          className="w-4 h-4 "
                        />
                      }
                      className="p-0"
                      style={{ height: 40, width: 160 }}
                      value={orderBy}
                      onChange={value => setOrderBy(value)}
                      options={[
                        {
                          label: t(
                            'workflow.nodes.relatedKnowledgeModal.createTime'
                          ),
                          value: 'create_time',
                        },
                        {
                          label: t(
                            'workflow.nodes.relatedKnowledgeModal.updateTime'
                          ),
                          value: 'update_time',
                        },
                      ]}
                    />
                    <div className="relative">
                      <img
                        src={Icons.addKnowledge.search}
                        className="w-4 h-4 absolute left-[14px] top-[13px] z-10"
                        alt=""
                      />
                      <Input
                        className="w-[250px] pl-10 h-10"
                        placeholder={t(
                          'workflow.nodes.relatedKnowledgeModal.searchPlaceholder'
                        )}
                        onChange={getKnowledgesDebounce}
                      />
                    </div>
                  </div>
                  <Button
                    type="primary"
                    onClick={e => {
                      e.stopPropagation();
                      window.open(
                        `${window.location.origin}/resource/knowledge`,
                        '_blank'
                      );
                    }}
                  >
                    {t(
                      'workflow.nodes.relatedKnowledgeModal.createNewKnowledge'
                    )}
                  </Button>
                </div>
                <div
                  className="flex flex-col gap-2.5 mt-4 flex-1 pr-6"
                  style={{
                    overflow: 'auto',
                  }}
                >
                  <KnowledgeList
                    loading={loading}
                    allData={allData}
                    ragType={ragType}
                    id={knowledgeModalInfo.nodeId}
                    handleKnowledgesChange={handleKnowledgesChange}
                    checkedIds={checkedIds}
                    orderBy={orderBy}
                  />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default AddKnowledge;
