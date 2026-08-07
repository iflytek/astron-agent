import React, { useState, useRef, useEffect } from 'react';
import closeIcon from '@/assets/svgs/close-speaker.svg';
import listenImg from '@/assets/svgs/listen_play.svg';
import listenStopImg from '@/assets/svgs/listen_stop.svg';
import createSpeakerIcon from '@/assets/svgs/create-speaker.svg';
import moreIcon from '@/assets/svgs/my-speaker-more.svg';
import { Modal, Segmented, Popover, message } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useLocaleStore } from '@/store/spark-store/locale-store';
import TtsModule from '../tts-module';
import VoiceTraining from './voice-training';
import {
  deleteMySpeaker,
  getMySpeakerList,
  updateMySpeaker,
} from '@/services/spark-common';
const VOICE_TEXT_CN = '答你所言，懂你所问，我是你的智能体助手，很高兴认识你';
const VOICE_TEXT_EN =
  'I understand what you say and answer what you ask. I am your intelligent assistant, glad to meet you';

export interface VcnItem {
  id: number;
  name: string;
  modelManufacturer: string;
  voiceType: string;
  coverUrl: string;
  exquisite?: number; // 0: 普通, 1: 精品
}

export interface MyVCNItem {
  assetId: string;
  name: string;
  id: number;
  coverUrl?: string;
}

interface SpeakerModalProps {
  vcnList: VcnItem[];
  changeSpeakerModal: (show: boolean) => void;
  botCreateCallback: (voice: { cn: string }) => void;
  botCreateActiveV: {
    cn: string;
  };
  setBotCreateActiveV: (voice: { cn: string }) => void;
  showSpeakerModal: boolean;
  onMySpeakerChange?: (mySpeaker: MyVCNItem[]) => void;
}

