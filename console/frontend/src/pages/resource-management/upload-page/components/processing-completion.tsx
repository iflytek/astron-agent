import { FC, useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';
import {
  getStatusAPI,
  embeddingFiles,
  getFileSummary,
} from '@/services/knowledge';
import { typeList } from '@/constants';
import usePrompt from '@/hooks/use-prompt';

import conglt from '@/assets/imgs/knowledge/conglt.png';
import restart from '@/assets/imgs/knowledge/bnt_zhishi_restart.png';
import select from '@/assets/imgs/knowledge/icon_nav_dropdown.png';
import {
  EmbeddingFilesParams,
  FileStatusResponse,
  FileSummaryResponse,
  RepoItem,
  UploadFile,
} from '@/types/resource';
import { ProcessingCompletionInfo } from './processing-completion-info';

const ProcessingCompletion: FC<{
  tag: string;
  repoId: number | string;
  uploadList: UploadFile[];
  knowledgeDetail: RepoItem;
  fileIds: (number | string)[];
  embed: string;
  setEmbed: (embed: string) => void;
  sparkFiles: UploadFile[];
  parentId: number | string;
}> = props => {
  const { t } = useTranslation();
  const {
    tag,
    repoId,
    uploadList,
    knowledgeDetail,
    fileIds,
    embed,
    setEmbed,
    sparkFiles,
  } = props;

  const [failedList, setFailedList] = useState<FileStatusResponse[]>([]);
  const [progress, setProgress] = useState(0);
  const [parameters, setParameters] = useState<FileSummaryResponse>(
    {} as FileSummaryResponse
  );
  const [showMore, setShowMore] = useState(false);
  const [isChanged, setIsChanged] = useState(false);

  usePrompt(isChanged, t('knowledge.confirmLeave'));

  useEffect(() => {
    if (embed === 'loading' || failedList.length) {
      setIsChanged(true);
    } else {
      setIsChanged(false);
    }

    return (): void => setIsChanged(false);
  }, [failedList, embed]);

  useEffect(() => {
    let timer: number;
    if (embed === 'loading') {
      timer = window.setInterval(() => {
        getFileStatus(timer);
      }, 1000);
    }
    return (): void => window.clearTimeout(timer);
  }, [embed]);

  function getFileStatus(timer: number): void {
    const params = {
      indexType: 1,
      tag,
      fileIds,
    };
    getStatusAPI(params).then(data => {
      const doneList = data.filter(
        item => item.status === 4 || item.status === 5
      );
      const failedList = data.filter(item => item.status === 4);
      setProgress((doneList.length * 100) / fileIds.length);
      if (doneList.length === fileIds.length) {
        setFailedList(() => failedList);
        window.clearInterval(timer);
        if (failedList.length === doneList.length) {
          setEmbed('failed');
        } else {
          setEmbed('success');
        }
        getSummary();
      }
    });
  }

  function getSummary(): void {
    const failedIds = failedList.map(item => item.id);
    const ids = fileIds.filter(item => !failedIds.includes(item));
    const params = {
      tag,
      repoId,
      fileIds: ids,
    };
    getFileSummary(params).then(data => {
      setParameters(data);
    });
  }

  function reTry(): void {
    const fileIds = failedList.map(item => item.id as string);

    const params: EmbeddingFilesParams = {
      repoId,
      tag,
      configs: {},
      fileIds,
    };
    if (tag === 'SparkDesk-RAG') {
      params.sparkFiles = sparkFiles;
    }
    embeddingFiles(params);
    setEmbed('loading');
    setProgress(0);
  }

  return (
    <>
      <div className="flex w-full justify-between items-center pb-4 border-b border-[#E2E8FF] h-[57px]">
        <div
          className="relative ml-4 w-[400px] px-3.5 py-2.5 bg-[#EFF1F9] flex items-center"
          style={{ borderRadius: 10 }}
          onClick={event => {
            event.stopPropagation();
            setShowMore(!showMore);
          }}
        >
          <img
            src={typeList.get(uploadList?.[0]?.type || '')}
            className="w-[22px] h-[22px] flex-shrink-0"
            alt=""
          />
          <p
            className="flex-1 text-overflow ml-2 text-second text-sm font-medium"
            title={uploadList?.[0]?.name}
          >
            {uploadList?.[0]?.name}
          </p>
          {uploadList.length > 1 && (
            <span className="text-desc ml-2">
              {t('knowledge.filesCount', { count: uploadList.length })}
            </span>
          )}
          {uploadList.length > 1 && (
            <img src={select} className="ml-2 w-4 h-4" alt="" />
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
        </div>
      </div>
      <ProcessingCompletionInfo
        knowledgeDetail={knowledgeDetail}
        embed={embed}
        failedList={failedList}
        progress={progress}
        parameters={parameters}
        conglt={conglt}
        reTry={reTry}
        uploadList={uploadList}
        restart={restart}
      />
    </>
  );
};

export default ProcessingCompletion;
