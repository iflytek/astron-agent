import { useEffect, useState, RefObject } from 'react';

/**
 * 检测元素是否有滚动条
 * @param ref 需要检测的元素引用
 * @param deps 依赖项数组，当这些依赖变化时重新检测
 * @returns 是否有滚动条
 */
export function useScrollbar<T extends HTMLElement>(
  ref: RefObject<T>,
  deps: any[] = []
): boolean {
  const [hasScrollbar, setHasScrollbar] = useState(false);

  useEffect(() => {
    const checkScrollbar = () => {
      if (ref.current) {
        const hasScroll = ref.current.scrollHeight > ref.current.clientHeight;
        setHasScrollbar(hasScroll);
      }
    };

    // 初始检测
    checkScrollbar();

    // 监听尺寸变化
    const observer = new ResizeObserver(checkScrollbar);
    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [ref, ...deps]);

  return hasScrollbar;
}
