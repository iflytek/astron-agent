import React, { useState, FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import UploadHeader from './components/upload-header';
import ImportData from './components/import-data';
import DataClean from './components/data-clean';
import ProcessingCompletion from './components/processing-completion';

import {
  FileStatusResponse,
  FlexibleType,
  RepoItem,
  UploadFile,
} from '@/types/resource';
import { useUploadPage } from './hooks/use-upload-page';

const UploadPage: FC = () => {
  const [searchParams] = useSearchParams();
  const tag = searchParams.get('tag') || 'CBG-RAG';
  const parentId = searchParams.get('parentId');
  const repoId = searchParams.get('repoId');
  const [step, setStep] = useState(1);
  const [uploadList, setUploadList] = useState<UploadFile[]>([]);
  const [defaultConfig, setDefaultConfig] = useState({});
  const [customConfig, setCustomConfig] = useState({});
  const [lengthRange, setLengthRange] = useState<number[]>([]);
  const [knowledgeDetail, setKnowledge] = useState<RepoItem>({} as RepoItem);
  const [fileIds, setFileIds] = useState<(number | string)[]>([]);
  const [importType, setImportType] = useState('text');
  const [linkValue, setLinkValue] = useState('');
  const [saveDisabled, setSaveDisabled] = useState(true);
  const [sliceType, setSliceType] = useState(''); // default
  const [slicing, setSlicing] = useState(false);
  const [embed, setEmbed] = useState('loading');
  const [failedList, setFailedList] = useState<FileStatusResponse[]>([]);
  const [sparkFiles, setSparkFiles] = useState<UploadFile[]>([]);
  const [seperatorsOptions, setSeperatorsOptions] = useState<
    Record<string, FlexibleType>[]
  >([]);
  const [newSaveDisabled, setNewSaveDisabled] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  const { embeddingBackCb, embedding } = useUploadPage({
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
  });
  return (
    <div className="flex flex-col w-full h-full gap-6 px-6">
      <UploadHeader
        tag={tag}
        parentId={parentId || ''}
        repoId={repoId || ''}
        step={step}
        sliceType={sliceType}
        setStep={setStep}
        saveDisabled={saveDisabled}
        setSliceType={setSliceType}
        slicing={slicing}
        embed={embed}
        embedding={embedding}
        setFailedList={setFailedList}
        embeddingBackCb={embeddingBackCb}
        newSaveDisabled={newSaveDisabled}
        saveLoading={saveLoading}
      />
      <div className="flex flex-1 w-full pb-6 overflow-hidden">
        <div className="w-full h-full border border-[#E2E8FF] bg-[#fff] rounded-3xl p-6 flex flex-col overflow-hidden">
          {step === 1 && (
            <ImportData
              tag={tag}
              parentId={parentId || ''}
              repoId={repoId || ''}
              setStep={setStep}
              uploadList={uploadList}
              setUploadList={setUploadList}
              importType={importType}
              setImportType={setImportType}
              linkValue={linkValue}
              setLinkValue={setLinkValue}
              saveDisabled={saveDisabled}
              setSaveDisabled={setSaveDisabled}
            />
          )}
          {step === 2 && (
            <DataClean
              tag={tag}
              setSparkFiles={setSparkFiles}
              knowledgeDetail={knowledgeDetail}
              uploadList={uploadList}
              setUploadList={setUploadList}
              setStep={setStep}
              repoId={repoId || ''}
              lengthRange={lengthRange}
              defaultConfig={defaultConfig}
              customConfig={customConfig}
              fileIds={fileIds}
              setFileIds={setFileIds}
              importType={importType}
              linkValue={linkValue}
              parentId={parentId || ''}
              slicing={slicing}
              setSlicing={setSlicing}
              sliceType={sliceType}
              setSliceType={setSliceType}
              saveDisabled={saveDisabled}
              setSaveDisabled={setSaveDisabled}
              failedList={failedList}
              setFailedList={setFailedList}
              seperatorsOptions={seperatorsOptions}
              setNewSaveDisabled={setNewSaveDisabled}
            />
          )}
          {step === 3 && (
            <ProcessingCompletion
              tag={tag}
              repoId={repoId || ''}
              parentId={parentId || ''}
              uploadList={uploadList}
              knowledgeDetail={knowledgeDetail}
              fileIds={fileIds}
              embed={embed}
              setEmbed={setEmbed}
              sparkFiles={sparkFiles}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
