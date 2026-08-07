import React, { useRef, useEffect } from 'react';

/**
 * 无限滚动 hook
 * @param callback 回调函数
 * @param hasMore 是否还有更多数据
 * @returns {targetRef, loading} 返回目标元素的引用和加载状态
 */
export const useInfiniteScroll = (
  callback: () => void,
  hasMore: boolean
): {
  targetRef: React.RefObject<HTMLDivElement>;
  loading: React.MutableRefObject<boolean>;
} => {
  const targetRef = useRef<HTMLDivElement>(null);
  const loading = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && hasMore && !loading.current) {
        callback();
      }
    });

    const target = targetRef.current;
    if (target) observer.observe(target);

    return (): void => {
      if (target) observer.unobserve(target);
    };
  }, [callback, hasMore]);

  return { targetRef, loading };
};
