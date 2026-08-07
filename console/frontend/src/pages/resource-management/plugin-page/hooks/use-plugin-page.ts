import globalStore from '@/store/global-store';
import useUserStore, { User } from '@/store/user-store';
import { ToolItem } from '@/types/resource';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jumpToLogin } from '@/utils/http';

export const usePluginPage = (): {
  user: User;
  tools: ToolItem[];
  getTools: (value?: string) => void;
  getToolsDebounce: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isHovered: boolean | null;
  setIsHovered: React.Dispatch<React.SetStateAction<boolean | null>>;
  deleteModal: boolean;
  setDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  currentTool: ToolItem;
  setCurrentTool: React.Dispatch<React.SetStateAction<ToolItem>>;
  searchValue: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  handleCardClick: (tool: ToolItem) => void;
  handleDeleteClick: (tool: ToolItem) => void;
  handleCreatePlugin: () => void;
} => {
  const navigate = useNavigate();
  const user = useUserStore(state => state.user);
  const tools = globalStore(state => state.tools);
  const getTools = globalStore(state => state.getTools);

  const [isHovered, setIsHovered] = useState<boolean | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [currentTool, setCurrentTool] = useState<ToolItem>({} as ToolItem);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    getTools();
  }, []);

  const getToolsDebounce = useCallback(
    debounce((e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      getTools(value?.trim());
    }, 500),
    [searchValue]
  );

  // 处理卡片点击
  const handleCardClick = (tool: ToolItem) => {
    if (tool.status == 0) {
      if (!user?.login && !user?.uid) {
        return jumpToLogin();
      }
      navigate(`/resource/plugin/create?id=${tool.id}`);
    } else {
      navigate(`/resource/plugin/detail/${tool.id}/parameter`);
    }
  };

  // 处理删除点击
  const handleDeleteClick = (tool: ToolItem) => {
    setCurrentTool(tool);
    setDeleteModal(true);
  };

  // 处理创建插件
  const handleCreatePlugin = () => {
    if (!user?.login && !user?.uid) {
      return jumpToLogin();
    }
    navigate('/resource/plugin/create');
  };

  // 处理Header组件的搜索事件
  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      getTools(value?.trim());
    },
    [setSearchValue, getTools]
  );

  // 监听Header组件的搜索事件
  useEffect(() => {
    const handleHeaderSearch = (event: CustomEvent) => {
      const { value, type } = event.detail;
      if (type === 'plugin') {
        handleSearch(value);
      }
    };

    const headerCreatePlugin = (event: CustomEvent) => {
      const { type } = event.detail;
      if (type === 'plugin') {
        handleCreatePlugin();
      }
    };

    window.addEventListener(
      'headerSearch',
      handleHeaderSearch as EventListener
    );
    window.addEventListener(
      'headerCreatePlugin',
      headerCreatePlugin as EventListener
    );
    return () => {
      window.removeEventListener(
        'headerSearch',
        handleHeaderSearch as EventListener
      );
      window.removeEventListener(
        'headerCreatePlugin',
        headerCreatePlugin as EventListener
      );
    };
  }, [handleSearch, handleCreatePlugin]);

  return {
    user,
    tools,
    getTools,
    getToolsDebounce,
    isHovered,
    setIsHovered,
    deleteModal,
    setDeleteModal,
    currentTool,
    setCurrentTool,
    searchValue,
    setSearchValue,
    handleCardClick,
    handleDeleteClick,
    handleCreatePlugin,
  };
};
