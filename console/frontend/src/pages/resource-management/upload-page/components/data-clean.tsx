import React, { FC } from 'react';
import { Button, Input, InputNumber } from 'antd';
import { useTranslation } from 'react-i18next';
import Lottie from 'lottie-react';
import GlobalMarkDown from '@/components/global-markdown';
import { typeList } from '@/constants';
import { downloadExcel, generateType } from '@/utils/utils';
import {
  Chunk,
  FileStatusResponse,
  FlexibleType,
  RepoItem,
  UploadFile,
} from '@/types/resource';
import { useDataClean } from './hooks/use-data-clean';
import { useFileDisplay } from './hooks/use-file-display';
import { useKnowledgeSelect } from './hooks/use-knowledge-select';

// Images
import jiexiAnimation from '@/constants/lottie-react/jiexi.json';
import setting from '@/assets/imgs/knowledge/icon_zhishi_datawashing_setting.png';
import quote from '@/assets/imgs/knowledge/icon_zhishi_datawashing_index.png';
import preview from '@/assets/imgs/knowledge/icon_zhishi_datawashing_preview.png';
import check from '@/assets/imgs/knowledge/icon_dialog_check.png';
import order from '@/assets/imgs/knowledge/icon_zhishi_order.png';
import text from '@/assets/imgs/knowledge/icon_zhishi_text.png';
import select from '@/assets/imgs/knowledge/icon_nav_dropdown.png';
import restart from '@/assets/imgs/knowledge/bnt_zhishi_restart.png';
import arrowRight from '@/assets/imgs/knowledge/icon_zhishi_datawashing_rightarow.png';
import arrowDown from '@/assets/imgs/knowledge/icon_zhishi_datawashing_downarow.png';
import download from '@/assets/imgs/knowledge/icon_zhishi_download.png';
import dataCleanWait from '@/assets/imgs/knowledge/data-clean-wait.svg';

interface DataCleanProps {
  tag: string;
  setSparkFiles: React.Dispatch<React.SetStateAction<UploadFile[]>>;
  knowledgeDetail: RepoItem;
  setStep: (step: number) => void;
  uploadList: UploadFile[];
  repoId: string;
  lengthRange: number[];
  customConfig: Record<string, FlexibleType>;
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
  saveDisabled: boolean;
  setSaveDisabled: (disabled: boolean) => void;
  failedList: FileStatusResponse[];
  setFailedList: (list: FileStatusResponse[]) => void;
  seperatorsOptions: Record<string, FlexibleType>[];
  setNewSaveDisabled: (disabled: boolean) => void;
}

