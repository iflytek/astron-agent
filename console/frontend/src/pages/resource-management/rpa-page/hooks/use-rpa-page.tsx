import { getRpaList } from '@/services/rpa';
import { RpaDetailFormInfo, RpaInfo } from '@/types/rpa';
import { useRequest, useDebounceFn } from 'ahooks';
import React, { useState, useEffect, useCallback } from 'react';

export const useRpaPage = (
  modalFormRef: React.RefObject<{
    showModal: (values?: RpaDetailFormInfo) => void;
  }>
): {
  handleSearchRpas: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isHovered: boolean | null;
  setIsHovered: React.Dispatch<React.SetStateAction<boolean | null>>;
  rpas: RpaInfo[];
  refresh: () => void;
  searchValue: string;
} => {
  const [isHovered, setIsHovered] = useState<boolean | null>(null);
  const [searchValue, setSearchValue] = useState('');

  const { data, refresh } = useRequest(
    () =>
      getRpaList({
        name: searchValue?.trim(),
      }),
    {
      refreshDeps: [searchValue],
    }
  );

  const { run: handleSearchRpas } = useDebounceFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
    },
    { wait: 500 }
  );

  const handleCreateRPA = useCallback(() => {
    modalFormRef.current?.showModal(undefined);
  }, [modalFormRef.current]);

  // 监听Header组件的搜索事件
  useEffect(() => {
    const handleHeaderSearch = (event: CustomEvent) => {
      const { value, type } = event.detail;
      if (type === 'rpa') {
        setSearchValue(value);
      }
    };

    const headerCreate = (event: CustomEvent) => {
      handleCreateRPA();
    };

    window.addEventListener(
      'headerSearch',
      handleHeaderSearch as EventListener
    );
    window.addEventListener('headerCreateRPA', headerCreate as EventListener);
    return () => {
      window.removeEventListener(
        'headerSearch',
        handleHeaderSearch as EventListener
      );
      window.removeEventListener(
        'headerCreateRPA',
        headerCreate as EventListener
      );
    };
  }, [handleSearchRpas, handleCreateRPA]);

  return {
    handleSearchRpas,
    isHovered,
    setIsHovered,
    rpas: data || [],
    refresh,
    searchValue,
  };
};
