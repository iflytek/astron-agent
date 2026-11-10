import { useState, useCallback, useRef, useEffect } from 'react';
import { pageList, create } from '@/services/database';
import { DatabaseItem, CreateDbParams } from '@/types/database';

export const useDatabaseList = () => {
  const [hasMore, setHasMore] = useState(false);
  const [dataSource, setDataSource] = useState<DatabaseItem[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const page = useRef(1);
  const query = useRef('');
  const loadingRef = useRef(false);
  const fetchPage = useCallback(
    async (pageNum: number, search: string): Promise<void> => {
      const id = ++requestId.current;
      loadingRef.current = true;
      setLoading(true);
      setError('');
      try {
        const data = await pageList({ pageNum, pageSize: 20, search });
        if (id !== requestId.current) return;
        setDataSource(previous =>
          pageNum === 1
            ? data.records || []
            : [...previous, ...(data.records || [])]
        );
        page.current = pageNum;
        setHasMore(pageNum * 20 < data.total);
      } catch (failure) {
        if (id === requestId.current)
          setError(
            failure instanceof Error
              ? failure.message
              : '数据库加载失败，请重试。'
          );
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    },
    []
  );
  const getList = useCallback((): void => {
    void fetchPage(1, query.current);
  }, [fetchPage]);
  const search = useCallback(
    (value: string): void => {
      query.current = value;
      setSearchValue(value);
      setDataSource([]);
      void fetchPage(1, value);
    },
    [fetchPage]
  );
  const handleLoadMore = (): void => {
    if (!loadingRef.current && hasMore)
      void fetchPage(page.current + 1, query.current);
  };
  const createDatabaseOk = async (params: CreateDbParams): Promise<void> => {
    await create(params);
    getList();
  };
  useEffect(() => {
    getList();
    return () => {
      requestId.current += 1;
    };
  }, [getList]);
  return {
    dataSource,
    hasMore,
    searchValue,
    loading,
    error,
    getList,
    search,
    handleLoadMore,
    createDatabaseOk,
  };
};
