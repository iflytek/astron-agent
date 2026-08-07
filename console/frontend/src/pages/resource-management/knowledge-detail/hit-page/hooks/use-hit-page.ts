import { hitHistoryByPage, hitTest } from '@/services/knowledge';
import { HitResult, KnowledgeItem } from '@/types/resource';
import { modifyContent } from '@/utils/utils';
import React, { useEffect, useRef, useState } from 'react';

export const useHitPage = ({
  repoId,
}: {
  repoId: string;
}): {
  historyRef: React.RefObject<HTMLDivElement>;
  searchValue: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  searching: boolean;
  setSearching: React.Dispatch<React.SetStateAction<boolean>>;
  answers: HitResult[];
  setAnswers: React.Dispatch<React.SetStateAction<HitResult[]>>;
  detailModal: boolean;
  setDetailModal: React.Dispatch<React.SetStateAction<boolean>>;
  currentFile: HitResult;
  setCurrentFile: React.Dispatch<React.SetStateAction<HitResult>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  handleScroll: () => void;
  searchAnswer: () => void;
  history: HitResult[];
} => {
  const historyRef = useRef<HTMLDivElement | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [answers, setAnswers] = useState<HitResult[]>([]);
  const [detailModal, setDetailModal] = useState(false);
  const [history, setHistory] = useState<HitResult[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [_, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentFile, setCurrentFile] = useState<HitResult>({} as HitResult);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getHistory();
  }, []);

  function getHistory(number?: number): void {
    const params = {
      repoId,
      pageNo: number || pageNumber,
      pageSize: 10,
    };
    hitHistoryByPage(params).then(data => {
      setPageNumber(preNumber => preNumber + 1);
      setHistory(data.pageData || []);
      setTotal(data.totalCount);
      if (data.totalCount > 10) {
        setHasMore(true);
      } else {
        setHasMore(false);
      }
    });
  }

  function handleScroll(): void {
    const element = historyRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;

    if (scrollTop + clientHeight >= scrollHeight && !loading && hasMore) {
      setLoading(true);
      moreHistory();
    }
  }

  function moreHistory(): void {
    const params = {
      repoId,
      pageNo: pageNumber,
      pageSize: 10,
    };
    hitHistoryByPage(params)
      .then(data => {
        setPageNumber(preNumber => preNumber + 1);
        const newHistory = [...history, ...(data.pageData || [])];
        //@ts-ignore
        setHistory(newHistory);
        if (data.totalCount > newHistory.length) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      })
      .finally(() => setLoading(false));
  }

  function searchAnswer(): void {
    setSearching(true);
    if (historyRef.current) {
      historyRef.current.scrollTop = 0;
    }
    if (searchValue) {
      const params = {
        id: repoId,
        query: searchValue,
      };
      hitTest(params)
        .then(data => {
          const regexPattern = new RegExp(searchValue, 'gi');
          const answers = data.map(item => {
            item.knowledge = (item.content || item.knowledge)?.replace(
              regexPattern,
              '<span style="color:#6356EA;font-weight:600;display:inline-block;padding:4px 0px;background:#dee2f9">$&</span>'
            );
            return {
              ...item,
              knowledge: modifyContent(
                item as unknown as KnowledgeItem['content']
              ),
              score: roundToTwoDecimalPlaces(item.score),
            };
          });

          setAnswers(answers);
          getHistory(1);
          setPageNumber(1);
        })
        .finally(() => setSearching(false));
    }
  }

  function roundToTwoDecimalPlaces(number: number): number {
    return Math.round(number * 100) / 100;
  }
  return {
    historyRef,
    searchValue,
    setSearchValue,
    searching,
    setSearching,
    answers,
    setAnswers,
    detailModal,
    setDetailModal,
    currentFile,
    setCurrentFile,
    loading,
    setLoading,
    handleScroll,
    searchAnswer,
    history,
  };
};
