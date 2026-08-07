import React, { useState, useRef, useEffect } from 'react';

interface UseConfigManagementProps {
  lengthRange: number[];
}

/**
 * 配置管理相关的 hook
 */
export const useConfigManagement = ({
  lengthRange,
}: UseConfigManagementProps): {
  configDetail: {
    min: number;
    max: number;
    seperator: string;
  };
  setConfigDetail: React.Dispatch<
    React.SetStateAction<{
      min: number;
      max: number;
      seperator: string;
    }>
  >;
  initConfig: () => void;
} => {
  const timerRef = useRef<number>();
  const [configDetail, setConfigDetail] = useState({
    min: 1,
    max: 256,
    seperator: '\n',
  });

  const initConfig = (): void => {
    setConfigDetail({
      min: lengthRange[0] || 0,
      max: lengthRange[1] || 0,
      seperator: '\\n',
    });
  };

  const swapMinMax = (obj: { min: number; max: number }): void => {
    if (obj.min > obj.max) {
      [obj.min, obj.max] = [obj.max, obj.min];
    }
  };

  // 自动修正最小值和最大值
  useEffect(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (configDetail.min > configDetail.max) {
        swapMinMax(configDetail);
        setConfigDetail({ ...configDetail });
      }
    }, 1000);
    return (): void => {
      window.clearTimeout(timerRef.current);
    };
  }, [configDetail]);

  // 初始化配置
  useEffect(() => {
    initConfig();
  }, []);

  return {
    configDetail,
    setConfigDetail,
    initConfig,
  };
};
