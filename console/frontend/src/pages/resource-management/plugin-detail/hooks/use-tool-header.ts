import { listTools } from '@/services/plugin';
import { ToolItem } from '@/types/resource';
import { getActiveKey } from '@/utils/utils';
import React, { useEffect, useMemo, useRef, useState } from 'react';

export const useToolHeader = ({
  toolInfo,
  toolId,
}: {
  toolInfo: ToolItem;
  toolId: string;
}): {
  currentTab: string | undefined;
  showDropList: boolean;
  tools: ToolItem[];
  isHover: boolean;
  showVersionManagement: boolean;
  filterTools: ToolItem[];
  setIsHover: (value: boolean) => void;
  optionsRef: React.RefObject<HTMLDivElement>;
  setShowDropList: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentTab: React.Dispatch<React.SetStateAction<string | undefined>>;
} => {
  const optionsRef = useRef<HTMLDivElement | null>(null);

  const [currentTab, setCurrentTab] = useState<string | undefined>('');
  const [showDropList, setShowDropList] = useState(false);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [isHover, setIsHover] = useState(false);

  const showVersionManagement = useMemo(() => {
    return !!(toolInfo?.id && currentTab !== 'setting');
  }, [toolInfo?.id, currentTab]);

  useEffect(() => {
    const activeTab = getActiveKey();
    setCurrentTab(activeTab);
  }, [toolId]);

  useEffect(() => {
    getTools();
  }, []);

  function getTools(): void {
    const params = {
      pageNo: 1,
      pageSize: 9999,
    };
    listTools(params).then(data => {
      setTools(data.pageData || []);
    });
  }

  useEffect(() => {
    document.body.addEventListener('click', clickOutside);
    return (): void => document.body.removeEventListener('click', clickOutside);
  }, []);

  function clickOutside(event: MouseEvent): void {
    if (
      optionsRef.current &&
      !optionsRef.current.contains(event.target as Node)
    ) {
      setShowDropList(false);
    }
  }

  const filterTools = tools.filter(item => item.toolId !== toolInfo?.toolId);
  return {
    currentTab,
    showDropList,
    tools,
    isHover,
    showVersionManagement,
    filterTools,
    setIsHover,
    optionsRef,
    setShowDropList,
    setCurrentTab,
  };
};
