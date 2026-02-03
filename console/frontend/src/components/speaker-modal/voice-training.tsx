import React, { useState, useEffect } from 'react';
import { message, Modal } from 'antd';
import '@/utils/record/recorder-core';
import '@/utils/record/pcm'; // 加载 pcm 编码器
import {
  createOnceTrainTask,
  getVCNTrainingText,
} from '@/services/spark-common';
import { useTranslation } from 'react-i18next';
import { useLocaleStore } from '@/store/spark-store/locale-store';
import language from 'react-syntax-highlighter/dist/esm/languages/hljs/1c';

interface VoiceTrainingProps {
  showVoiceTraining: boolean;
  changeTrainModal: () => void;
}
export interface VCNTrainingText {
  segId: number;
  segText: string;
  segTextLan: string;
}
const DEFAULT_TRAINING_TEXT: VCNTrainingText = {
  segId: 0,
  segText:
    '请到该地址，开通一句话复刻功能 https://console.xfyun.cn/services/oneSentence',
  segTextLan: '',
};

const VoiceTraining: React.FC<VoiceTrainingProps> = ({
  showVoiceTraining,
  changeTrainModal,
}) => {
  const [recordStatus, setRecordStatus] = useState(0);
  const [recObj, setRecObj] = useState<any>();
  const [sex, setSex] = useState<1 | 2>(1); // 1: male, 2: female
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [trainingText, setTrainingText] = useState<VCNTrainingText[]>([]); //all training text
  const [currentTrainingText, setCurrentTrainingText] =
    useState<VCNTrainingText>({
      segId: 0,
      segText: '',
      segTextLan: '',
    }); //current training text
  const { locale: localeNow } = useLocaleStore();
  const { t } = useTranslation();
  const switchrecordStatus = () => {
    if (recordStatus === 3) {
      message.info(t('audioUploading'));
      return;
    }
    if (recordStatus === 0) {
      setRecordStatus(1);
      recOpen();
    } else {
      recStop(() => {
        setRecordStatus(0);
        recObj && recObj.close();
      });
    }
  };

  const recOpen = (success?: any) => {
    recObj.open(
      function () {
        recObj.start();
        success && success();
      },
      function (msg: string, isUserNotAllow: any) {
        console.log((isUserNotAllow ? 'UserNotAllow，' : '') + msg);
      }
    );
  };

  function recStop(callback?: () => void) {
    recObj.stop(
      function (blob: Blob) {
        callback && callback();
        setRecordStatus(3);
        const cloneFile = new File([blob], `clone_audio.pcm`, {
          type: 'application/json',
          lastModified: Date.now(),
        });
        const formData = new FormData();
        formData.append('file', cloneFile);
        createOnceTrainTask({
          language: localeNow === 'en' ? 'en' : undefined,
          segId: currentTrainingText.segId,
          sex,
          formData,
        })
          .then(() => {
            setRecordStatus(0);
            message.success(t('complete'));
            changeTrainModal();
          })
          .catch(err => {
            setRecordStatus(0);
            console.log(err);
          });
      },
      function () {
        setRecordStatus(0);
        recObj.close();
      }
    );
  }
  //get training text
  const getTrainingText = () => {
    getVCNTrainingText()
      .then(res => {
        setTrainingText(res.textSegs);
      })
      .catch(err => {
        message.error(err.message);
        console.log(err);
      });
  };

  useEffect(() => {
    const rec = (window as any).Recorder({
      type: 'pcm',
      sampleRate: 24000,
      bitRate: 16,
    });
    setRecObj(rec);
    getTrainingText();
  }, []);

  // 关闭模态框时重置状态
  useEffect(() => {
    if (!showVoiceTraining) {
      setRecordStatus(0);
      setSex(1);
      setCreateStep(1);
      setCurrentTrainingText({
        segId: 0,
        segText: '',
        segTextLan: '',
      });
    }
  }, [showVoiceTraining]);

  const completeSexSelect = () => {
    // 根据当前语言筛选对应的训练文本
    const targetLang = localeNow === 'en' ? 'en_us' : 'zh_cn';
    const filteredTexts = trainingText.filter(
      text => text.segTextLan === targetLang
    );
    // 从筛选结果中随机选择一个
    const randomIndex = Math.floor(Math.random() * filteredTexts.length);
    const selectedText = filteredTexts[randomIndex] || DEFAULT_TRAINING_TEXT;
    setCreateStep(2);
    setCurrentTrainingText(selectedText as VCNTrainingText);
  };

  //关闭弹窗
  const closeModal = () => {
    recObj?.close();
    setCreateStep(1);
    changeTrainModal();
  };

  return (
    <Modal
      open={showVoiceTraining}
      onCancel={() => {
        recObj?.close();
        changeTrainModal();
      }}
      footer={null}
      width={createStep === 1 ? 528 : 678}
      centered
      maskClosable={false}
      closeIcon={null}
      className="[&_.ant-modal-content]:p-0 [&_.ant-modal-body]:p-0"
    >
      {createStep === 1 && (
        <div className="bg-white rounded-[10px] pt-2.5">
          <div
            className="font-semibold pt-5 h-[50px] leading-[10px] text-xl text-[#43436b] bg-[url(@/assets/imgs/voice-training/v-arrow-left.svg)] bg-[length:auto] bg-[25px_center] bg-no-repeat pl-[55px] cursor-pointer"
            onClick={closeModal}
          >
            {t('createVoice')}
          </div>
          <div className="h-auto w-full flex flex-col justify-start items-center">
            <div className="my-5 mx-auto text-xl font-medium h-[50px] text-center text-[#1b211f] leading-[50px]">
              {t('selectGender')}
            </div>
            <div className="my-[30px] mx-auto h-[100px] w-[260px] flex justify-between">
              <div
                className={`w-[100px] h-[100px] rounded-full bg-[#f5f6f9] border-2 bg-center bg-[length:40%_auto] bg-no-repeat text-center leading-[250px] text-sm font-medium cursor-pointer transition-all ${
                  sex === 1
                    ? 'border-[#2a6ee9] text-[#2a6ee9] bg-[#eff4fd] bg-[url(@/assets/imgs/voice-training/hover-m.png)]'
                    : 'border-[#f5f6f9] text-[#8691a1] bg-[url(@/assets/imgs/voice-training/normal-m.png)] hover:border-[#2a6ee9] hover:text-[#2a6ee9] hover:bg-[#eff4fd] hover:bg-[url(@/assets/imgs/voice-training/hover-m.png)]'
                } bg-center bg-[length:40%_auto] bg-no-repeat`}
                onClick={() => setSex(1)}
              >
                {t('male')}
              </div>
              <div
                className={`w-[100px] h-[100px] rounded-full bg-[#f5f6f9] border-2 bg-center bg-[length:40%_auto] bg-no-repeat text-center leading-[250px] text-sm font-medium cursor-pointer transition-all ${
                  sex === 2
                    ? 'border-[#2a6ee9] text-[#2a6ee9] bg-[#eff4fd] bg-[url(@/assets/imgs/voice-training/hover-f.png)]'
                    : 'border-[#f5f6f9] text-[#8691a1] bg-[url(@/assets/imgs/voice-training/normal-f.png)] hover:border-[#2a6ee9] hover:text-[#2a6ee9] hover:bg-[#eff4fd] hover:bg-[url(@/assets/imgs/voice-training/hover-f.png)]'
                } bg-center bg-[length:40%_auto] bg-no-repeat`}
                onClick={() => setSex(2)}
              >
                {t('female')}
              </div>
            </div>
            <div
              className="mt-[60px] mb-8 bg-[#2a6ee9] w-[338px] h-[42px] rounded-[20px] text-center leading-[42px] text-white text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity"
              onClick={completeSexSelect}
            >
              {t('startRecord')}
            </div>
          </div>
        </div>
      )}
      {createStep === 2 && (
        <div className="bg-[url(@/assets/imgs/voice-training/pop-bg.png)] bg-left-bottom bg-no-repeat bg-cover rounded-[10px] pt-2.5">
          <div
            className="font-semibold pt-5 h-[50px] leading-[10px] text-xl text-[#43436b] bg-[url(@/assets/imgs/voice-training/v-arrow-left.svg)] bg-[length:auto] bg-[25px_center] bg-no-repeat pl-[55px] cursor-pointer"
            onClick={closeModal}
          >
            {t('createVoice')}
          </div>
          <div className="mt-5 w-full text-center text-lg text-[#1b211f] font-bold leading-[30px]">
            {recordStatus === 0
              ? t('pleaseRead')
              : recordStatus === 1
                ? t('recordingPleaseRead')
                : recordStatus === 3
                  ? t('recordingQualityDetection')
                  : t('pleaseRead')}
          </div>
          <div className="mt-2.5 py-[30px] px-[65px] w-full h-[165px] bg-white/50 font-medium text-xl text-[#28274b] leading-9">
            {currentTrainingText.segText}
          </div>
          <p className="mt-5 w-full leading-[30px] text-center text-[#747f8f] text-xs">
            {t('pleaseReadInQuietEnvironment')}
          </p>
          <div className="mt-5 w-full h-[80px] flex items-center justify-center">
            <div
              className={`relative h-[60px] w-[60px] rounded-full flex items-center justify-center cursor-pointer ${
                recordStatus === 0 || recordStatus === 2
                  ? 'bg-[#597dff]'
                  : recordStatus === 1
                    ? 'bg-[#e99372]'
                    : 'bg-[#ccc] cursor-not-allowed'
              }`}
              onClick={switchrecordStatus}
            >
              {recordStatus === 1 && (
                <>
                  <div className="wave-item absolute rounded-[1000px] opacity-0 bg-[#e99372] animate-wave-1" />
                  <div className="wave-item absolute rounded-[1000px] opacity-0 bg-[#e99372] animate-wave-2" />
                  <div className="wave-item absolute rounded-[1000px] opacity-0 bg-[#e99372] animate-wave-3" />
                </>
              )}
              <div className="relative z-[100] cursor-pointer w-full h-full bg-[url(@/assets/imgs/voice-training/mic.svg)] bg-center bg-no-repeat" />
            </div>
          </div>
          <div className="mt-2.5 pb-5 text-xs w-full text-center">
            {recordStatus === 0
              ? t('clickStartRecord')
              : recordStatus === 1
                ? t('clickStopRecord')
                : recordStatus === 3
                  ? t('recordingProcessing')
                  : t('clickStartRecord')}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default VoiceTraining;
