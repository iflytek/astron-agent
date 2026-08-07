import GlobalMarkDown from '@/components/global-markdown';
import { typeList } from '@/constants';
import { HitResult } from '@/types/resource';
import { generateType } from '@/utils/utils';
import { Button, Input, Progress } from 'antd';
import Lottie from 'lottie-react';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';

import mingzhongAnimation from '@/constants/lottie-react/mingzhong.json';
import hit from '@/assets/imgs/knowledge/icon_zhishi_target_white.png';
import order from '@/assets/imgs/knowledge/icon_zhishi_order.png';
import target from '@/assets/imgs/knowledge/icon_target.png';
const { TextArea } = Input;
export const HistoryContent: FC<{
  history: HitResult[];
  historyRef: React.RefObject<HTMLDivElement>;
  handleScroll: () => void;
  searchValue: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  searching: boolean;
  searchAnswer: () => void;

  answers: HitResult[];
  setCurrentFile: React.Dispatch<React.SetStateAction<HitResult>>;
  setDetailModal: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({
  history,
  historyRef,
  handleScroll,
  searchValue,
  setSearchValue,
  searching,
  searchAnswer,
  answers,
  setCurrentFile,
  setDetailModal,
}) => {
  const { t } = useTranslation();
  return (
    <div className="pt-4 flex flex-1 overflow-hidden">
      <div
        className="h-full flex flex-col overflow-auto pr-6 border-r border-[#E2E8FF]"
        ref={historyRef}
        onScroll={handleScroll}
        style={{ width: '35%' }}
      >
        <div className="w-full">
          <div className="text-second text-lg font-medium shrink-0">
            {t('knowledge.queryText')}
          </div>
          <TextArea
            value={searchValue}
            onChange={event => setSearchValue(event.target.value)}
            placeholder={t('knowledge.pleaseEnter')}
            className="global-textarea mt-3 shrink-0"
            style={{ height: 152, resize: 'none' }}
            onPressEnter={event => {
              event.stopPropagation();
              event.preventDefault();
              searchAnswer();
            }}
          />
          <div className="flex justify-end shrink-0">
            <Button
              type="primary"
              onClick={searchAnswer}
              className="primary-btn w-[82px] h-10 px-4 flex items-center justify-center gap-1 mt-3"
              disabled={!searchValue || searching}
            >
              <img src={hit} className="w-4 h-4" alt="" />
              <span className="text-sm">
                {t('knowledge.query')}
                {searching && t('knowledge.querying')}
              </span>
            </Button>
          </div>
        </div>
        <div className="flex-1 w-full flex flex-col flex-shrink-0 min-h-[150px]">
          <div className="mt-8">
            <div className="text-second text-lg font-medium">
              {t('knowledge.recentQueries')}
            </div>
          </div>
          <div className="mt-3 w-full flex-1 flex flex-col">
            <div className="w-full flex px-5 py-[18px] bg-[#f9fafb] text-[#a4a4a4] text-xs font-medium">
              <span style={{ flex: 2 }}>{t('knowledge.queryTextHeader')}</span>
              <span style={{ flex: 1 }}>{t('knowledge.testTime')}</span>
            </div>
            <div className="flex-1">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center px-5 py-2.5 text-second font-medium border-b border-[#e9eff6] cursor-pointer"
                  onClick={() => setSearchValue(item.query || '')}
                >
                  <span
                    style={{ flex: 2 }}
                    className="text-overflow"
                    title={item.query}
                  >
                    {item.query}
                  </span>
                  <span style={{ flex: 1 }} className="text-sm">
                    {item.createTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="h-full" style={{ width: '65%' }}>
        {!searching &&
          (!answers.length ? (
            <div className="mt-[80px] flex flex-col justify-center items-center">
              <img src={target} className="w-16 h-16" alt="" />
              <p className="mt-8 text-base text-[#C0C4CC] font-medium">
                {t('knowledge.hitKnowledgeParagraphsWillShowHere')}
              </p>
            </div>
          ) : (
            <div className="pt-6 h-full flex flex-col pl-6">
              <div className="title-second">
                {t('knowledge.hitParagraphs')}
                <span className="inline-block ml-2 rounded-md bg-[#F0F3F9] px-2 py-0.5 text-desc">
                  {answers.length} {t('knowledge.paragraphs')}
                </span>
              </div>
              <div className="flex-1 overflow-auto grid grid-cols-2 gap-4 pr-6">
                {answers.map((item, index) => (
                  <div
                    key={index}
                    className="mt-3 bg-[#F6F6FD] rounded-xl p-4 h-[260px] flex flex-col cursor-pointer overflow-hidden"
                    onClick={() => {
                      setCurrentFile({ ...item, index });
                      setDetailModal(true);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center">
                        <img src={order} className="w-3 h-3" alt="" />
                        <span
                          className="ml-1 text-xs text-[#F6B728]"
                          style={{
                            fontFamily: 'SF Pro Text, SF Pro Text-600',
                            fontStyle: 'italic',
                          }}
                        >
                          00{index + 1}
                        </span>
                      </span>
                      <span className="flex items-center">
                        <Progress
                          className=" upload-progress hit-progress"
                          percent={item.score * 100}
                        />
                        <span
                          className="text-[#6356EA] font-medium ml-2"
                          style={{
                            fontFamily: 'SF Pro Text, SF Pro Text-600',
                            fontStyle: 'italic',
                          }}
                        >
                          {item.score}
                        </span>
                      </span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <GlobalMarkDown
                        content={item.knowledge}
                        isSending={false}
                      />
                    </div>
                    <div className="flex items-center py-2.5 border-t border-[#E2E8FF]">
                      <img
                        src={typeList.get(
                          generateType(
                            item.fileInfo && item.fileInfo.type?.toLowerCase()
                          ) || ''
                        )}
                        className="w-4 h-4"
                        alt=""
                      />
                      <span
                        className="flex-1 text-second font-medium ml-1 text-overflow"
                        title={item.fileInfo?.name}
                      >
                        {item.fileInfo && item.fileInfo.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        {searching && (
          <div className="mt-[77px] pl-6 flex items-center gap-4 w-full">
            <div className="bg-[#F8FAFF] rounded-xl flex-1 p-4">
              <Lottie
                animationData={mingzhongAnimation}
                loop={true}
                autoplay={true}
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <div className="bg-[#F8FAFF] rounded-xl flex-1 p-4">
              <Lottie
                animationData={mingzhongAnimation}
                loop={true}
                autoplay={true}
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