// 文件头部组件
const FileHeader: React.FC<{
  importType: string;
  uploadList: UploadFile[];
  linkList: string[];
  showMore: boolean;
  setShowMore: (show: boolean) => void;
}> = ({ importType, uploadList, linkList, showMore, setShowMore }) => {
  const { t } = useTranslation();

  if (importType === 'text') {
    return (
      <div
        className="relative ml-4 w-[400px] px-3.5 py-2.5 bg-[#EFF1F9] flex items-center"
        style={{ borderRadius: 10 }}
        onClick={event => {
          event.stopPropagation();
          setShowMore(!showMore);
        }}
      >
        <img
          src={typeList.get(uploadList[0]?.type || '')}
          className="w-[22px] h-[22px] flex-shrink-0"
          alt=""
        />
        <p
          className="flex-1 ml-2 text-sm font-medium text-overflow text-second"
          title={uploadList[0]?.name || ''}
        >
          {uploadList[0]?.name || ''}
        </p>
        {uploadList.length > 1 && (
          <span className="ml-2 text-desc">
            {t('knowledge.filesCount', { count: uploadList.length })}
          </span>
        )}
        {uploadList.length > 1 && (
          <img src={select} className="w-4 h-4 ml-2" alt="" />
        )}
        {showMore && uploadList.length > 1 && (
          <div className="absolute right-0 top-[42px] list-options py-3.5 pt-2 w-full z-10 max-h-[205px] overflow-auto">
            {uploadList.slice(1).map(item => (
              <div
                key={item.id}
                className="w-full px-5 py-1.5 pr-4 text-desc font-medium hover:bg-[#F9FAFB] flex items-center"
              >
                <img
                  src={typeList.get(item.type || '')}
                  className="flex-shrink-0 w-4 h-4"
                  alt=""
                />
                <span className="ml-2.5 flex-1 text-overflow" title={item.name}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (importType === 'web') {
    return (
      <div
        className="relative ml-4 w-[400px] px-3.5 py-2.5 bg-[#EFF1F9] flex items-center"
        style={{ borderRadius: 10 }}
        onClick={event => {
          event.stopPropagation();
          setShowMore(!showMore);
        }}
      >
        <p
          className="flex-1 ml-2 text-sm font-medium text-overflow text-second"
          title={linkList[0]}
        >
          {linkList[0]}
        </p>
        {linkList.length > 1 && (
          <span className="ml-2 text-desc">
            {t('knowledge.filesCount', { count: linkList.length })}
          </span>
        )}
        {linkList.length > 1 && (
          <img src={select} className="w-4 h-4 ml-2" alt="" />
        )}
        {showMore && linkList.length > 1 && (
          <div className="absolute right-0 top-[42px] list-options py-3.5 pt-2 w-full z-10">
            {linkList.slice(1).map((item, index) => (
              <div
                key={index}
                className="w-full px-5 py-1.5 pr-4 text-desc font-medium hover:bg-[#F9FAFB] cursor-pointer flex items-center"
              >
                <span className="ml-2.5 flex-1 text-overflow" title={item}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
};

// 失败文件展示组件
const FailedFilesSection: React.FC<{
  failedList: FileStatusResponse[];
  slicing: boolean;
  reTry: () => void;
}> = ({ failedList, slicing, reTry }) => {
  const { t } = useTranslation();

  if (failedList.length === 0 || slicing) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex items-center">
        <span>{t('knowledge.failedCount', { count: failedList.length })}</span>
        <div
          className="flex items-center text-[#757575] text-xs cursor-pointer"
          onClick={reTry}
        >
          <img src={restart} className="w-4 h-4" alt="" />
          <p className="ml-1.5">{t('knowledge.retry')}</p>
        </div>
      </div>
      {failedList.map(u => (
        <div
          key={u.id}
          className="bg-[#fef6f5] rounded-xl p-2.5 flex items-center gap-2 justify-between mt-2"
        >
          <div className="flex items-center overflow-hidden">
            <img
              src={typeList.get(
                generateType(u.type?.toLowerCase() || '') || ''
              )}
              className="w-[22px] h-[22px]"
              alt=""
            />
            <div
              className="text-second text-sm ml-2.5 max-w-[500px] text-overflow"
              title={u.name}
            >
              {u.name}
            </div>
          </div>
          <p className="flex-1 text-desc text-overflow" title={u?.reason}>
            {u?.reason}
          </p>
        </div>
      ))}
    </div>
  );
};

// 分割设置组件
const SegmentationSettings: React.FC<{
  sliceType: string;
  selectDefault: () => void;
  selectCustom: () => void;
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
  lengthRange: number[];
  seperatorsOptions: Record<string, FlexibleType>[];
  open: boolean;
  setOpen: (open: boolean) => void;
  knowledgeSelectRef: React.RefObject<HTMLDivElement>;
  customSlice: () => void;
  initConfig: () => void;
}> = ({
  sliceType,
  selectDefault,
  selectCustom,
  configDetail,
  setConfigDetail,
  lengthRange,
  seperatorsOptions,
  open,
  setOpen,
  knowledgeSelectRef,
  customSlice,
  initConfig,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex items-center">
        <div className="w-8 h-8 bg-[#e8e1e9] rounded-md flex items-center justify-center">
          <img src={setting} className="w-5 h-5" alt="" />
        </div>
        <span className="ml-3 text-lg font-semibold text-second">
          {t('knowledge.segmentationSettings')}
        </span>
      </div>
      <div
        className={`mt-3 border border-${
          sliceType === 'default' ? '[#009dff]' : '[#e7ecff]'
        } rounded-lg px-6 py-4 cursor-pointer flex justify-between items-center`}
        onClick={selectDefault}
      >
        <div>
          <h2 className="text-xl font-medium text-second">
            {t('knowledge.autoSegmentationAndCleaning')}
          </h2>
          <p className="mt-2 text-desc">
            {t('knowledge.autoSegmentationAndCleaningDesc')}
          </p>
        </div>
        <div className="w-5 h-5 bg-[#6356EA] rounded-full flex justify-center items-center">
          {sliceType === 'default' ? (
            <img src={check} className="w-4 h-4" alt="" />
          ) : (
            <span className="border border-[#d3d3d3] w-5 h-5 rounded-full bg-[#EFF1F9]"></span>
          )}
        </div>
      </div>
      <div
        className={`mt-3 border border-${
          sliceType === 'custom' ? '[#009dff]' : '[#e7ecff]'
        } rounded-lg px-6 py-4 cursor-pointer`}
        onClick={selectCustom}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-second">
              {t('knowledge.custom')}
            </h2>
            <p className="mt-2 text-desc">{t('knowledge.customDesc')}</p>
          </div>
          <div className="w-5 h-5 bg-[#6356EA] rounded-full flex justify-center items-center">
            {sliceType === 'custom' ? (
              <img src={check} className="w-4 h-4" alt="" />
            ) : (
              <span className="border border-[#d3d3d3] w-5 h-5 rounded-full bg-[#EFF1F9]"></span>
            )}
          </div>
        </div>
        {sliceType === 'custom' && (
          <div className="mt-5">
            <div className="text-sm font-medium text-second">
              {t('knowledge.segmentIdentifier')}
            </div>
            <div ref={knowledgeSelectRef} className="relative mt-1.5 h-[40px]">
              <Input
                value={configDetail.seperator}
                onChange={event => {
                  const newConfig = { ...configDetail };
                  newConfig.seperator = event.target.value;
                  setConfigDetail(newConfig);
                }}
                placeholder={t('knowledge.pleaseEnter')}
                className="absolute top-0 left-0 z-10 global-input"
                onFocus={() => setOpen(true)}
              />
            </div>
            <div className="mt-6 text-sm font-medium text-second">
              {t('knowledge.segmentLength')}
              <span className="text-xs text-desc">
                {t('knowledge.supportSegmentLength', {
                  min: lengthRange[0],
                  max: lengthRange[1],
                })}
              </span>
            </div>
            <div className="flex items-center mt-1.5">
              <InputNumber
                min={lengthRange[0] || 0}
                max={lengthRange[1] || 0}
                controls={false}
                value={configDetail.min}
                onChange={value => {
                  if (value) {
                    const newConfig = { ...configDetail };
                    newConfig.min = value as number;
                    setConfigDetail(newConfig);
                  }
                }}
                placeholder={t('knowledge.pleaseEnter')}
                className="global-input w-[141px] py-1"
              />
              <span className="w-5 h-[1px] bg-[#d3d3d3] mx-2"></span>
              <InputNumber
                min={lengthRange[0] || 0}
                max={lengthRange[1] || 0}
                value={configDetail.max}
                onChange={value => {
                  if (value) {
                    const newConfig = { ...configDetail };
                    newConfig.max = value;
                    setConfigDetail(newConfig);
                  }
                }}
                controls={false}
                placeholder={t('knowledge.pleaseEnter')}
                className="global-input w-[141px] py-1"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <Button
                type="primary"
                className="primary-btn w-[90px] h-10"
                onClick={() => customSlice()}
              >
                {t('knowledge.preview')}
              </Button>
              <Button
                type="text"
                className="second-btn w-[90px] h-10"
                onClick={() => initConfig()}
              >
                {t('knowledge.reset')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// 索引方法组件
const IndexingMethod: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex items-center mt-9">
        <div className="w-8 h-8 bg-[#e8e1e9] rounded-md flex items-center justify-center">
          <img src={quote} className="w-5 h-5" alt="" />
        </div>
        <span className="ml-3 text-lg font-semibold text-second">
          {t('knowledge.indexingMethod')}
        </span>
      </div>
      <div className="mt-3 border border-[#009dff] rounded-lg px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-medium text-second">
            {t('knowledge.highQuality')}
          </h2>
          <p className="mt-2 text-desc">{t('knowledge.highQualityDesc')}</p>
        </div>
      </div>
    </>
  );
};

// 分段预览组件头部
const SegmentPreviewHeader: React.FC<{
  sliceType: string;
  slicing: boolean;
  violationTotal: number;
  total: number;
  fileIds: (string | number)[];
  knowledgeDetail: RepoItem;
}> = ({
  sliceType,
  slicing,
  violationTotal,
  total,
  fileIds,
  knowledgeDetail,
}) => {
  const { t } = useTranslation();

  return (
    <div className="absolute left-0 flex items-center justify-between w-full px-6 top-6">
      <div className="flex items-center">
        <div className="w-8 h-8 bg-[rgba(22,82,216,0.05)] rounded-md flex items-center justify-center">
          <img src={preview} className="w-5 h-5" alt="" />
        </div>
        <span className="ml-3 text-lg font-semibold text-second">
          {t('knowledge.segmentPreview')}
        </span>
        {sliceType && (
          <span className="ml-3 h-[20px] px-2 leading-[20px] text-[10px] text-[#FFFFFF] rounded-[4px] bg-[#3DC253]">
            {sliceType === 'default'
              ? t('knowledge.automatic')
              : t('knowledge.customized')}
          </span>
        )}
        {!slicing ? (
          <span className="text-desc text-sm mt-1.5 ml-2">
            ({t('knowledge.violationCount', { count: violationTotal })}/
            {t('knowledge.totalCount', { count: total })})
          </span>
        ) : (
          <span className="text-desc text-[12px] ml-2">
            {t('knowledge.saveTip')}
          </span>
        )}
      </div>
      {!slicing && violationTotal > 0 && (
        <div
          className="flex items-center gap-1 text-[#6356EA] text-xs cursor-pointer"
          onClick={() => downloadExcel(fileIds, 0, knowledgeDetail.name)}
        >
          <img src={download} className="w-4 h-4" alt="" />
          <span>{t('knowledge.downloadViolationDetails')}</span>
        </div>
      )}
    </div>
  );
};

// 分段预览内容区域
const SegmentPreviewContent: React.FC<{
  slicing: boolean;
  chunkRef: React.RefObject<HTMLDivElement>;
  chunks: Chunk[];
  violationIds: string[];
  setViolationIds: React.Dispatch<React.SetStateAction<string[]>>;
}> = ({ slicing, chunkRef, chunks, violationIds, setViolationIds }) => {
  const { t } = useTranslation();

  const handleViolationToggle = (itemId: string): void => {
    if (violationIds.includes(itemId)) {
      const newViolationIds = violationIds.filter(v => v !== itemId);
      setViolationIds([...newViolationIds]);
    } else {
      violationIds.push(itemId);
      setViolationIds([...violationIds]);
    }
  };

  if (slicing) {
    return (
      <div className="flex flex-col h-full gap-4 overflow-auto">
        {[1, 2].map(index => (
          <div
            key={index}
            className="bg-[#F8FAFF] rounded-xl w-[450px] p-4 relative"
          >
            <Lottie
              animationData={jiexiAnimation}
              loop={true}
              autoplay={true}
              style={{ width: '100%', height: 'auto' }}
            />
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[210px] h-[94px] bg-[#fff] rounded-2xl flex flex-col items-center justify-center gap-3">
              <img src={dataCleanWait} className="w-[18px] h-[18px]" alt="" />
              <p className="text-[#8FACFF] text-sm font-medium">
                {t('knowledge.slicing')}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 overflow-auto" ref={chunkRef}>
      {chunks.map((item, index) => (
        <div key={item.id} className="rounded-xl bg-[#F6F6FD] p-4">
          <div className="flex items-center">
            <div className="flex items-center flex-1 overflow-hidden">
              {['block', 'review'].includes(item.auditSuggest || '') && (
                <div className="rounded border border-[#FFA19B] bg-[#fff5f4] px-2 py-1 text-[#E92215] text-xs mr-2.5">
                  违规
                </div>
              )}
              <img src={order} className="w-3 h-3" alt="" />
              <span
                className="text-xs text-[#F6B728]"
                style={{
                  fontFamily: 'SF Pro Text, SF Pro Text-600',
                  fontStyle: 'italic',
                }}
              >
                00{index + 1}
              </span>
              <img
                src={
                  item.fileInfoV2 &&
                  typeList.get(
                    generateType(item.fileInfoV2.type?.toLowerCase()) || ''
                  )
                }
                className="w-4 h-4 ml-1"
                alt=""
              />
              <div className="flex-1 ml-1 text-xs font-medium text-overflow text-second">
                {item.fileInfoV2 && item.fileInfoV2.name}
              </div>
            </div>
            <div className="flex items-center">
              <img src={text} className="w-3 h-3 ml-2" alt="" />
              <span className="ml-1 text-desc">{item.charCount}</span>
            </div>
          </div>
          <GlobalMarkDown content={item.markdownContent} isSending={false} />
          {['block', 'review'].includes(item.auditSuggest || '') && (
            <div className="w-full flex mt-2 border-t border-[#E2E8FF] py-2 text-[#000] text-sm font-semibold gap-1 overflow-hidden">
              <img
                src={violationIds.includes(item.id) ? arrowDown : arrowRight}
                className="w-4 h-4 cursor-pointer mt-0.5"
                alt=""
                onClick={e => {
                  e.stopPropagation();
                  handleViolationToggle(item.id);
                }}
              />
              {!violationIds.includes(item.id) && (
                <span
                  className="max-w-[400px] text-overflow"
                  title={item.auditDetail}
                >
                  {t('knowledge.violationReason', {
                    reason: item.auditDetail,
                  })}
                </span>
              )}
              {violationIds.includes(item.id) && (
                <span className="max-w-[400px]">
                  {t('knowledge.violationReason', {
                    reason: item.auditDetail,
                  })}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// 主组件
const DataClean: FC<DataCleanProps> = props => {
  const {
    knowledgeDetail,
    uploadList,
    seperatorsOptions,
    fileIds,
    importType,
    sliceType,
    slicing,
    failedList,
  } = props;

  // 使用自定义 hooks
  const dataCleanHook = useDataClean(props);
  const { showMore, setShowMore } = useFileDisplay();
  const { open, setOpen, knowledgeSelectRef } = useKnowledgeSelect();

  const {
    chunkRef,
    configDetail,
    setConfigDetail,
    linkList,
    total,
    chunks,
    violationIds,
    setViolationIds,
    violationTotal,
    selectDefault,
    selectCustom,
    customSlice,
    initConfig,
    reTry,
  } = dataCleanHook;

  return (
    <>
      <div className="flex w-full justify-between items-center pb-4 border-b border-[#E2E8FF] h-[57px]">
        <div className="flex items-center">
          <FileHeader
            importType={importType}
            uploadList={uploadList}
            linkList={linkList}
            showMore={showMore}
            setShowMore={setShowMore}
          />
        </div>
      </div>
      <div className="flex flex-1 w-full gap-6 pt-4 overflow-hidden">
        <div className="flex flex-col items-center flex-1 h-full pt-6 overflow-auto">
          <div className="w-full px-6">
            <FailedFilesSection
              failedList={failedList}
              slicing={slicing}
              reTry={reTry}
            />
            <SegmentationSettings
              sliceType={sliceType}
              selectDefault={selectDefault}
              selectCustom={selectCustom}
              configDetail={configDetail}
              setConfigDetail={setConfigDetail}
              lengthRange={props.lengthRange}
              seperatorsOptions={seperatorsOptions}
              open={open}
              setOpen={setOpen}
              knowledgeSelectRef={knowledgeSelectRef}
              customSlice={customSlice}
              initConfig={initConfig}
            />
            <IndexingMethod />
          </div>
        </div>
        <div className="h-full relative w-1/3 min-w-[516px] border-l border-[#E2E8FF] p-6 pt-[68px] pb-0">
          <SegmentPreviewHeader
            sliceType={sliceType}
            slicing={slicing}
            violationTotal={violationTotal}
            total={total}
            fileIds={fileIds}
            knowledgeDetail={knowledgeDetail}
          />
          <SegmentPreviewContent
            slicing={slicing}
            chunkRef={chunkRef}
            chunks={chunks}
            violationIds={violationIds}
            setViolationIds={setViolationIds}
          />
        </div>
      </div>
    </>
  );
};

export default DataClean;
