import React, { FC } from 'react';
import { Switch, Tag, Spin } from 'antd';

import {
  EditChunk,
  CreateChunk,
  DeleteChunk,
} from './components/modal-components';

import { downloadExcel, generateType } from '@/utils/utils';
import { typeList, tagTypeClass } from '@/constants';
import GlobalMarkDown from '@/components/global-markdown';

import { useTranslation } from 'react-i18next';

import arrowLeft from '@/assets/imgs/knowledge/icon_zhishi_arrow-left.png';
import add from '@/assets/imgs/knowledge/icon_zhishi_add.png';
import datasetting from '@/assets/imgs/knowledge/icon_zhishi_datasetting.png';
import layoutAct from '@/assets/imgs/knowledge/icon_zhishi_layout_act.png';
import layout from '@/assets/imgs/knowledge/icon_zhishi_layout.png';
import target from '@/assets/imgs/knowledge/icon_zhishi_target_act_1.png';
import text from '@/assets/imgs/knowledge/icon_zhishi_text.png';
import del from '@/assets/imgs/main/icon_bot_del_act.png';
import order from '@/assets/imgs/knowledge/icon_zhishi_order.png';
import search from '@/assets/imgs/knowledge/icon_zhishi_search.png';
import useradd from '@/assets/imgs/knowledge/icon_zhishi_useradd.png';
import download from '@/assets/imgs/knowledge/icon_zhishi_download.png';
import select from '@/assets/imgs/knowledge/icon_nav_dropdown.png';
import {
  Chunk,
  FileInfoV2,
  FileItem,
  FileSummaryResponse,
  TagDto,
} from '@/types/resource';
import { useFilePage } from './hooks/use-file-page';
import { useNavigate } from 'react-router-dom';

const statusMap = {
  '-1': 'error',
  '0': 'processing',
  '1': 'error',
  '2': 'processing',
  '3': 'processing',
  '4': 'error',
  '5': 'success',
};

const FilePage: FC = () => {
  const {
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
    resetKnowledge,
    fileInfo,
    parameters,
    otherFiles,
    fileStatusMsg,
    searchRef,
    pid,
    tag,
    fileId,
    currentChunk,
    enableChunk,
    repoId,
    setSearchValue,
    setIsViolation,
    handleEnableFile,
    violationTotal,
    chunkRef,
    fetchDataDebounce,
    handleScroll,
    setCurrentChunk,
    loadingData,
    isViolation,
    chunks,
  } = useFilePage({ statusMap });
  return (
    <div
      className="w-full h-full flex flex-col flex-1 p-6 pb-2 bg-[#fff] border border-[#E2E8FF]"
      style={{ borderRadius: 24 }}
    >
      {editModal && (
        <EditChunk
          fileId={fileId || ''}
          fileInfo={fileInfo}
          resetKnowledge={resetKnowledge}
          currentChunk={currentChunk}
          setEditModal={setEditModal}
          enableChunk={enableChunk}
          setDeleteModal={setDeleteModal}
        />
      )}
      {addModal && (
        <CreateChunk
          fileId={fileId || ''}
          resetKnowledge={resetKnowledge}
          setAddModal={setAddModal}
        />
      )}
      {deleteModal && (
        <DeleteChunk
          setEditModal={setEditModal}
          currentChunk={currentChunk}
          fetchData={() => resetKnowledge()}
          setDeleteModal={setDeleteModal}
        />
      )}
      <FilePageParams
        repoId={repoId}
        tag={tag || ''}
        pid={pid || ''}
        otherFiles={otherFiles}
        showMore={showMore}
        setShowMore={setShowMore}
        fileInfo={fileInfo}
        searchRef={searchRef}
        setSearchValue={setSearchValue}
        setIsViolation={setIsViolation}
        handleEnableFile={handleEnableFile}
        fileStatusMsg={fileStatusMsg}
        setShowParameter={setShowParameter}
        showParameter={showParameter}
        setAddModal={setAddModal}
        fileId={fileId || ''}
      />
      <FilePageChunks
        chunks={chunks}
        chunkRef={chunkRef}
        handleScroll={handleScroll}
        setCurrentChunk={setCurrentChunk}
        setEditModal={setEditModal}
        enableChunk={enableChunk}
        moreTagsId={moreTagsId}
        setMoreTagsId={setMoreTagsId}
        setDeleteModal={setDeleteModal}
        showParameter={showParameter}
        parameters={parameters}
        fileStatusMsg={fileStatusMsg}
        violationTotal={violationTotal}
        searchRef={searchRef}
        fetchDataDebounce={fetchDataDebounce}
        loadingData={loadingData}
        isViolation={isViolation}
        fileId={fileId || ''}
        fileInfo={fileInfo}
        setIsViolation={setIsViolation}
      />
    </div>
  );
};

