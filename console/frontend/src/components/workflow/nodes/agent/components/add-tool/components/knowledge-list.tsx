import React, { useMemo, useCallback } from 'react';
import { Select, Button, message, Tooltip } from 'antd';
import { FlowInput } from '@/components/workflow/ui';
import { useTranslation } from 'react-i18next';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';

import formSelect from '@/assets/imgs/main/icon_nav_dropdown.svg';
import search from '@/assets/imgs/workflow/search-icon.svg';
import knowledgeIcon from '@/assets/imgs/workflow/knowledgeIcon.png';
import publishIcon from '@/assets/imgs/workflow/publish-icon.png';
import toolModalAdd from '@/assets/imgs/workflow/tool-modal-add.png';
import xingchenIcon from '@/assets/imgs/knowledge/xingchen-icon.svg';
import xingPuIcon from '@/assets/imgs/knowledge/xingpu-icon.svg';
import baseVersionIcon from '@/assets/imgs/knowledge/base-version-icon.svg';

const KnowledgeToolbar = ({
  orderBy,
  setOrderBy,
  searchValue,
  handleInputChange,
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center justify-between mx-auto"
      style={{
        width: '90%',
        minWidth: 1000,
      }}
    >
      <div className="w-full flex items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <Select
            suffixIcon={<img src={formSelect} className="w-4 h-4 " />}
            className="p-0"
            style={{ height: 32, width: 160 }}
            value={orderBy}
            onChange={value => setOrderBy(value)}
            options={[
              {
                label: t('workflow.nodes.relatedKnowledgeModal.createTime'),
                value: 'create_time',
              },
              {
                label: t('workflow.nodes.relatedKnowledgeModal.updateTime'),
                value: 'update_time',
              },
            ]}
          />
          <div className="relative">
            <img
              src={search}
              className="w-4 h-4 absolute left-[10px] top-[7px] z-10"
              alt=""
            />
            <FlowInput
              value={searchValue}
              className="w-[320px] pl-8 h-[32px] text-sm"
              placeholder={t('workflow.nodes.common.inputPlaceholder')}
              onChange={handleInputChange}
            />
          </div>
        </div>
        <Button
          type="primary"
          className="flex items-center gap-2"
          onClick={(e): void => {
            e.stopPropagation();
            window.open(
              `${window.location.origin}/resource/knowledge`,
              '_blank'
            );
          }}
          style={{
            height: 40,
          }}
        >
          <img className="w-3 h-3" src={toolModalAdd} alt="" />
          <span>
            {t('workflow.nodes.relatedKnowledgeModal.createNewKnowledge')}
          </span>
        </Button>
      </div>
    </div>
  );
};

