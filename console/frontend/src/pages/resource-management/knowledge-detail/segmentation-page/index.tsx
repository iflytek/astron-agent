import React, { useState, useEffect, FC } from 'react';
import DataClean from './components/data-clean';
import ProcessingCompletion from './components/processing-completion';
import { getFileSummary } from '@/services/knowledge';
import { useSearchParams } from 'react-router-dom';
import { getRouteId } from '@/utils/utils';
import { FileInfoV2, FileSummaryResponse } from '@/types/resource';

const SegmentationPage: FC = () => {
  const repoId = getRouteId() as string;
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const pid = searchParams.get('parentId');
  const fileId = searchParams.get('fileId');
  const tag = searchParams.get('tag');
  const [fileInfo, setFileInfo] = useState<FileInfoV2>({} as FileInfoV2);
  const [sliceData, setSliceData] = useState<FileSummaryResponse>(
    {} as FileSummaryResponse
  );

  useEffect(() => {
    const params = {
      repoId,
      tag: tag || '',
      fileIds: [fileId || ''],
    };
    getFileSummary(params).then(data => {
      setFileInfo(data.fileInfoV2 || ({} as FileInfoV2));
      setSliceData(data);
    });
  }, []);

  return (
    <div className="flex-1 border border-[#E2E8FF] bg-[#fff] rounded-3xl h-full p-6 flex flex-col overflow-hidden">
      {step === 1 && (
        <DataClean
          tag={tag || ''}
          sliceData={sliceData}
          fileId={fileId || ''}
          fileInfo={fileInfo}
          setStep={setStep}
          repoId={repoId}
          pid={pid || ''}
        />
      )}
      {step === 2 && (
        <ProcessingCompletion
          tag={tag || ''}
          fileId={fileId || ''}
          fileInfo={fileInfo}
          repoId={repoId}
          pid={pid || ''}
        />
      )}
    </div>
  );
};

export default SegmentationPage;
