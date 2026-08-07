import { typeList } from '@/constants';
import {
  FileStatusResponse,
  FileSummaryResponse,
  RepoItem,
  UploadFile,
} from '@/types/resource';
import { generateType } from '@/utils/utils';
import { Progress } from 'antd';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

export const ProcessingCompletionInfo: FC<{
  knowledgeDetail: RepoItem;
  embed: string;
  failedList: FileStatusResponse[];
  progress: number;
  parameters: FileSummaryResponse;
  conglt: string;
  reTry: () => void;
  uploadList: UploadFile[];
  restart: string;
}> = props => {
  const { t } = useTranslation();
  const {
    knowledgeDetail,
    embed,
    failedList,
    progress,
    parameters,
    conglt,
    reTry,
    uploadList,
    restart,
  } = props;
  return (
    <div className="flex-1 pt-10 overflow-auto">
      <div className="h-full flex flex-col items-center">
        <div>
          <div className="flex flex-col justify-center items-center">
            <img src={conglt} className="w-12 h-12" alt="" />
            <div className="text-second text-xl text-medium mt-2">
              {t('knowledge.knowledgeBaseCreated')}
            </div>
            <div className="mt-4 bg-[#F6F6FD] w-[324px] text-center py-2 text-second text-sm text-medium">
              {knowledgeDetail.name}
            </div>
            <div className="text-desc mt-4">
              {t('knowledge.documentsUploaded')}
            </div>
          </div>
        </div>
        <div>
          <div className="text-second font-medium text-lg mt-8 flex">
            <span>
              {embed === 'loading'
                ? t('knowledge.fileParsingEmbedding')
                : embed === 'success'
                  ? t('knowledge.embeddingCompleted')
                  : t('knowledge.embeddingFailed')}
            </span>
            {failedList.length > 0 && embed !== 'loading' && (
              <div className="flex mt-0.5 pb-1">
                <span className="text-desc ml-2 h-full">
                  {t('knowledge.documentsEmbeddingFailed', {
                    count: failedList.length,
                  })}
                </span>
                <div
                  className="flex cursor-pointer items-center"
                  onClick={reTry}
                >
                  <img src={restart} className="w-4 h-4 ml-3" alt="" />
                  <p className="text-desc text-[#6356EA] ml-1.5">
                    {t('knowledge.retry')}
                  </p>
                </div>
              </div>
            )}
          </div>
          {(embed === 'loading' || failedList.length === 0) && (
            <div
              className={`mt-2 rounded-xl w-[766px] px-2.5 py-3 flex items-center justify-between`}
              style={{
                background: embed === 'loading' ? '#f6f6fd' : '#f4fcf8',
              }}
            >
              <div className="flex items-center">
                <img
                  src={typeList.get(uploadList?.[0]?.type || '')}
                  className="w-[22px] h-[22px]"
                  alt=""
                />
                <p className="text-desc ml-2.5 text-second">
                  {uploadList[0]?.name}
                </p>
                {uploadList.length > 1 && (
                  <p className="text-desc ml-2.5">
                    {t('knowledge.filesCount', { count: uploadList.length })}
                  </p>
                )}
              </div>
              {embed === 'loading' && (
                <Progress
                  className="w-[60px] upload-progress"
                  percent={progress}
                />
              )}
            </div>
          )}
          {embed !== 'loading' && (
            <div>
              {failedList.map(u => (
                <div
                  key={u.id}
                  className="bg-[#fef6f5] rounded-xl p-2.5 flex items-center justify-between mt-2 w-[766px]"
                >
                  <div className="flex items-center">
                    <img
                      src={typeList.get(
                        generateType(u.type?.toLowerCase() || '') || ''
                      )}
                      className="w-[22px] h-[22px]"
                      alt=""
                    />
                    <div className="text-second text-sm ml-2.5 max-w-[500px] text-overflow">
                      {u.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {embed !== 'loading' && (
            <div className="mt-8 grid grid-cols-4 gap-2">
              <div>
                <h3 className="text-second font-medium">
                  {t('knowledge.segmentationRules')}
                </h3>
                <p className="text-[#757575] text-xl font-medium">
                  {parameters.sliceType === 0
                    ? t('knowledge.automatic')
                    : t('knowledge.customized')}
                </p>
              </div>
              <div>
                <h3 className="text-second font-medium">
                  {t('knowledge.paragraphLength')}
                </h3>
                <p className="text-[#757575] text-xl font-medium">
                  {parameters.lengthRange && parameters.lengthRange[1]}{' '}
                  {t('knowledge.characters')}
                </p>
              </div>
              <div>
                <h3 className="text-second font-medium">
                  {t('knowledge.averageParagraphLength')}
                </h3>
                <p className="text-[#757575] text-xl font-medium">
                  {parameters.knowledgeAvgLength} {t('knowledge.characters')}
                </p>
              </div>
              <div>
                <h3 className="text-second font-medium">
                  {t('knowledge.paragraphCount')}
                </h3>
                <p className="text-[#757575] text-xl font-medium">
                  {parameters.knowledgeCount} {t('knowledge.paragraphs')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