const SpeakerModal: React.FC<SpeakerModalProps> = ({
  vcnList,
  changeSpeakerModal,
  botCreateCallback,
  botCreateActiveV,
  setBotCreateActiveV,
  showSpeakerModal,
  onMySpeakerChange,
}) => {
  const { t } = useTranslation();
  const currentActiveV = botCreateActiveV;
  const [playActive, setPlayActive] = useState<string>(''); // 播放中的发音人
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentVoiceName, setCurrentVoiceName] = useState<string>('');
  const { locale: localeNow } = useLocaleStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'official'>('official');
  const [mySpeaker, setMySpeaker] = useState<any[]>([]);
  const [editVCNId, setEditVCNId] = useState<number | null>(null); // 编辑的训练id
  const [editVCNName, setEditVCNName] = useState<string>(''); // 编辑的训练名称
  const [popoverVisible, setPopoverVisible] = useState<string | null>(null);
  const [showVoiceTraining, setShowVoiceTraining] = useState<boolean>(false);

  // 创建发音人点击
  const createMyVCN = () => {
    setShowVoiceTraining(true);
  };

  const updateVCNName = (item: MyVCNItem) => {
    const regex = /^[\u4e00-\u9fa5a-zA-Z0-9\s_]+$/;
    if (!regex.test(editVCNName)) {
      message.info(t('speakerNameOnlySupport'));
      return;
    }
    setEditVCNId(null);
    updateMySpeaker({ id: item.id, name: editVCNName })
      .then(() => {
        message.success(t('updateSuccess'));
        getMyVoicerList();
      })
      .catch(err => {
        message.error(err.msg);
        console.log(err);
      });
  };

  //edit my vcn name
  const editMySpeaker = (item: MyVCNItem) => {
    setEditVCNId(item.id);
    setEditVCNName(item.name);
  };

  // delete my speaker
  const deleteSpeaker = (item: MyVCNItem) => {
    Modal.confirm({
      title: t('deleteSpeaker'),
      content: t('deleteSpeakerTip'),
      centered: true,
      onOk() {
        deleteMySpeaker({ id: item.id })
          .then(() => {
            message.success(t('deleteSuccess'));
            getMyVoicerList();
          })
          .catch(err => {
            console.log(err);
          });
      },
    });
  };

  const setSpeaker = (): void => {
    botCreateCallback(botCreateActiveV);
    changeSpeakerModal(false);
  };

  /**
   * play voice
   * @param vcn - voice item
   */
  const handlePlay = (vcn?: VcnItem, myVCN?: MyVCNItem): void => {
    // if click the voice that is playing, then stop playing
    if ((playActive === vcn?.voiceType || myVCN?.assetId) && isPlaying) {
      setIsPlaying(false);
      setPlayActive('');
      setCurrentVoiceName('');
    } else {
      // switch to new voice: stop current playing
      if (isPlaying) {
        setIsPlaying(false);
      }
      // use setTimeout to ensure the status is updated before starting the new playing
      setTimeout(() => {
        setPlayActive(vcn?.voiceType || myVCN?.assetId || '');
        setCurrentVoiceName(vcn?.voiceType || myVCN?.assetId || '');
        setIsPlaying(true);
      }, 50);
    }
  };

  // close speaker modal
  const closeSpeakerModal = (): void => {
    // stop playing
    setIsPlaying(false);
    setPlayActive('');
    setCurrentVoiceName('');

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setTimeout(() => {
      changeSpeakerModal(false);
    });
  };

  const closeTrainModal = () => {
    setShowVoiceTraining(false);
    getMyVoicerList();
  };

  const getMyVoicerList = () => {
    getMySpeakerList()
      .then(res => {
        setMySpeaker(res);
        onMySpeakerChange?.(res);
      })
      .catch(err => {
        message.error(err.msg);
        console.log(err);
      });
  };

  // official voice
  const officialVoiceList = vcnList.filter(item => item.exquisite === 1);

  // basic voice
  const basicVoiceList = vcnList.filter(item => item.exquisite === 0);

  // init default voice
  useEffect(() => {
    if (!botCreateActiveV.cn && vcnList.length > 0) {
      const exquisiteList = vcnList.filter(item => item.exquisite === 1);
      const defaultVoice =
        exquisiteList.length > 0 ? exquisiteList[0] : vcnList[0];

      if (defaultVoice) {
        setBotCreateActiveV({
          cn: defaultVoice.voiceType,
        });
      }
    }
  }, [vcnList, botCreateActiveV.cn]);

  useEffect(() => {
    getMyVoicerList();
  }, []);

  return (
    <>
      {showVoiceTraining && (
        <VoiceTraining
          showVoiceTraining={showVoiceTraining}
          changeTrainModal={closeTrainModal}
        />
      )}
      <Modal
        open={showSpeakerModal && !showVoiceTraining}
        title={t('characterVoice')}
        onCancel={closeSpeakerModal}
        width={769}
        centered
        maskClosable={false}
        closeIcon={<img src={closeIcon} alt="close" />}
        className="[&_.ant-modal-close]:rounded-full [&_.ant-modal-close]:w-[22px] [&_.ant-modal-close]:h-[22px] [&_.ant-modal-close]:mt-2 [&_.ant-modal-close]:mr-2 [&_.ant-modal-close:hover]:opacity-80 [&_.ant-modal-close:hover]:transition-opacity [&_.ant-modal-close:hover]:duration-300 [&_.ant-modal-content]:p-5 [&_.ant-modal-title]:text-black/80 [&_.ant-modal-footer]:flex [&_.ant-modal-footer]:justify-end [&_.ant-modal-footer]:items-center [&_.ant-modal-footer]:p-4"
        footer={
          <div className="flex items-center gap-3">
            <div
              className="w-20 h-9 rounded-lg bg-white text-center border border-[#e7e7f0] leading-9 text-[#676773] select-none cursor-pointer hover:opacity-90"
              onClick={closeSpeakerModal}
            >
              {t('btnCancel')}
            </div>
            <div
              className="w-20 h-9 rounded-lg bg-[#6356ea] text-center leading-9 text-white select-none cursor-pointer hover:opacity-90"
              onClick={setSpeaker}
            >
              {t('btnChoose')}
            </div>
          </div>
        }
      >
        <Segmented
          value={activeTab}
          onChange={value => setActiveTab(value as 'basic' | 'official')}
          options={[
            { label: t('officialVoice'), value: 'official' },
            { label: t('basicVoice'), value: 'basic' },
          ]}
          block
          rootClassName="speaker-segment"
        />
        <div className="w-full flex flex-wrap justify-start h-auto gap-4 mb-3">
          {activeTab === 'official' && (
            <div className="w-full">
              <div className="w-full flex flex-wrap justify-start h-auto gap-4 pt-[12px]">
                {officialVoiceList.map((item: VcnItem) => (
                  <div
                    className={`w-[230px] h-[50px] rounded-[10px] bg-white flex items-center justify-between px-3 border cursor-pointer ${
                      currentActiveV?.cn === item.voiceType
                        ? 'border-[#6356ea] bg-[url(@/assets/svgs/choose-voice-bg.svg)] bg-no-repeat bg-center bg-cover relative before:content-[""] before:absolute before:top-[5px] before:right-[5px] before:w-[19px] before:h-[18px] before:z-[1] before:bg-[url(@/assets/svgs/choose-voice-icon.svg)] before:bg-no-repeat'
                        : 'border-[#dedede]'
                    }`}
                    key={item.voiceType}
                    onClick={() => {
                      setBotCreateActiveV({
                        cn: item.voiceType,
                      });
                    }}
                  >
                    <div className="flex items-center">
                      <img
                        className="w-[30px] h-[30px] mr-2 rounded-full"
                        src={item.coverUrl}
                        alt=""
                      />
                      <span
                        className="inline-block w-[100px] overflow-hidden text-ellipsis whitespace-nowrap"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                    </div>
                    <div
                      className={`text-xs select-none cursor-pointer flex items-center ${
                        playActive === item.voiceType
                          ? 'text-[#6178FF]'
                          : 'text-[#676773]'
                      }`}
                      onClick={(e: any) => {
                        e.stopPropagation();
                        handlePlay(item);
                      }}
                    >
                      <img
                        className="w-3 h-auto mr-1"
                        src={
                          playActive === item.voiceType
                            ? listenStopImg
                            : listenImg
                        }
                        alt=""
                      />
                      {playActive === item.voiceType
                        ? t('playing')
                        : t('voiceTry')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'basic' && (
            <div className="w-full">
              <div className="rounded-[10px] mt-3.5 bg-[url(@/assets/svgs/my-speaker-bg.png)] bg-no-repeat bg-center bg-cover pt-[17px] pr-[17px] pb-3 pl-5">
                <div className="flex justify-between mb-3.5">
                  <span className="text-base font-bold text-[#222529]">
                    {t('mySpeaker')}
                  </span>
                  {!!mySpeaker.length && (
                    <div
                      className="flex items-center font-medium text-[#6356ea] text-sm cursor-pointer"
                      onClick={createMyVCN}
                    >
                      <img
                        src={createSpeakerIcon}
                        alt=""
                        className="w-3.5 h-3.5 mr-1"
                      />
                      {t('createSpeaker')}
                    </div>
                  )}
                </div>
                <div className="w-full flex flex-wrap justify-start h-auto gap-4 mb-3">
                  {!mySpeaker.length ? (
                    <div
                      className="-mt-3.5 -mb-3 w-full flex items-center justify-center"
                      onClick={createMyVCN}
                    >
                      <div className="w-[91px] h-[77px] mr-[5px] bg-[url(@/assets/imgs/voice-training/no-speaker.svg)] bg-no-repeat bg-cover" />
                      <div>
                        <div className="text-sm font-medium text-[#676773] h-[27px] leading-[27px]">
                          {t('noSpeakerTip')}
                        </div>
                        <div className="flex items-center font-medium text-[#6356ea] text-sm cursor-pointer">
                          <img
                            className="w-3.5 h-3.5 mr-1"
                            src={createSpeakerIcon}
                            alt=""
                          />
                          <span>{t('createSpeaker')}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    mySpeaker.map((item: MyVCNItem) => (
                      <div
                        className={`w-[216px] h-[50px] rounded-[10px] bg-white flex items-center justify-between p-[0px_11px_0_17px] border cursor-pointer ${
                          currentActiveV?.cn === item.assetId
                            ? 'border-[#6356ea] bg-[url(@/assets/svgs/choose-voice-bg.svg)] bg-no-repeat bg-center bg-cover relative before:content-[""] before:absolute before:top-[5px] before:right-[5px] before:w-[19px] before:h-[18px] before:z-[1] before:bg-[url(@/assets/svgs/choose-voice-icon.svg)] before:bg-no-repeat'
                            : 'border-[#dedede]'
                        }`}
                        key={item.assetId || 'unuse_' + item.id}
                        onClick={() => {
                          setBotCreateActiveV({
                            cn: item.assetId,
                          });
                        }}
                      >
                        {editVCNId === item.id ? (
                          <div className="h-[35px] w-[300px] mr-2">
                            <input
                              className="w-full h-full border border-[#5881ff] rounded-[5px] px-[5px] focus:outline-none"
                              onKeyDown={e => {
                                if (e.key === 'Escape') {
                                  setEditVCNId(null);
                                  return;
                                }

                                e.stopPropagation();
                              }}
                              maxLength={20}
                              onChange={e => {
                                setEditVCNName(e.target.value);
                              }}
                              onClick={(e: any) => {
                                e.stopPropagation();
                              }}
                              value={editVCNName}
                            />
                          </div>
                        ) : (
                          <div
                            className="flex-1 w-0 flex items-center"
                            title={item.name}
                          >
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                              {item.name}
                            </span>
                          </div>
                        )}

                        <div className="flex">
                          {editVCNId === item.id ? (
                            // Edit mode: show confirm button
                            <div
                              className="text-[#597dff] text-xs select-none cursor-pointer flex items-center ml-2 hover:text-[#305af4]"
                              onClick={() => {
                                updateVCNName(item);
                              }}
                            >
                              <CheckOutlined />
                            </div>
                          ) : (
                            // Normal mode: show play, edit, delete buttons
                            <>
                              <div
                                className="text-[#9a9dc4] text-xs select-none cursor-pointer flex items-center ml-2"
                                onClick={(
                                  e: React.MouseEvent<HTMLDivElement>
                                ) => {
                                  e.stopPropagation();
                                  handlePlay(undefined, item);
                                }}
                                style={{
                                  color:
                                    playActive === item?.assetId
                                      ? '#6178FF'
                                      : '#676773',
                                }}
                              >
                                <img
                                  className="w-3 h-auto mr-1"
                                  src={
                                    playActive === item?.assetId
                                      ? listenStopImg
                                      : listenImg
                                  }
                                  alt=""
                                />
                                {playActive === item?.assetId
                                  ? t('playing')
                                  : t('voiceTry')}
                              </div>
                              <Popover
                                open={popoverVisible === item.assetId}
                                onOpenChange={visible => {
                                  setPopoverVisible(
                                    visible ? item.assetId : null
                                  );
                                }}
                                trigger="click"
                                placement="bottomRight"
                                content={
                                  <div className="flex flex-col">
                                    <div
                                      className="flex items-center cursor-pointer px-1.5 py-0.5 rounded transition-colors hover:bg-[#f5f5f5]"
                                      onClick={(
                                        e: React.MouseEvent<HTMLDivElement>
                                      ) => {
                                        e.stopPropagation();
                                        setPopoverVisible(null);
                                        editMySpeaker(item);
                                      }}
                                    >
                                      <img
                                        className="w-3 h-3 mr-2"
                                        src="https://1024-cdn.xfyun.cn/2022_1024%2Fcms%2F16906078695639865%2F%E7%BC%96%E8%BE%91%E5%A4%87%E4%BB%BD%202%402x.png"
                                        alt="edit"
                                      />
                                      <span className="text-xs text-[#676773] whitespace-nowrap">
                                        {t('edit')}
                                      </span>
                                    </div>
                                    <div
                                      className="flex items-center cursor-pointer px-1.5 py-0.5 rounded transition-colors hover:bg-[#f5f5f5]"
                                      onClick={(e: any) => {
                                        e.stopPropagation();
                                        setPopoverVisible(null);
                                        deleteSpeaker(item);
                                      }}
                                    >
                                      <img
                                        className="w-3 h-3 mr-2"
                                        src="https://1024-cdn.xfyun.cn/2022_1024%2Fcms%2F16906079081258227%2F%E5%88%A0%E9%99%A4%E5%A4%87%E4%BB%BD%202%402x.png"
                                        alt="delete"
                                      />
                                      <span className="text-xs text-[#676773] whitespace-nowrap">
                                        {t('delete')}
                                      </span>
                                    </div>
                                  </div>
                                }
                              >
                                <div
                                  className="text-[#9a9dc4] text-xs select-none cursor-pointer flex items-center ml-2"
                                  onClick={(e: any) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  <img
                                    className="w-3 h-auto mr-1"
                                    src={moreIcon}
                                    alt="more"
                                  />
                                </div>
                              </Popover>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 普通音色 */}
              {basicVoiceList.length > 0 && (
                <div className="mt-4">
                  <div className="text-base font-bold text-[#222529] mb-3.5">
                    {t('basicVoice')}
                  </div>
                  <div className="w-full flex flex-wrap justify-start h-auto gap-4">
                    {basicVoiceList.map((item: VcnItem) => (
                      <div
                        className={`w-[230px] h-[50px] rounded-[10px] bg-white flex items-center justify-between px-3 border cursor-pointer ${
                          currentActiveV?.cn === item.voiceType
                            ? 'border-[#6356ea] bg-[url(@/assets/svgs/choose-voice-bg.svg)] bg-no-repeat bg-center bg-cover relative before:content-[""] before:absolute before:top-[5px] before:right-[5px] before:w-[19px] before:h-[18px] before:z-[1] before:bg-[url(@/assets/svgs/choose-voice-icon.svg)] before:bg-no-repeat'
                            : 'border-[#dedede]'
                        }`}
                        key={item.voiceType}
                        onClick={() => {
                          setBotCreateActiveV({
                            cn: item.voiceType,
                          });
                        }}
                      >
                        <div className="flex items-center">
                          <img
                            className="w-[30px] h-[30px] mr-2 rounded-full"
                            src={item.coverUrl}
                            alt=""
                          />
                          <span
                            className="inline-block w-[100px] overflow-hidden text-ellipsis whitespace-nowrap"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                        </div>
                        <div
                          className={`text-xs select-none cursor-pointer flex items-center ${
                            playActive === item.voiceType
                              ? 'text-[#6178FF]'
                              : 'text-[#676773]'
                          }`}
                          onClick={(e: any) => {
                            e.stopPropagation();
                            handlePlay(item);
                          }}
                        >
                          <img
                            className="w-3 h-auto mr-1"
                            src={
                              playActive === item.voiceType
                                ? listenStopImg
                                : listenImg
                            }
                            alt=""
                          />
                          {playActive === item.voiceType
                            ? t('playing')
                            : t('voiceTry')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <TtsModule
          text={localeNow === 'en' ? VOICE_TEXT_EN : VOICE_TEXT_CN}
          voiceName={currentVoiceName}
          isPlaying={isPlaying}
          setIsPlaying={playing => {
            setIsPlaying(playing);
            if (!playing) {
              setPlayActive('');
              setCurrentVoiceName('');
            }
          }}
        />
      </Modal>
    </>
  );
};

export default SpeakerModal;
