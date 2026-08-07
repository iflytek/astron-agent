import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import styles from './index.module.scss';

interface SiderContainerProps {
  topBar?: (() => ReactNode) | ReactNode;
  leftNav?: (() => ReactNode) | ReactNode;
  rightContent?: (() => ReactNode) | ReactNode;
  className?: string;
  scrollToBottom?: () => void;
  distanceToBottom?: number;
}

const SiderContainer: React.FC<SiderContainerProps> = ({
  topBar,
  leftNav,
  rightContent,
  className = '',
  scrollToBottom,
  distanceToBottom = 10,
}) => {
  const siderContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const [leftNavHeight, setLeftNavHeight] = useState<string>('100vh');

  // 计算左侧导航高度
  const calculateLeftNavHeight = useCallback(() => {
    if (!scrollContainerRef.current) {
      return;
    }

    const scrollContainerHeight = scrollContainerRef.current.offsetHeight;
    setLeftNavHeight(`${scrollContainerHeight}px`);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = (): void => {
      if (
        scrollContainer.scrollTop + scrollContainer.clientHeight >=
        scrollContainer.scrollHeight - distanceToBottom
      ) {
        scrollToBottom?.();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return (): void => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [scrollToBottom, distanceToBottom]);

  // 监听容器和topBar高度变化
  useEffect(() => {
    calculateLeftNavHeight();

    const handleResize = (): void => {
      calculateLeftNavHeight();
    };

    window.addEventListener('resize', handleResize);

    // 使用ResizeObserver监听容器和topBar高度变化
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        calculateLeftNavHeight();
      });

      // 监听容器高度变化
      if (siderContainerRef.current) {
        resizeObserver.observe(siderContainerRef.current);
      }

      // 监听topBar高度变化（如果存在）
      if (topBarRef.current) {
        resizeObserver.observe(topBarRef.current);
      }
    }

    return (): void => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [topBar]);

  const renterSlot = useCallback(
    (slotProp?: (() => ReactNode) | ReactNode): ReactNode | null => {
      if (!slotProp) return null;

      return typeof slotProp === 'function' ? slotProp() : slotProp;
    },
    []
  );

  return (
    <div
      ref={siderContainerRef}
      className={`${styles.siderContainer} ${className}`}
    >
      {/* 顶部工具插槽 */}
      {topBar && (
        <div ref={topBarRef} className={styles.topBar}>
          {renterSlot(topBar)}
        </div>
      )}

      {/* 滚动容器 - 下半部分容器 */}
      <div ref={scrollContainerRef} className={styles.scrollContainer}>
        <div className={styles.placeholderContainer}>
          {/* 左侧导航 - 始终使用sticky定位，动态高度 */}
          {leftNav && (
            <div className={styles.leftNav} style={{ height: leftNavHeight }}>
              {renterSlot(leftNav)}
            </div>
          )}

          {/* 右侧内容区域 */}
          <div className={styles.rightContent}>{renterSlot(rightContent)}</div>
        </div>
      </div>
    </div>
  );
};

export default SiderContainer;
