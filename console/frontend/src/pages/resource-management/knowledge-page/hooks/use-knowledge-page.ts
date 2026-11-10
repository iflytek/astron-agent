import { listRepos } from '@/services/knowledge';
import { ListReposParams, RepoItem } from '@/types/resource';
import { useCallback, useEffect, useRef, useState } from 'react';
import useUserStore from '@/store/user-store';
import { jumpToLogin } from '@/utils/http';

export const useKnowledgePage = () => {
  const user = useUserStore(state => state.user);
  const [deleteModal, setDeleteModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [currentKnowledge, setCurrentKnowledge] = useState<RepoItem>(
    {} as RepoItem
  );
  const [knowledges, setKnowledges] = useState<RepoItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const pageNo = useRef(1);
  const queryRef = useRef('');
  const loading = useRef(false);

  const fetchPage = useCallback(
    async (query: string, page: number): Promise<void> => {
      const id = ++requestId.current;
      loading.current = true;
      setIsLoading(true);
      setError('');
      try {
        // Console's list-repos endpoint filters by content; pagination also accepts page.
        const params: ListReposParams & { content: string } = {
          page,
          pageSize: 20,
          content: query.trim(),
        };
        const data = await listRepos(params);
        if (id !== requestId.current) return;
        const records = data.pageData || [];
        setKnowledges(previous =>
          page === 1 ? records : [...previous, ...records]
        );
        pageNo.current = page;
        setHasMore(page * 20 < data.totalCount);
      } catch (failure) {
        if (id === requestId.current)
          setError(
            failure instanceof Error
              ? failure.message
              : '知识库加载失败，请重试。'
          );
      } finally {
        if (id === requestId.current) {
          loading.current = false;
          setIsLoading(false);
        }
      }
    },
    []
  );

  const getKnowledges = useCallback(
    (value?: string): void => {
      void fetchPage(value ?? queryRef.current, 1);
    },
    [fetchPage]
  );
  const search = useCallback(
    (value: string): void => {
      queryRef.current = value;
      setSearchValue(value);
      setKnowledges([]);
      getKnowledges(value);
    },
    [getKnowledges]
  );
  const loadMore = (): void => {
    if (!loading.current && hasMore)
      void fetchPage(queryRef.current, pageNo.current + 1);
  };
  const create = useCallback((): void => {
    if (!user?.login && !user?.uid) return jumpToLogin();
    setCreateModal(true);
  }, [user]);

  useEffect(() => {
    getKnowledges();
    return () => {
      requestId.current += 1;
    };
  }, [getKnowledges]);
  useEffect(() => {
    const handleSearch = (event: Event): void => {
      const { type, value } = (event as CustomEvent).detail;
      if (type === 'knowledge') search(value);
    };
    window.addEventListener('headerSearch', handleSearch);
    window.addEventListener('headerCreateKnowledge', create);
    return () => {
      window.removeEventListener('headerSearch', handleSearch);
      window.removeEventListener('headerCreateKnowledge', create);
    };
  }, [search, create]);

  return {
    deleteModal,
    setDeleteModal,
    createModal,
    setCreateModal,
    currentKnowledge,
    setCurrentKnowledge,
    knowledges,
    hasMore,
    searchValue,
    isLoading,
    error,
    getKnowledges,
    search,
    create,
    loadMore,
  };
};
