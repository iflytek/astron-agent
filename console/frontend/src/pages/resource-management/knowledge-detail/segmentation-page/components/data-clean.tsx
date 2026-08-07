import React, { FC } from 'react';
import { Button, Input, InputNumber, Select } from 'antd';

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { typeList } from '@/constants';
import { downloadExcel, generateType } from '@/utils/utils';
import Lottie from 'lottie-react';
import GlobalMarkDown from '@/components/global-markdown';

import jiexiAnimation from '@/constants/lottie-react/jiexi.json';
import setting from '@/assets/imgs/knowledge/icon_zhishi_datawashing_setting.png';
import quote from '@/assets/imgs/knowledge/icon_zhishi_datawashing_index.png';
import preview from '@/assets/imgs/knowledge/icon_zhishi_datawashing_preview.png';
import check from '@/assets/imgs/knowledge/icon_dialog_check.png';
import order from '@/assets/imgs/knowledge/icon_zhishi_order.png';
import text from '@/assets/imgs/knowledge/icon_zhishi_text.png';
import arrowLeft from '@/assets/imgs/knowledge/icon_zhishi_arrow-left.png';
import arrowRight from '@/assets/imgs/knowledge/icon_zhishi_datawashing_rightarow.png';
import arrowDown from '@/assets/imgs/knowledge/icon_zhishi_datawashing_downarow.png';

import download from '@/assets/imgs/knowledge/icon_zhishi_download.png';
import dataCleanWait from '@/assets/imgs/knowledge/data-clean-wait.svg';
import { Chunk, FileInfoV2, FileSummaryResponse } from '@/types/resource';
import { useDataClean } from './hooks/use-data-clean';

const DataClean: FC<{
  tag: string;
  setStep: (step: number) => void;
  fileId: string;
  fileInfo: FileInfoV2;
  sliceData: FileSummaryResponse;
  repoId: string;
  pid: string;
}> = ({ tag, setStep, fileId, fileInfo, sliceData, repoId, pid }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    chunkRef,
    configDetail,
    setConfigDetail,
    handleSave,
    sliceType,
    knowledgeSelectRef,
    failedList,

    violationIds,
    setViolationIds,
    violationTotal,

    open,
    initConfig,
    setOpen,
    seperatorsOptions,
    lengthRange,
    saveDisable,
    saveLoading,
    total,
    slicing,
    sliceFile,
    selectDefault,
    selectCustom,
    chunks,
  } = useDataClean({
    tag,
    sliceData,
    fileId,
    fileInfo,
    repoId,
    pid,
  });
  return (
    <>
      <div className="flex w-full justify-between items-center pb-4 border-b border-[#E2E8FF] h-[57px]">
        <div className="flex items-center">
          <img
            src={arrowLeft}
            className="cursor-pointer w-7 h-7"
            onClick={() => navigate(-1)}
            alt=""
          />
          <h2 className="ml-3 text-2xl font-semibold text-second">
            {t('knowledge.dataSettings')}
          </h2>
          <span
            className="ml-4 flex items-center bg-[#F9FAFB] px-3.5 py-2.5 w-[400px]"
            style={{ borderRadius: 10 }}
          >
            <img
              src={typeList.get(
                generateType(fileInfo?.type?.toLowerCase()) || ''
              )}
              className="w-[22px] h-[22px] flex-shrink-0"
              alt=""
            />
            <p className="flex-1 ml-2 text-overflow">{fileInfo?.name}</p>
            {failedList.length > 0 && (
              <span className="ml-2 text-desc">{t('knowledge.parseFail')}</span>
            )}
          </span>
        </div>
        <div className="flex">
          {/* <Button type='text' className='second-btn w-[125px] h-10' onClick={() => setStep(1)}>重置</Button> */}
          <Button
            type="default"
            disabled={slicing || failedList.length > 0}
            className="h-10 px-6 ml-3"
            onClick={() => setStep(2)}
          >
            {t('knowledge.nextStep')}
          </Button>
          <Button
            type="primary"
            className="h-10 px-6 ml-3 primary-btn"
            disabled={saveDisable}
            loading={saveLoading}
            onClick={handleSave}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
      <div className="flex flex-1 w-full gap-6 pt-4 overflow-hidden">
        <SegmentationSettings
          sliceType={sliceType}
          selectDefault={selectDefault}
          selectCustom={selectCustom}
          configDetail={configDetail}
          setConfigDetail={setConfigDetail}
          knowledgeSelectRef={knowledgeSelectRef}
          lengthRange={lengthRange}
          seperatorsOptions={seperatorsOptions}
          open={open}
          setOpen={setOpen}
          initConfig={initConfig}
          sliceFile={sliceFile}
        />
        <SegmentPreview
          slicing={slicing}
          violationTotal={violationTotal}
          total={total}
          fileId={fileId}
          fileInfo={fileInfo}
          sliceType={sliceType}
          chunkRef={chunkRef}
          chunks={chunks}
          violationIds={violationIds}
          setViolationIds={setViolationIds}
        />
      </div>
    </>
  );
};

