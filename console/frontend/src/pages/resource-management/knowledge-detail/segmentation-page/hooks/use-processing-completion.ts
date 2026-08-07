import {
  embeddingFiles,
  getFileSummary,
  getStatusAPI,
} from '@/services/knowledge';
import { FileSummaryResponse } from '@/types/resource';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const useProcessingCompletion = ({
  repoId,
  tag,
  fileId,
  pid,
}: {
  repoId: string;
  tag: string;
  fileId: string;
  pid: string;
}): {
  embed: string;
  parameters: FileSummaryResponse;
  embedding: () => void;
} => {
  const navigate = useNavigate();
  const [embed, setEmbed] = useState('loading');
  const [parameters, setParameters] = useState<FileSummaryResponse>(
    {} as FileSummaryResponse
  );

  useEffect(() => {
    embedding();
  }, []);

  function embedding(): void {
    const params = {
      repoId,
      tag,
      configs: {},
      fileIds: [fileId],
    };
    embeddingFiles(params);
    setEmbed('loading');
  }

  useEffect(() => {
    let timer: number;
    if (embed === 'loading') {
      timer = window.setInterval(() => {
        getFileStatus(timer);
      }, 1000);
      return (): void => window.clearInterval(timer);
    }
    return (): void => window.clearTimeout(timer);
  }, [embed]);

  function getFileStatus(timer: number): void {
    const params = {
      indexType: 1,
      tag,
      fileIds: [fileId],
    };
    getStatusAPI(params).then(data => {
      const fileStatus = data[0]?.status;
      if ([4, 5].includes(fileStatus || 0)) {
        window.clearInterval(timer);
        if (fileStatus === 5) {
          setEmbed('success');
          navigate(
            `/resource/knowledge/detail/${repoId}/file?parentId=${pid}&fileId=${fileId}&tag=${tag}`
          );
        } else if (fileStatus === 4) {
          setEmbed('failed');
        }
        getParameters();
      }
    });
  }

  function getParameters(): void {
    const params = {
      tag,
      repoId,
      fileIds: [fileId],
    };
    getFileSummary(params).then(data => {
      setParameters(data);
    });
  }
  return {
    embed,
    parameters,
    embedding,
  };
};
