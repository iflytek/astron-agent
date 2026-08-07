import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { typeList } from '@/constants';
import { generateType } from '@/utils/utils';

import arrowLeft from '@/assets/imgs/knowledge/icon_zhishi_arrow-left.png';
import block from '@/assets/imgs/knowledge/zhishi_target_block2.png';
import restart from '@/assets/imgs/knowledge/bnt_zhishi_restart.png';
import { FileInfoV2 } from '@/types/resource';
import { useProcessingCompletion } from '../hooks/use-processing-completion';

const ProcessingCompletion: FC<{
  tag: string;
  fileId: string;
  fileInfo: FileInfoV2;
  repoId: string;
  pid: string;
}> = ({ tag, fileId, fileInfo, repoId, pid }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { embed, parameters, embedding } = useProcessingCompletion({
    tag,
    fileId,
    repoId,
    pid,
  });
  return (
    <>
      <div className="flex w-full items-center pb-4 border-b border-[#E2E8FF] h-[57px]">
        <img
          src={arrowLeft}
          className="cursor-pointer w-7 h-7"
          onClick={() => navigate(-1)}
          alt=""
        />
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
        </span>
      </div>
      <div className="flex flex-1 gap-6 pt-4">
        <div className="flex justify-center flex-1 pt-6">
          <div className="max-w-[1000px] w-full">
            <div className="w-3/4 mx-auto">
              <div className="flex items-end text-lg font-medium text-second">
                <span className="leading-none">
                  {embed === 'failed'
                    ? t('knowledge.embeddingFailed')
                    : t('knowledge.fileParsingEmbedding')}
                </span>
                {embed === 'failed' && (
                  <div
                    className="flex items-end cursor-pointer"
                    onClick={() => embedding()}
                  >
                    <img src={restart} className="w-4 h-4 ml-2" alt="" />
                    <span className="ml-1.5 text-[#6356EA] text-xs">
                      {t('knowledge.retry')}
                    </span>
                  </div>
                )}
              </div>
              <div
                className={`w-full ${
                  embed === 'failed' ? 'bg-[#fef6f5]' : 'bg-[#F6F6FD]'
                } rouned-xl p-2.5 flex items-center justify-between mt-3`}
              >
                <div className="flex items-center">
                  <img
                    src={typeList.get(
                      generateType(fileInfo?.type?.toLowerCase()) || ''
                    )}
                    className="w-[22px] h-[22px]"
                    alt=""
                  />
                  <span className="text-xs text-second ml-2.5">
                    {fileInfo?.name}
                  </span>
                </div>
                {/* <Progress className='w-[60px] upload-progress' percent={30} /> */}
              </div>
            </div>
            <div className="mt-9">
              <div className="flex items-end text-lg font-medium text-second">
                <span>{t('knowledge.segmentPreview')}</span>
                <span className="ml-2 text-sm text-desc">
                  {t('knowledge.segmentPreviewWillBeAvailableAfterEmbedding')}
                </span>
              </div>
            </div>
            <div className="flex w-full gap-4 mt-3">
              <div className="flex-1">
                <img src={block} className="w-full" />
              </div>
              <div className="flex-1">
                <img src={block} className="w-full" />
              </div>
              <div className="flex-1">
                <img src={block} className="w-full" />
              </div>
            </div>
          </div>
        </div>
        {embed === 'failed' && (
          <div
            className="h-full border-l border-[#E2E8FF] p-6"
            style={{ width: '35%' }}
          >
            <h2 className="text-2xl font-semibold text-second">
              {t('knowledge.technicalParameters')}
            </h2>
            <div className="grid grid-cols-2 mt-3">
              <div className="flex flex-col">
                <div className="font-medium text-second">
                  {t('knowledge.segmentationRules')}
                </div>
                <p className="text-[#757575] text-xl font-medium">
                  {parameters.sliceType === 0
                    ? t('knowledge.automatic')
                    : t('knowledge.customized')}
                </p>
              </div>
              <div className="flex flex-col">
                <div className="font-medium text-second">
                  {t('knowledge.paragraphLength')}
                </div>
                <p className="text-[#757575] text-xl font-medium">
                  {parameters.lengthRange && parameters.lengthRange[1]}{' '}
                  {t('knowledge.characters')}
                </p>
              </div>
              <div className="flex flex-col mt-6">
                <div className="font-medium text-second">
                  {t('knowledge.averageParagraphLength')}
                </div>
                <p className="text-[#757575] text-xl font-medium">
                  {parameters.knowledgeAvgLength} {t('knowledge.characters')}
                </p>
              </div>
              <div className="flex flex-col mt-6">
                <div className="font-medium text-second">
                  {t('knowledge.paragraphCount')}
                </div>
                <p className="text-[#757575] text-xl font-medium">
                  {parameters.knowledgeCount} {t('knowledge.paragraphs')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProcessingCompletion;
