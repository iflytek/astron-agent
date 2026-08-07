import React, { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getConfigs,
  embeddingFiles,
  getKnowledgeDetail,
  embeddingBack,
} from '@/services/knowledge';
import {
  EmbeddingFilesParams,
  FileStatusResponse,
  FlexibleType,
  RepoItem,
  UploadFile,
} from '@/types/resource';

export const useUploadPage = ({
  failedList,
  fileIds,
  importType,
  uploadList,
  setUploadList,
  setSaveDisabled,
  sparkFiles,
  setSparkFiles,
  setSeperatorsOptions,
  setDefaultConfig,
  setCustomConfig,
  setLengthRange,
  setKnowledge,
  setFileIds,
  setSaveLoading,
}: {
  failedList: FileStatusResponse[];
  fileIds: (string | number)[];
  importType: string;
  uploadList: UploadFile[];
  setUploadList: React.Dispatch<React.SetStateAction<UploadFile[]>>;
  setSaveDisabled: React.Dispatch<React.SetStateAction<boolean>>;
  sparkFiles: UploadFile[];
  setSparkFiles: React.Dispatch<React.SetStateAction<UploadFile[]>>;
  setSeperatorsOptions: React.Dispatch<
    React.SetStateAction<Record<string, FlexibleType>[]>
  >;
  setDefaultConfig: React.Dispatch<
    React.SetStateAction<Record<string, FlexibleType>>
  >;
  setCustomConfig: React.Dispatch<
    React.SetStateAction<Record<string, FlexibleType>>
  >;
  setLengthRange: React.Dispatch<React.SetStateAction<number[]>>;
  setKnowledge: React.Dispatch<React.SetStateAction<RepoItem>>;
  setFileIds: React.Dispatch<React.SetStateAction<(string | number)[]>>;
  setSaveLoading: React.Dispatch<React.SetStateAction<boolean>>;
}): {
  embeddingBackCb: () => void;
  embedding: () => void;
} => {
  const [searchParams] = useSearchParams();
  const tag = searchParams.get('tag') || 'CBG-RAG';
  const parentId = searchParams.get('parentId');
  const repoId = searchParams.get('repoId');
  const navigate = useNavigate();

  const sliceConfig = useMemo(() => {
    if (tag === 'CBG-RAG' || tag === 'Ragflow-RAG') {
      return [
        'DEFAULT_SLICE_RULES_CBG',
        'CUSTOM_SLICE_RULES_CBG',
        'CUSTOM_SLICE_SEPERATORS_CBG',
      ];
    } else if (tag === 'AIUI-RAG2') {
      return [
        'DEFAULT_SLICE_RULES_AIUI',
        'CUSTOM_SLICE_RULES_AIUI',
        'CUSTOM_SLICE_SEPERATORS_AIUI',
      ];
    } else {
      return [
        'DEFAULT_SLICE_RULES_SPARK',
        'CUSTOM_SLICE_RULES_SPARK',
        'CUSTOM_SLICE_SEPERATORS_SPARK',
      ];
    }
  }, [tag]);

  useEffect(() => {
    getConfigs(sliceConfig[0]).then(data => {
      const config = JSON.parse(data[0]?.value || '{}');
      setDefaultConfig(config);
    });

    getConfigs(sliceConfig[1]).then(data => {
      const config = JSON.parse(data[0]?.value || '{}');
      setLengthRange(config.lengthRange);
      setCustomConfig(config);
    });

    getConfigs(sliceConfig[2]).then(data => {
      setSeperatorsOptions(JSON.parse(data[0]?.value || '{}'));
    });

    getKnowledgeDetail(repoId || '', tag).then(data => {
      setKnowledge(data);
    });
  }, [sliceConfig]);

  useEffect(() => {
    if (importType === 'web' && uploadList.length > 0) {
      setSaveDisabled(false);
    } else if (
      failedList.length === fileIds.length ||
      uploadList.length !== fileIds.length
    ) {
      setSaveDisabled(true);
    } else {
      setSaveDisabled(false);
    }
  }, [failedList, fileIds, importType]);

  function embedding(): void {
    const failedIds = failedList.map(item => item.id);
    const newFileIds = fileIds.filter(item => !failedIds.includes(item));
    setFileIds([...newFileIds]);
    const newUploadList = uploadList.filter(item =>
      fileIds.includes(item.fileId || '')
    );
    setUploadList([...newUploadList]);
    const params: EmbeddingFilesParams = {
      repoId: repoId || '',
      tag,
      configs: {},
      fileIds: newFileIds,
    };
    if (tag === 'SparkDesk-RAG') {
      params.sparkFiles = sparkFiles;
    }
    embeddingFiles(params);
  }

  const embeddingBackCb = useCallback(() => {
    setSaveLoading(true);
    const failedIds = failedList.map(item => item.id);
    const newFileIds = fileIds.filter(item => !failedIds.includes(item));
    const params: EmbeddingFilesParams = {
      repoId: repoId || '',
      tag,
      configs: {},
      fileIds: newFileIds,
    };
    if (tag === 'SparkDesk-RAG') {
      params.sparkFiles = sparkFiles;
    }
    embeddingBack(params)
      .then(() => {
        navigate(`/resource/knowledge/detail/${repoId}/document?tag=${tag}`, {
          state: {
            parentId,
          },
        });
      })
      .finally(() => {
        setSaveLoading(false);
      });
  }, [repoId, tag, sparkFiles, fileIds, failedList]);

  useEffect(() => {
    const fileIds = uploadList
      .filter(item => item.status === 'done')
      .map(item => item.fileId) as number[];
    setFileIds(fileIds);
  }, [uploadList]);

  useEffect(() => {
    const sparkFiles = uploadList
      .filter(item => item.status === 'done')
      .map(item => ({
        fileId: item.fileId,
        fileName: item.fileName,
        charCount: item.charCount,
      })) as UploadFile[];
    setSparkFiles(sparkFiles);
  }, [uploadList]);
  return {
    embeddingBackCb,
    embedding,
  };
};
