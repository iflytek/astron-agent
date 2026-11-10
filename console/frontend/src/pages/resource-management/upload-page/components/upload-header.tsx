import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { FileStatusResponse } from '@/types/resource';
import { FC } from 'react';

interface UploadHeaderProps {
  tag: string;
  parentId: string;
  repoId: string;
  step: number;
  sliceType: string;
  setStep: (step: number) => void;
  saveDisabled: boolean;
  setSliceType: (sliceType: string) => void;
  slicing: boolean;
  embed: string;
  embedding: () => void;
  setFailedList: (failedList: FileStatusResponse[]) => void;
  embeddingBackCb: () => void;
  newSaveDisabled: boolean;
  saveLoading: boolean;
}

const UploadHeader: FC<UploadHeaderProps> = props => {
  const { t } = useTranslation();
  const {
    tag,
    parentId,
    repoId,
    step,
    setStep,
    saveDisabled,
    setSliceType,
    slicing,
    embed,
    embedding,
    setFailedList,
    embeddingBackCb,
    newSaveDisabled,
    saveLoading,
  } = props;

  const navigate = useNavigate();

  return (
    <header className="flex items-start justify-between flex-wrap gap-4 bg-white border-b border-[#dfe6f1] p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate(-1)} aria-label="返回知识库详情">
            返回
          </Button>
          <h1 className="text-xl font-semibold text-[#18243d]">
            {t('knowledge.fileUpload')}
          </h1>
        </div>
        <ol
          aria-label="文档导入步骤"
          className="flex flex-wrap gap-3 mt-4 text-sm"
        >
          {[
            t('knowledge.importData'),
            t('knowledge.dataClean'),
            t('knowledge.processingCompletion'),
          ].map((label, index) => (
            <li
              key={label}
              aria-current={step === index + 1 ? 'step' : undefined}
              className="flex items-center gap-2"
              style={{ color: step === index + 1 ? '#315ff4' : '#607089' }}
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full border border-current">
                {index + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
      </div>
      <div className="flex items-center flex-wrap gap-2">
        {step === 1 && (
          <Button
            type="primary"
            onClick={() => setStep(2)}
            disabled={saveDisabled}
          >
            {t('knowledge.nextStep')}
          </Button>
        )}
        {step === 2 && (
          <>
            <Button
              disabled={slicing || saveLoading}
              onClick={() => {
                setSliceType('');
                setFailedList([]);
                setStep(1);
              }}
            >
              {t('knowledge.previousStep')}
            </Button>
            <Button
              type="primary"
              onClick={() => {
                embedding();
                setStep(3);
              }}
              disabled={slicing || saveDisabled || saveLoading}
            >
              {t('knowledge.nextStep')}
            </Button>
            <Button
              type="primary"
              onClick={embeddingBackCb}
              disabled={newSaveDisabled || slicing}
              loading={saveLoading}
            >
              {t('knowledge.save')}
            </Button>
          </>
        )}
        {step === 3 && (
          <Button
            type="primary"
            disabled={embed === 'loading'}
            onClick={() =>
              navigate(
                `/resource/knowledge/detail/${repoId}/document?tag=${tag}`,
                { state: { parentId } }
              )
            }
          >
            {t('knowledge.goToDocuments')}
          </Button>
        )}
      </div>
    </header>
  );
};

export default UploadHeader;
