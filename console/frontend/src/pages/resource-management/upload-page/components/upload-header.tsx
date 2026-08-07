import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import arrowLeft from '@/assets/imgs/knowledge/icon_zhishi_arrow-left.png';
import check from '@/assets/imgs/knowledge/icon_steps_check.png';
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
    <div
      className="w-full h-[80px] bg-[#fff] border-b border-[#e2e8ff] flex justify-between px-6 py-5"
      style={{
        borderRadius: '0px 0px 24px 24px',
      }}
    >
      <div className="flex items-center">
        <img
          src={arrowLeft}
          className="cursor-pointer w-7 h-7"
          onClick={() => navigate(-1)}
          alt=""
        />
        <h1 className="ml-2 text-2xl font-semibold text-second">
          {t('knowledge.fileUpload')}
        </h1>
        <div className="flex items-center ml-5">
          <div className="flex items-center px-3 py-1">
            <div
              className={`w-6 h-6 rounded-full bg-[${step == 1 ? '#6356EA' : '#dee2f9'}] leading-6 text-center text-[#fff] text-xs flex justify-center items-center`}
              style={{ border: step > 1 ? '1px solid #d3d3d3' : '' }}
            >
              {step > 1 ? <img src={check} className="w-3 h-3" /> : 1}
            </div>
            <div
              className={`ml-2 text-[${step == 1 ? '#6356EA' : '#757575'}] text-sm`}
            >
              {t('knowledge.importData')}
            </div>
          </div>
          <div className="ml-2 w-[44px] h-[1px] bg-[#d3d3d3]"></div>
          <div className="flex items-center px-3 py-1">
            <div
              className={`w-6 h-6 rounded-full bg-[${step == 2 ? '#6356EA' : step > 2 ? '#dee2f9' : ''}] leading-6 text-center text-[${step == 2 ? '#fff' : '#757575'}] text-xs flex justify-center items-center`}
              style={{ border: step !== 2 ? '1px solid #d3d3d3' : '' }}
            >
              {step > 2 ? <img src={check} className="w-3 h-3" /> : 2}
            </div>
            <div
              className={`ml-2 text-[${step == 2 ? '#6356EA' : step > 2 ? '#757575' : '#a4a4a4'}] text-sm`}
            >
              {t('knowledge.dataClean')}
            </div>
          </div>
          <div className="ml-2 w-[44px] h-[1px] bg-[#d3d3d3]"></div>
          <div className="flex items-center px-3 py-1">
            <div
              className={`w-6 h-6 rounded-full bg-[${step == 3 ? '#6356EA' : ''}] leading-6 text-center text-[${step == 3 ? '#fff' : '#757575'}] text-xs flex justify-center items-center`}
              style={{ border: step !== 3 ? '1px solid #d3d3d3' : '' }}
            >
              3
            </div>
            <div
              className={`ml-2 text-[${step == 3 ? '#6356EA' : '#a4a4a4'}] text-sm`}
            >
              {t('knowledge.processingCompletion')}
            </div>
          </div>
        </div>
      </div>
      {step === 1 && (
        <Button
          type="primary"
          className="px-6"
          onClick={() => setStep(2)}
          disabled={saveDisabled}
        >
          {t('knowledge.nextStep')}
        </Button>
      )}
      {step === 2 && (
        <div className="flex">
          <Button
            type="text"
            className="h-10 px-4 second-btn"
            onClick={() => {
              // setSliceType('default')
              setSliceType('');
              setFailedList([]);
              setStep(1);
            }}
          >
            {t('knowledge.previousStep')}
          </Button>
          <Button
            type="primary"
            className="h-10 px-6 ml-3"
            onClick={() => {
              embedding();
              setStep(3);
            }}
            disabled={slicing || saveDisabled}
          >
            {t('knowledge.nextStep')}
          </Button>
          <Button
            type="primary"
            className="h-10 px-6 ml-3"
            onClick={embeddingBackCb}
            disabled={newSaveDisabled}
            loading={saveLoading}
          >
            {t('knowledge.save')}
          </Button>
        </div>
      )}
      {step === 3 && (
        <div
          className="flex"
          onClick={() => {
            navigate(
              `/resource/knowledge/detail/${repoId}/document?tag=${tag}`,
              {
                state: {
                  parentId,
                },
              }
            );
          }}
        >
          <Button
            type="primary"
            className="h-10 px-6 ml-3"
            disabled={embed === 'loading'}
          >
            {t('knowledge.goToDocuments')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default UploadHeader;
