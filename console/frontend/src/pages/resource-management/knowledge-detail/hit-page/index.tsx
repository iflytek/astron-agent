import React, { FC } from 'react';
import { DetailModal } from './components/modal-components';
import { useTranslation } from 'react-i18next';
import { useHitPage } from './hooks/use-hit-page';
import { HistoryContent } from './components/history-content';

const HitPage: FC<{ repoId: string }> = ({ repoId }) => {
  const { t } = useTranslation();
  const {
    historyRef,
    searchValue,
    setSearchValue,
    searching,

    answers,
    history,
    detailModal,
    setDetailModal,
    currentFile,
    setCurrentFile,

    handleScroll,
    searchAnswer,
  } = useHitPage({ repoId });

  return (
    <div
      className="w-full h-full flex flex-col flex-1 p-6 pb-2 bg-[#fff] border border-[#E2E8FF] overflow-hidden"
      style={{ borderRadius: 14 }}
    >
      {detailModal && (
        <DetailModal
          currentFile={currentFile}
          setDetailModal={setDetailModal}
        />
      )}
      <div className="w-full flex flex-wrap gap-3 pb-5 border-b border-[#E2E8FF] ">
        <h2 className="text-xl font-semibold text-second">
          {t('knowledge.hitTest')}
        </h2>
        <p className="ml-2 desc-color font-medium mt-2">
          {t('knowledge.hitTestDescription')}
        </p>
      </div>
      <HistoryContent
        history={history}
        historyRef={historyRef}
        handleScroll={handleScroll}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        searching={searching}
        searchAnswer={searchAnswer}
        answers={answers}
        setCurrentFile={setCurrentFile}
        setDetailModal={setDetailModal}
      />
    </div>
  );
};

export default HitPage;