export const FilePageParams: FC<{
  repoId: string;
  tag: string;
  pid: string;
  otherFiles: FileItem[];
  showMore: boolean;
  setShowMore: React.Dispatch<React.SetStateAction<boolean>>;
  fileInfo: FileInfoV2;
  searchRef: React.RefObject<HTMLInputElement>;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  setIsViolation: React.Dispatch<React.SetStateAction<boolean>>;
  handleEnableFile: () => void;
  fileStatusMsg: string | null | undefined;
  setShowParameter: React.Dispatch<React.SetStateAction<boolean>>;
  showParameter: boolean;
  setAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  fileId: string;
}> = ({
  repoId,
  tag,
  pid,
  otherFiles,
  showMore,
  setShowMore,
  fileInfo,
  searchRef,
  setSearchValue,
  setIsViolation,
  handleEnableFile,
  fileStatusMsg,
  setShowParameter,
  showParameter,
  setAddModal,
  fileId,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="flex justify-between items-center pb-4 border-b border-[#E2E8FF]">
      <div className="flex items-center gap-2">
        <img
          src={arrowLeft}
          className="cursor-pointer w-7 h-7"
          onClick={() =>
            navigate(
              `/resource/knowledge/detail/${repoId}/document?tag=${tag}`,
              {
                state: {
                  parentId: pid,
                },
              }
            )
          }
          alt=""
        />
        <span
          className="flex justify-between items-center py-2 px-3.5 bg-[#F9FAFB] w-[400px] relative rounded-lg"
          style={{
            cursor: otherFiles.length > 0 ? 'pointer' : 'auto',
          }}
          onClick={event => {
            event.stopPropagation();
            setShowMore(!showMore);
          }}
        >
          <div className="flex items-center flex-1 w-full">
            <img
              src={typeList.get(
                generateType(fileInfo?.type?.toLowerCase()) || ''
              )}
              className="w-[22px] h-[22px] flex-shrink-0"
              alt=""
            />
            <p
              className="flex-1 ml-2 text-sm font-medium text-overflow text-second"
              title={fileInfo.name}
            >
              {fileInfo.name}
            </p>
          </div>
          {otherFiles.length > 0 && (
            <img src={select} className="w-4 h-4" alt="" />
          )}
          {showMore && otherFiles.length > 0 && (
            <div className="absolute right-0 top-[42px] list-options py-3.5 pt-2 w-full z-50 max-h-[205px] overflow-auto">
              {otherFiles.map(item => (
                <div
                  key={item.id}
                  className="w-full px-5 py-1.5 pr-4 text-desc font-medium hover:bg-[#F9FAFB] flex items-center cursor-pointer"
                  onClick={() => {
                    (searchRef.current as HTMLInputElement).value = '';
                    // searchRef.current.setAttribute('placeholder', '请输入')
                    setSearchValue('');
                    setIsViolation(false);
                    navigate(
                      `/resource/knowledge/detail/${repoId}/file?parentId=${item.pid}&fileId=${item.id}&tag=${tag}`
                    );
                  }}
                >
                  <img
                    src={typeList.get(
                      generateType((item.type || '')?.toLowerCase()) || ''
                    )}
                    className="flex-shrink-0 w-4 h-4"
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
        {fileStatusMsg && (
          <div className="flex items-center gap-2 ml-2">
            <span
              className={`rounded-full w-[6px] h-[6px] ${
                fileStatusMsg === 'processing'
                  ? 'bg-[#FF9602]'
                  : fileStatusMsg === 'error'
                    ? 'bg-[#F74E43]'
                    : 'bg-[#1FC92D]'
              }`}
            ></span>
            <span
              className={`text-[14px] ${
                fileStatusMsg === 'processing'
                  ? 'text-[#FF9602]'
                  : fileStatusMsg === 'error'
                    ? 'text-[#F74E43]'
                    : 'text-[#1FC92D]'
              }`}
            >
              {fileStatusMsg === 'processing'
                ? t('knowledge.progress')
                : fileStatusMsg === 'error'
                  ? t('knowledge.parseFail')
                  : t('knowledge.parseSuccess')}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-start gap-3">
        <div
          className="flex items-center px-4 py-2 rounded-[10px] border border-[#D7DFE9]"
          style={{
            cursor: fileStatusMsg !== 'success' ? 'not-allowed' : 'pointer',
          }}
          onClick={handleEnableFile}
        >
          <span
            className={`w-[6px] h-[6px] ${
              fileInfo.enabled ? 'bg-[#1FC92D]' : 'bg-[#7F7F7F]'
            } rounded-full`}
          ></span>
          <span
            className={`${
              fileInfo.enabled ? 'text-[#1FC92D]' : 'text-[#7F7F7F]'
            } text-sm ml-2`}
          >
            {fileInfo.enabled
              ? t('knowledge.enabled')
              : t('knowledge.disabled')}
          </span>
        </div>

        <div
          className="border border-[#D7DFE9] flex items-center px-4 py-2"
          style={{
            borderRadius: 10,
            cursor: fileStatusMsg !== 'success' ? 'not-allowed' : 'pointer',
          }}
          onClick={() => {
            if (fileStatusMsg !== 'success') return;
            setAddModal(true);
          }}
        >
          <img src={add} className="w-4 h-4" alt="" />
          <span className="ml-2 text-sm text-second">{t('common.add')}</span>
        </div>
        <div
          className="border border-[#D7DFE9] flex items-center px-5 py-2 cursor-pointer"
          style={{ borderRadius: 10 }}
          onClick={() =>
            navigate(
              `/resource/knowledge/detail/${repoId}/segmentation?parentId=${pid}&fileId=${fileId}&tag=${tag}`
            )
          }
        >
          <img src={datasetting} className="w-4 h-4" alt="" />
          <span className="ml-2 text-sm text-second">
            {t('knowledge.segmentSettings')}
          </span>
        </div>
        <div
          className="border border-[#D7DFE9] flex justify-center items-center p-2 cursor-pointer"
          style={{ borderRadius: 10 }}
          onClick={() => setShowParameter(!showParameter)}
        >
          <img
            src={showParameter ? layoutAct : layout}
            className="w-6 h-6"
            alt=""
          />
        </div>
      </div>
    </div>
  );
};

export const FilePageChunks: FC<{
  chunks: Chunk[];
  setCurrentChunk: React.Dispatch<React.SetStateAction<Chunk>>;
  loadingData: boolean;
  isViolation: boolean;
  handleScroll: () => void;
  violationTotal: number;
  searchRef: React.RefObject<HTMLInputElement>;
  fetchDataDebounce: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileId: string;
  fileInfo: FileInfoV2;
  setIsViolation: React.Dispatch<React.SetStateAction<boolean>>;
  chunkRef: React.RefObject<HTMLDivElement>;
  setEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  enableChunk: (record: Chunk, checked: boolean) => void;
  moreTagsId: string[];
  setMoreTagsId: React.Dispatch<React.SetStateAction<string[]>>;
  setDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  showParameter: boolean;
  parameters: FileSummaryResponse;
  fileStatusMsg: string | null | undefined;
}> = ({
  chunks,
  setCurrentChunk,
  loadingData,
  isViolation,
  handleScroll,
  violationTotal,
  searchRef,
  fetchDataDebounce,
  fileId,
  fileInfo,
  setIsViolation,
  chunkRef,
  setEditModal,
  enableChunk,
  moreTagsId,
  setMoreTagsId,
  setDeleteModal,
  showParameter,
  parameters,
  fileStatusMsg,
}) => {
  const { t } = useTranslation();
  return (
    <div className="relative flex flex-1 w-full gap-6 pt-4 overflow-auto">
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-[#F0F3F9] rounded-md py-0.5 px-2 text-desc flex-shrink-0">
              {t('knowledge.violationParagraphs', { count: violationTotal })}
            </div>
            <div className="relative">
              <img
                src={search}
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
          {violationTotal > 0 && (
            <div className="flex items-center gap-4">
              <div
                className="flex items-center gap-1 text-[#6356EA] text-xs cursor-pointer"
                onClick={() => downloadExcel([fileId || ''], 1, fileInfo.name)}
              >
                <img src={download} className="w-4 h-4" alt="" />
                <span>{t('knowledge.downloadViolationDetails')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Switch
                  size="small"
                  className="list-switch"
                  checked={isViolation}
                  onChange={checked => setIsViolation(checked)}
                />
                <span>{t('knowledge.violationKnowledge')}</span>
              </div>
            </div>
          )}
        </div>
        <ChunkContent
          chunks={chunks}
          chunkRef={chunkRef}
          handleScroll={handleScroll}
          setCurrentChunk={setCurrentChunk}
          setEditModal={setEditModal}
          enableChunk={enableChunk}
          moreTagsId={moreTagsId}
          setMoreTagsId={setMoreTagsId}
          setDeleteModal={setDeleteModal}
          showParameter={showParameter}
          parameters={parameters}
          fileStatusMsg={fileStatusMsg}
        />
        {loadingData && <Spin className="mt-6" />}
      </div>
      <div
        className="h-full border-l border-[#E2E8FF] transition-all overflow-auto"
        style={{ width: showParameter ? '16%' : '0px' }}
      >
        <div className="w-full h-full px-6">
          <h2 className="text-2xl font-semibold text-second">
            {t('knowledge.technicalParameters')}
          </h2>
          <div className="flex flex-col gap-3 mt-3">
            <div className="flex flex-col">
              <div className="font-medium text-second">
                {t('knowledge.segmentIdentifier')}
              </div>
              <p className="text-[#757575] text-xl font-medium">
                {parameters.sliceType === 0
                  ? t('knowledge.automatic')
                  : t('knowledge.customized')}
              </p>
            </div>
            <div className="flex flex-col">
              <div className="font-medium text-second">
                {t('knowledge.hitCount')}
              </div>
              <p className="text-[#757575] text-xl font-medium">
                {parameters.hitCount}
              </p>
            </div>
            <div className="flex flex-col">
              <div className="font-medium text-second">
                {t('knowledge.paragraphLength')}
              </div>
              {fileStatusMsg === 'processing' ? (
                <p className="text-[#757575] text-xl font-medium">
                  {t('knowledge.progress')}
                </p>
              ) : (
                <p className="text-[#757575] text-xl font-medium">
                  {parameters.lengthRange && parameters.lengthRange[1]}{' '}
                  {t('knowledge.characters')}
                </p>
              )}
            </div>
            <div className="flex flex-col">
              <div className="font-medium text-second">
                {t('knowledge.averageParagraphLength')}
              </div>
              {fileStatusMsg === 'processing' ? (
                <p className="text-[#757575] text-xl font-medium">
                  {t('knowledge.progress')}
                </p>
              ) : (
                <p className="text-[#757575] text-xl font-medium">
                  {parameters.knowledgeAvgLength} {t('knowledge.characters')}
                </p>
              )}
            </div>
            <div className="flex flex-col">
              <div className="font-medium text-second">
                {t('knowledge.paragraphCount')}
              </div>
              {fileStatusMsg === 'processing' ? (
                <p className="text-[#757575] text-xl font-medium">
                  {t('knowledge.progress')}
                </p>
              ) : (
                <p className="text-[#757575] text-xl font-medium">
                  {parameters.knowledgeCount} {t('knowledge.paragraphs')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChunkContent: FC<{
  chunks: Chunk[];
  chunkRef: React.RefObject<HTMLDivElement>;
  handleScroll: () => void;
  setCurrentChunk: React.Dispatch<React.SetStateAction<Chunk>>;
  setEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  enableChunk: (record: Chunk, checked: boolean) => void;
  moreTagsId: string[];
  setMoreTagsId: React.Dispatch<React.SetStateAction<string[]>>;
  setDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  showParameter: boolean;
  parameters: FileSummaryResponse;
  fileStatusMsg: string | null | undefined;
}> = ({
  chunks,
  chunkRef,
  handleScroll,
  setCurrentChunk,
  setEditModal,
  enableChunk,
  moreTagsId,
  setMoreTagsId,
  setDeleteModal,
  showParameter,
  parameters,
  fileStatusMsg,
}) => {
  const { t } = useTranslation();
  return (
    <>
      {chunks.length > 0 && (
        <div
          className="flex-1 overflow-auto"
          ref={chunkRef}
          onScroll={handleScroll}
        >
          <div className="grid items-end gap-4 mt-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-4">
            {chunks.map((item: Chunk, index: number) => (
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
                    {['block', 'review'].includes(item.auditSuggest || '') && (
                      <div className="rounded border border-[#FFA19B] bg-[#fff5f4] px-2 py-1 text-[#E92215] text-xs mr-2.5">
                        {t('knowledge.violation')}
                      </div>
                    )}
                    <img src={order} className="w-3 h-3" alt="" />
                    <span
                      className="ml-1 text-xs text-[#F6B728]"
                      style={{ fontFamily: 'SF Pro Text, SF Pro Text-600' }}
                    >
                      00{index + 1}
                    </span>
                    {item.source === 1 && (
                      <div className="flex items-center">
                        <img src={useradd} className="w-3 h-3 ml-1.5" alt="" />
                        <span className="ml-1 text-desc">
                          {t('knowledge.manual')}
                        </span>
                      </div>
                    )}
                    <div className="items-center hidden group-hover:flex">
                      <img src={text} className="w-3 h-3 ml-1.5" alt="" />
                      <span className="ml-1 text-desc">
                        {item.content?.length}
                      </span>
                      <img src={target} className="w-3 h-3 ml-1.5" alt="" />
                      <span className="ml-1 text-desc">0</span>
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
                      disabled={['block', 'review'].includes(
                        item.auditSuggest || ''
                      )}
                      size="small"
                      checked={item.enabled ? true : false}
                      onChange={(checked, event) => {
                        event.stopPropagation();
                        enableChunk(item, checked);
                      }}
                      className="hidden ml-2 list-switch group-hover:block"
                    />
                  </div>
                </div>
                <div className="relative flex-1 mt-2 overflow-hidden text-sm text-second">
                  <div className="chunk-text-bg"></div>
                  <GlobalMarkDown
                    content={item.markdownContent}
                    isSending={false}
                  />
                </div>
                <div className="items-start justify-between hidden w-full mt-2 group-hover:flex">
                  {['block', 'review'].includes(item.auditSuggest || '') ? (
                    <div className="flex flex-1 overflow-hidden">
                      <span
                        className="flex-1 text-sm font-semibold text-overflow"
                        title={item.auditDetail}
                      >
                        {t('knowledge.violationReason', {
                          reason: item.auditDetail,
                        })}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center flex-1 list-tag">
                      {item.tagDtoList.map((t: TagDto, index) => {
                        if (index < 5) {
                          return (
                            <Tag
                              key={index}
                              className={
                                tagTypeClass.get(t.type as number) || ''
                              }
                            >
                              <span
                                className="max-w-[100px] text-overflow"
                                title={t.tagName}
                              >
                                {t.tagName}
                              </span>
                            </Tag>
                          );
                        } else {
                          return moreTagsId.includes(item.id) ? (
                            <Tag
                              key={index}
                              className={
                                tagTypeClass.get(t.type as number) || ''
                              }
                            >
                              <span
                                className="max-w-[100px] text-overflow"
                                title={t.tagName}
                              >
                                {t.tagName}
                              </span>
                            </Tag>
                          ) : null;
                        }
                      })}
                      {item.tagDtoList.length > 5 &&
                        !moreTagsId.includes(item.id) && (
                          <span
                            className="rounded-md inline-block bg-[#F0F3F9] px-2 py-1 h-6 text-desc mb-1 cursor-pointer"
                            onClick={e => {
                              e.stopPropagation();
                              moreTagsId.push(item.id);
                              setMoreTagsId([...moreTagsId]);
                            }}
                          >
                            +{item.tagDtoList.length - 5}
                          </span>
                        )}
                    </div>
                  )}
                  <div
                    className="w-6 h-6 border border-[#D7DFE9] flex justify-center items-center rounded-md cursor-pointer"
                    onClick={e => {
                      e.stopPropagation();
                      setCurrentChunk(item);
                      setDeleteModal(true);
                    }}
                  >
                    <img
                      src={del}
                      className="w-[14px] h-[14px]  flex-shrink-0"
                      alt=""
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default FilePage;