export const SegmentationSettings: FC<{
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
  knowledgeSelectRef: React.RefObject<HTMLDivElement>;
  lengthRange: number[];
  seperatorsOptions: { label: string; value: string }[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initConfig: () => void;
  sliceFile: () => void;
}> = ({
  sliceType,
  selectDefault,
  selectCustom,
  configDetail,
  knowledgeSelectRef,
  setConfigDetail,
  lengthRange,
  seperatorsOptions,
  open,
  setOpen,
  initConfig,
  sliceFile,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center flex-1 h-full pt-6 overflow-auto">
      <div className="w-full px-6">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-[#e8e1e9] rounded-md flex items-center justify-center">
            <img src={setting} className="w-5 h-5" alt="" />
          </div>
          <span className="ml-3 text-lg font-semibold text-second">
            {t('knowledge.segmentSettings')}
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
              {t('knowledge.autoSegmentAndClean')}
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
          onClick={() => {
            selectCustom();
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium text-second">
                {t('knowledge.custom')}
              </h2>
              <p className="mt-2 text-desc">
                {t('knowledge.customDescription')}
              </p>
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
              <div ref={knowledgeSelectRef} className="relative mt-1.5">
                <Input
                  value={configDetail.seperator}
                  onChange={event => {
                    configDetail.seperator = event.target.value;
                    setConfigDetail({ ...configDetail });
                  }}
                  placeholder={t('knowledge.pleaseEnter')}
                  className="absolute top-0 left-0 z-10 global-input"
                  onFocus={() => setOpen(true)}
                  // onBlur={() => setOpen(false)}
                />
                <Select
                  open={open}
                  className="w-full global-select knowledge-select"
                  placeholder={t('knowledge.enterOrSelect')}
                  value={configDetail.seperator}
                  onSelect={value => {
                    configDetail.seperator = value;
                    setConfigDetail({ ...configDetail });
                    setOpen(false);
                  }}
                  options={seperatorsOptions}
                  fieldNames={{ label: 'name', value: 'symbol' }}
                />
              </div>
              <div className="mt-6 text-sm font-medium text-second">
                {t('knowledge.segmentLength')}{' '}
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
                      configDetail.min = value;
                      setConfigDetail({ ...configDetail });
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
                      configDetail.max = value;
                      setConfigDetail({ ...configDetail });
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
                  onClick={() => sliceFile()}
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
        <div className="flex items-center mt-9">
          <div className="w-8 h-8 bg-[#e8e1e9] rounded-md flex items-center justify-center">
            <img src={quote} className="w-5 h-5" alt="" />
          </div>
          <span className="ml-3 text-lg font-semibold text-second">
            {t('knowledge.indexingMethod')}
          </span>
        </div>
        {/* <div className='mt-3 text-desc'>
      要更改索引方法，请转到 <span className='text-[#6356EA] cursor-pointer'>知识库设置</span>
    </div> */}
        <div className="mt-3 border border-[#009dff] rounded-lg px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-second">
              {t('knowledge.highQuality')}
            </h2>
            <p className="mt-2 text-desc">
              {t('knowledge.highQualityDescription')}
            </p>
            {/* <p className='mt-2 text-desc'>
          执行嵌入预估消耗 <span className='text-[#1F2A37]' style={{ fontFamily: 'SF Pro Text, SF Pro Text-500' }}>8,665 tokens(<span className='text-[#13A10E]'>$0.0008665</span>)</span>
        </p> */}
          </div>
          {/* <div className='w-5 h-5 bg-[#6356EA] rounded-full flex justify-center items-center'>
        <img src={check} className="w-4 h-4" alt="" />
      </div> */}
        </div>
      </div>
    </div>
  );
};

export const SegmentPreview: FC<{
  sliceType: string;
  chunkRef: React.RefObject<HTMLDivElement>;
  chunks: Chunk[];
  violationIds: string[];
  setViolationIds: React.Dispatch<React.SetStateAction<string[]>>;
  slicing: boolean;
  violationTotal: number;
  total: number;
  fileId: string;
  fileInfo: FileInfoV2;
}> = ({
  sliceType,
  chunkRef,
  chunks,
  violationIds,
  setViolationIds,
  slicing,
  violationTotal,
  total,
  fileId,
  fileInfo,
}) => {
  const { t } = useTranslation();

  return (
    <div className="h-full relative w-1/3 min-w-[516px] border-l border-[#E2E8FF] p-6 pt-[68px] pb-0">
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
            <>
              {/* <img src={info} className='w-[18px] h-[18px] ml-1' alt="" /> */}
              <span className="text-desc text-sm mt-1.5 ml-2">
                ({t('knowledge.violationCount', { count: violationTotal })}/
                {t('knowledge.totalCount', { count: total })})
              </span>
            </>
          ) : (
            <span className="text-desc text-[12px] ml-2">
              {t('knowledge.saveTip')}
            </span>
          )}
        </div>
        {!slicing && violationTotal > 0 && (
          <div
            className="flex items-center gap-1 text-[#6356EA] text-xs cursor-pointer"
            onClick={() => downloadExcel([fileId], 0, fileInfo?.name)}
          >
            <img src={download} className="w-4 h-4" alt="" />
            <span>{t('knowledge.downloadViolationDetails')}</span>
          </div>
        )}
      </div>
      {!slicing && (
        <div
          className="flex flex-col h-full gap-4 overflow-auto"
          ref={chunkRef}
        >
          {chunks.map((item, index) => (
            <div key={index} className="rounded-xl bg-[#F6F6FD] p-4">
              <div className="flex items-center">
                <div className="flex items-center flex-1 overflow-hidden">
                  {['block', 'review'].includes(item.auditSuggest || '') && (
                    <div className="rounded border border-[#FFA19B] bg-[#fff5f4] px-2 py-1 text-[#E92215] text-xs mr-2.5">
                      {t('knowledge.violation')}
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
                    src={typeList.get(
                      generateType(
                        (item.fileInfoV2 &&
                          item.fileInfoV2.type?.toLowerCase()) ||
                          ''
                      ) || ''
                    )}
                    className="w-4 h-4 ml-1"
                    alt=""
                  />
                  <div
                    className="flex-1 ml-1 text-xs font-medium text-overflow text-second"
                    title={item.fileInfoV2 && item.fileInfoV2.name}
                  >
                    {item.fileInfoV2 && item.fileInfoV2.name}
                  </div>
                </div>
                <div className="flex items-center">
                  <img src={text} className="w-3 h-3 ml-2" alt="" />
                  <span className="ml-1 text-desc">{item.content?.length}</span>
                </div>
              </div>
              <GlobalMarkDown
                content={item.markdownContent}
                isSending={false}
              />
              {['block', 'review'].includes(item.auditSuggest || '') && (
                <div className="w-full flex mt-2 border-t border-[#E2E8FF] py-2 text-[#000] text-sm font-semibold gap-1 overflow-hidden">
                  <img
                    src={
                      violationIds.includes(item.id) ? arrowDown : arrowRight
                    }
                    className="w-4 h-4 cursor-pointer mt-0.5"
                    alt=""
                    onClick={e => {
                      e.stopPropagation();
                      if (violationIds.includes(item.id)) {
                        const newViolationIds = violationIds.filter(
                          v => v != item.id
                        );
                        setViolationIds([...newViolationIds]);
                      } else {
                        violationIds.push(item.id);
                        setViolationIds([...violationIds]);
                      }
                    }}
                  />
                  {!violationIds.includes(item.id) && (
                    <span
                      className="max-w-[400px] text-overflow"
                      title={item.auditDetail}
                    >
                      {t('knowledge.violationReason') + item.auditDetail}
                    </span>
                  )}
                  {violationIds.includes(item.id) && (
                    <span className="max-w-[400px]">
                      {t('knowledge.violationReason') + item.auditDetail}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {slicing && (
        <div className="flex flex-col h-full gap-4 overflow-auto">
          <div className="bg-[#F8FAFF] rounded-xl w-[450px] p-4 relative">
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
          <div className="bg-[#F8FAFF] rounded-xl w-[450px] p-4 relative">
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
        </div>
      )}
    </div>
  );
};

export default DataClean;