const KnowledgeList = ({
  toolRef,
  dataSource,
  setKnowledgeDetailModalInfo,
  checkedIds,
  handleChangeKnowledge,
  id,
  ragType,
  orderBy,
  loading,
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className="flex-1 overflow-auto" ref={toolRef}>
      <div
        className="h-full mx-auto"
        style={{
          width: '90%',
          minWidth: 1000,
        }}
      >
        {dataSource.map((item: unknown) => (
          <div
            key={item.id}
            className="px-4 py-2.5 hover:bg-[#EBEBF1] cursor-pointer border-t border-[#E5E5EC]"
          >
            <div className="flex justify-between gap-[52px]">
              <div className="flex-1 flex items-center gap-[30px] overflow-hidden">
                <img
                  src={knowledgeIcon}
                  className="w-[40px] h-[40px] rounded"
                  alt=""
                />
                <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                  <div className="font-semibold flex items-center gap-2">
                    <span>{item?.name}</span>
                    <img
                      src={item?.corner}
                      className="w-[54px] h-[28px]"
                      alt=""
                    />
                  </div>
                  <p
                    className="text-[#757575] text-xs text-overflow flex-1"
                    title={item?.description}
                  >
                    {item?.description}
                  </p>
                </div>
              </div>
              <div className="w-2/5 flex items-center justify-between min-w-[500px]">
                <div className="w-1/3 flex items-center gap-1.5 flex-shrink-0">
                  <img src={publishIcon} className="w-3 h-3" alt="" />
                  <p className="text-[#757575] text-xs">
                    {orderBy === 'create_time'
                      ? t(
                          'workflow.nodes.relatedKnowledgeModal.createTimePrefix'
                        )
                      : t(
                          'workflow.nodes.relatedKnowledgeModal.updateTimePrefix'
                        )}{' '}
                    {orderBy === 'create_time'
                      ? item?.createTime
                      : item?.updateTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="primary"
                    className="flex items-center gap-2"
                    onClick={e => {
                      e.stopPropagation();
                      setKnowledgeDetailModalInfo({
                        ...item,
                        open: true,
                        nodeId: id,
                        repoId: item.id,
                      });
                    }}
                  >
                    详情
                  </Button>
                  <Tooltip
                    overlayClassName="black-tooltip"
                    title={t('workflow.nodes.common.knowledgeTypeTip')}
                  >
                    <div
                      className="flex items-center gap-2.5 relative"
                      onClick={e => e.stopPropagation()}
                    >
                      <div
                        onClick={() => {
                          if (ragType && item?.tag !== ragType) return;
                          handleChangeKnowledge(item);
                        }}
                      >
                        {checkedIds.includes(
                          item?.coreRepoId || item?.outerRepoId
                        ) ? (
                          <div
                            className="border border-[#D3DBF8] bg-[#fff] py-1 px-6 rounded-lg"
                            style={{
                              height: '40px',
                            }}
                          >
                            {t('workflow.nodes.relatedKnowledgeModal.remove')}
                          </div>
                        ) : (
                          <Button
                            disabled={ragType && item?.tag !== ragType}
                            type="primary"
                            className="px-6"
                            style={{
                              height: 40,
                            }}
                          >
                            {t('workflow.nodes.toolNode.addTool')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!loading && dataSource.length === 0 ? (
          <p className="mt-3 px-4">
            {t('workflow.nodes.relatedKnowledgeModal.noDocuments')}
          </p>
        ) : null}
      </div>
    </div>
  );
};

function index({
  id,
  dataSource,
  toolRef,
  orderBy,
  setOrderBy,
  searchValue,
  handleInputChange,
  toolsList,
  loading,
  handleAddTool,
}): React.ReactElement {
  const setKnowledgeDetailModalInfo = useFlowsManager(
    state => state.setKnowledgeDetailModalInfo
  );
  const { t } = useTranslation();
  const checkedIds = useMemo(() => {
    return toolsList?.map(item => item?.toolId) || [];
  }, [toolsList]);

  const handleChangeKnowledge = useCallback(
    (knowledge): void => {
      if (
        !checkedIds.includes(knowledge?.coreRepoId || knowledge?.outerRepoId) &&
        checkedIds?.length >= 30
      ) {
        message.warning(t('workflow.nodes.common.maxAddWarning'));
        return;
      }
      handleAddTool({
        ...knowledge,
        toolId: knowledge?.coreRepoId || knowledge?.outerRepoId,
        type: 'knowledge',
        tag: knowledge?.tag,
      });
    },
    [checkedIds]
  );

  const ragType = useMemo(() => {
    return (
      toolsList?.filter(item => item?.type === 'knowledge')?.[0]?.tag || ''
    );
  }, [toolsList]);

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{
        padding: '26px 0 43px',
      }}
    >
      <div className="h-full overflow-hidden flex flex-col">
        <div className="flex flex-col mt-4 gap-1.5 flex-1 overflow-hidden">
          <KnowledgeToolbar
            orderBy={orderBy}
            setOrderBy={setOrderBy}
            searchValue={searchValue}
            handleInputChange={handleInputChange}
          />
          <div className="flex flex-col gap-[18px] overflow-hidden">
            <div
              className="flex items-center font-medium px-4 mx-auto"
              style={{
                width: '90%',
                minWidth: 1000,
              }}
            >
              <span className="flex-1">
                {t('workflow.nodes.knowledgeNode.knowledgeBase')}
              </span>
              <span className="w-2/5 min-w-[500px]">
                {orderBy === 'create_time'
                  ? t('workflow.nodes.relatedKnowledgeModal.createTime')
                  : t('workflow.nodes.relatedKnowledgeModal.updateTime')}
              </span>
            </div>
            <KnowledgeList
              toolRef={toolRef}
              dataSource={dataSource}
              setKnowledgeDetailModalInfo={setKnowledgeDetailModalInfo}
              checkedIds={checkedIds}
              handleChangeKnowledge={handleChangeKnowledge}
              id={id}
              ragType={ragType}
              orderBy={orderBy}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default index;
