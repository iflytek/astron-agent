import React, { useState, useEffect } from 'react';
import { listPreviewKnowledgeByPage } from '@/services/knowledge';
import { modifyChunks } from '@/utils/utils';
import { Chunk } from '@/types/resource';

interface UsePaginationProps {
  tag: string;
  fileIds: (string | number)[];
  total: number;
  chunks: Chunk[];
  setChunks: React.Dispatch<React.SetStateAction<Chunk[]>>;
  chunkRef: React.RefObject<HTMLDivElement>;
}

/**
 * 分页和滚动相关的 hook
 */
export const usePagination = (
  props: UsePaginationProps
): {
  pageNumber: number;
  hasMore: boolean;
  moreChunks: () => void;
  handleScroll: () => void;
  resetPagination: () => void;
} => {
  const { tag, fileIds, total, chunks, setChunks, chunkRef } = props;

  const [pageNumber, setPageNumber] = useState(2);
  const [hasMore, setHasMore] = useState(true);
  let loading: boolean = false;

  const moreChunks = (): void => {
    const params = {
      tag,
      fileIds,
      pageNo: pageNumber,
      pageSize: 10,
    };
    listPreviewKnowledgeByPage(params).then(data => {
      const newChunks = modifyChunks(data.pageData || []);
      setChunks(prevItems => [...prevItems, ...newChunks]);
      setPageNumber(prevPageNumber => prevPageNumber + 1);
      loading = false;
      if (total > chunks.length + 10) {
        setHasMore(true);
      } else {
        setHasMore(false);
      }
    });
  };

  const handleScroll = (): void => {
    const element = chunkRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;

    if (scrollTop + clientHeight >= scrollHeight - 200 && hasMore && !loading) {
      loading = true;
      moreChunks();
    }
  };

  // 重置分页状态
  const resetPagination = (): void => {
    setPageNumber(2);
    if (total > 10) {
      setHasMore(true);
    } else {
      setHasMore(false);
    }
  };

  // 绑定滚动事件
  useEffect(() => {
    const element = chunkRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
    }

    return (): void => {
      if (element) {
        element.removeEventListener('scroll', handleScroll);
      }
    };
  }, [pageNumber, hasMore, chunks]);

  return {
    pageNumber,
    hasMore,
    moreChunks,
    handleScroll,
    resetPagination,
  };
};
