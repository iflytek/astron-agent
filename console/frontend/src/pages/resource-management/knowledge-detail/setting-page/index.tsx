import { FC } from 'react';
import { Input, Button } from 'antd';
import copy from 'copy-to-clipboard';
import MoreIcons from '@/components/modal/more-icons';
import { useTranslation } from 'react-i18next';

const { TextArea } = Input;

import chatCopy from '@/assets/imgs/chat/btn_chat_copy.png';
import chatCopied from '@/assets/imgs/chat/btn_chat_copied.png';
import check from '@/assets/imgs/knowledge/icon_dialog_check.png';
import { RepoItem } from '../../../../types/resource';
import { useSettingPage } from './hooks/use-setting-page';

const SettingPage: FC<{
  repoId: string;
  knowledgeInfo: RepoItem;
  initData: () => void;
}> = ({ repoId, knowledgeInfo, initData }) => {
  const { t } = useTranslation();
  const {
    avatarIcon,
    avatarColor,
    name,
    desc,
    loading,
    botIcon,
    botColor,
    showModal,
    idCopied,
    setName,
    setDesc,
    setBotIcon,
    setBotColor,
    setShowModal,
    setIdCopied,
    handleSave,
  } = useSettingPage({ knowledgeInfo, repoId, initData });
  return (
    <div
      className="w-full h-full flex flex-col flex-1 p-6 pb-2 bg-[#fff] border border-[#E2E8FF]"
      style={{ borderRadius: 24 }}
    >
      {showModal && (
        <MoreIcons
          icons={avatarIcon}
          colors={avatarColor}
          botIcon={botIcon}
          setBotIcon={setBotIcon}
          botColor={botColor}
          setBotColor={setBotColor}
          setShowModal={setShowModal}
        />
      )}
      <div className="w-full flex pb-5 border-b border-[#E2E8FF] justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-second">
            {t('knowledge.knowledgeSettings')}
          </h2>
          <p className="ml-2 desc-color font-medium mt-2">
            {t('knowledge.knowledgeSettingsDescription')}
          </p>
        </div>
        <Button
          type="primary"
          disabled={!name?.trim()}
          loading={loading}
          className="primary-btn ml-3 w-[125px] h-10"
          onClick={() => handleSave()}
        >
          {t('common.save')}
        </Button>
      </div>
      <div className="flex-1 overflow-auto pt-10 pb-8 flex justify-center">
        <div className="w-1/2">
          <h3 className="text-second font-medium text-lg flex items-center">
            <span className="text-[#F74E43] text-lg font-medium h-5">*</span>
            <span className="ml-0.5">{t('knowledge.knowledgeBaseName')}</span>
          </h3>
          <div className="flex items-center mt-2 text-desc gap-4 group">
            <p>
              {t('knowledge.knowledgeBaseId')}
              {knowledgeInfo.coreRepoId}
            </p>
            <img
              src={idCopied ? chatCopied : chatCopy}
              className="w-4 h-4 cursor-pointer hidden group-hover:block"
              onClick={() => {
                copy(knowledgeInfo.coreRepoId);
                setIdCopied(true);
                window.setTimeout(() => {
                  setIdCopied(false);
                }, 2000);
              }}
              alt=""
            />
          </div>
          <div className="flex items-center mt-3">
            <Input
              maxLength={20}
              showCount
              type="text"
              className="global-input"
              placeholder={t('knowledge.pleaseEnter')}
              value={name}
              onChange={event => setName(event.target.value)}
            />
          </div>
          <div className="mt-8">
            <h3 className="text-second font-medium text-lg">
              {t('knowledge.knowledgeBaseDescription')}
            </h3>
            <p className="mt-2 text-desc">
              {t('knowledge.knowledgeBaseDescriptionDetail')}
            </p>
            <div className="relative">
              <TextArea
                maxLength={200}
                placeholder={t('knowledge.pleaseEnter')}
                className="global-textarea mt-3 shrink-0"
                style={{ height: 120 }}
                value={desc}
                onChange={event => setDesc(event.target.value)}
              />
              <div className="absolute bottom-3 right-3 ant-input-limit ">
                {desc?.length} / 200
              </div>
            </div>
          </div>
          <h3 className="mt-8 text-second font-medium text-lg">
            {t('knowledge.indexingMethod')}
          </h3>
          <div className="mt-3 border border-[#009dff] rounded-lg px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl text-second font-medium">
                {t('knowledge.highQuality')}
              </h2>
              <p className="mt-2 text-desc">
                {t('knowledge.highQualityDescription')}
              </p>
              {/* <p className='mt-2 text-desc'>
                执行嵌入预估消耗 <span className='text-[#1F2A37]' style={{ fontFamily: 'SF Pro Text, SF Pro Text-500' }}>8,665 tokens(<span className='text-[#13A10E]'>$0.0008665</span>)</span>
              </p> */}
            </div>
            <div className="w-5 h-5 bg-[#6356EA] rounded-full flex justify-center items-center">
              <img src={check} className="w-4 h-4" alt="" />
            </div>
          </div>
          {/* <div className='mt-8'>
            <h3 className='text-second font-medium text-lg'>语言模型</h3>
            <Select
              className='global-select w-full mt-3'
              suffixIcon={<img src={formSelect} className="w-4 h-4" />}
            />
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default SettingPage;
