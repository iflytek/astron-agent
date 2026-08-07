import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './index.module.scss';
// import { getPluginSquareBannerConfig } from '@/services/plugin';

import banner_1 from '@/assets/imgs/plugin/banner/g-18@3x.png';
import banner_2 from '@/assets/imgs/plugin/banner/g-19@3x.png';
import banner_3 from '@/assets/imgs/plugin/banner/g-20@3x.png';
import banner_4 from '@/assets/imgs/plugin/banner/g-21@3x.png';
import banner_5 from '@/assets/imgs/plugin/banner/g-22@3x.png';

interface BannerImage {
  src: string;
  link?: string; // 可选的跳转链接
  linkTarget?: '_blank' | '_self'; // 链接打开方式，默认为 _blank
}

interface BannerProps {
  autoPlay?: boolean;
  interval?: number;
}

const defaultBannerImgs: BannerImage[] = [
  {
    src: banner_1,
    link: '/store/plugin/1',
  },
  {
    src: banner_2,
    link: '/store/plugin/2',
  },
  {
    src: banner_3,
    link: '/store/plugin/3',
  },
  {
    src: banner_4,
    link: '/store/plugin/4',
  },
  {
    src: banner_5,
    link: '/store/plugin/5',
  },
];

const Banner: React.FC<BannerProps> = ({
  autoPlay = true,
  interval = 5000,
}) => {
  const [images, setImages] = useState<BannerImage[]>(defaultBannerImgs);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false); // 鼠标悬停状态
  const [containerWidth, setContainerWidth] = useState(0); // 容器宽度
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  // 图片尺寸配置
  const SLIDE_WIDTH = 498; // 图片原始宽度
  const SCALE_DISTANCE_1 = 0.8; // distance 1 的缩放
  const SCALE_DISTANCE_2 = 0.65; // distance 2 的缩放
  const EDGE_PADDING = 5; // 边缘安全距离（像素），防止超出或阴影被裁剪

  // 监听容器宽度变化
  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    // 初始化
    updateContainerWidth();

    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(updateContainerWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    // const fetchData = async () => {
    //   const res = await getPluginSquareBannerConfig();
    //   console.log(res, 'getPluginSquareBannerConfig');
    //   setImages(
    //     res.map((item: any) => ({
    //       src: item.name,
    //       link: `/store/plugin/${item.value}?isMcp=${item.remarks === 'mcp'}&category=0&tab=`,
    //     }))
    //   );
    // };
    // fetchData();
  }, []);

  useEffect(() => {
    // 只有在自动播放开启、图片数量大于1且鼠标未悬停时才启动定时器
    if (autoPlay && images.length > 1 && !isHovered) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoPlay, interval, images.length, isHovered]);

  // 计算每个slide相对于当前active slide的位置
  const getSlidePosition = (slideIndex: number) => {
    const totalSlides = images.length;
    let position = slideIndex - currentIndex;

    // 处理循环逻辑，确保位置在 -2 到 2 之间
    if (position > 2) {
      position = position - totalSlides;
    } else if (position < -2) {
      position = position + totalSlides;
    }

    return position;
  };

  // 根据位置获取样式
  const getSlideStyle = (position: number) => {
    const distance = Math.abs(position);

    // 根据容器宽度动态调整缩放比例
    let adjustedScaleCenter = 1.1;
    let adjustedScaleDistance1 = SCALE_DISTANCE_1;
    let adjustedScaleDistance2 = SCALE_DISTANCE_2;

    if (containerWidth > 0) {
      // 计算5张图片完整显示所需的最小宽度
      // 最外侧两张图片（distance 2）各占半个位置，加上两边的边距
      const minRequiredWidthForOuterSlides =
        SLIDE_WIDTH * SCALE_DISTANCE_2 + EDGE_PADDING * 2;

      // 同时检查中心图片是否会超出（中心图片缩放1.2倍）
      const minRequiredWidthForCenter = SLIDE_WIDTH * 1.2 + EDGE_PADDING * 2;

      // 取两者中的较大值
      const minRequiredWidth = Math.max(
        minRequiredWidthForOuterSlides,
        minRequiredWidthForCenter
      );

      // 如果容器宽度小于这个最小宽度，需要缩小所有图片
      if (containerWidth < minRequiredWidth) {
        // 计算两个约束条件下的缩放因子，取较小值
        const scaleFactorOuter =
          (containerWidth - EDGE_PADDING * 2) /
          (SLIDE_WIDTH * SCALE_DISTANCE_2);
        const scaleFactorCenter =
          (containerWidth - EDGE_PADDING * 2) / (SLIDE_WIDTH * 1.2);
        const scaleFactor = Math.min(scaleFactorOuter, scaleFactorCenter);

        // 所有图片按相同比例缩小，保持视觉层次
        adjustedScaleCenter = 1.2 * scaleFactor;
        adjustedScaleDistance1 = SCALE_DISTANCE_1 * scaleFactor;
        adjustedScaleDistance2 = SCALE_DISTANCE_2 * scaleFactor;
      }
    }

    // 基础样式
    let style = {
      transform: 'translateY(-50%)',
      zIndex: 1,
      left: '50%',
      opacity: 1,
    };

    if (distance === 0) {
      // 中心slide（active）- 确保在容器正中心
      style = {
        ...style,
        transform: `translateY(-50%) translateX(-50%) scale(${adjustedScaleCenter})`,
        zIndex: 5,
        left: '50%',
      };
    } else if (distance === 1 || distance === 2) {
      // 根据容器宽度动态计算位置
      if (containerWidth > 0) {
        // distance 2 的缩放后半宽（图片使用 translateX(-50%)，所以计算半宽）
        const halfWidthDistance2 = (SLIDE_WIDTH * adjustedScaleDistance2) / 2;

        // 计算最外侧图片贴合边缘的位置（加上安全边距）
        let leftPosDistance2: number;
        if (position > 0) {
          // 右侧最外侧：图片右边缘距离容器右边缘保持安全距离
          leftPosDistance2 =
            ((containerWidth - halfWidthDistance2 - EDGE_PADDING) /
              containerWidth) *
            100;
        } else {
          // 左侧最外侧：图片左边缘距离容器左边缘保持安全距离
          leftPosDistance2 =
            ((halfWidthDistance2 + EDGE_PADDING) / containerWidth) * 100;
        }

        // 确保位置在合理范围内，给予更保守的限制
        const halfWidthPercent = (halfWidthDistance2 / containerWidth) * 100;
        if (position > 0) {
          leftPosDistance2 = Math.max(
            50 + halfWidthPercent,
            Math.min(100 - halfWidthPercent, leftPosDistance2)
          );
        } else {
          leftPosDistance2 = Math.max(
            halfWidthPercent,
            Math.min(50 - halfWidthPercent, leftPosDistance2)
          );
        }

        let leftPos: number;
        let scale: number;

        if (distance === 1) {
          // distance 1 在中心(50%)和 distance 2 之间均匀分布
          leftPos = 50 + (leftPosDistance2 - 50) * 0.65; // 0.65 是调节系数
          scale = adjustedScaleDistance1;
        } else {
          // distance 2 贴合边缘（保持安全距离）
          leftPos = leftPosDistance2;
          scale = adjustedScaleDistance2;
        }

        style = {
          ...style,
          transform: `translateY(-50%) translateX(-50%) scale(${scale})`,
          zIndex: distance === 1 ? 4 : 3,
          left: `${leftPos}%`,
        };
      } else {
        // 容器宽度未初始化时使用默认值
        const defaultOffset = distance === 1 ? 22 : 38;
        const leftPos = 50 + (position > 0 ? defaultOffset : -defaultOffset);
        style = {
          ...style,
          transform: `translateY(-50%) translateX(-50%) scale(${distance === 1 ? SCALE_DISTANCE_1 : SCALE_DISTANCE_2})`,
          zIndex: distance === 1 ? 4 : 3,
          left: `${leftPos}%`,
        };
      }
    } else {
      // 超出显示范围的slide
      style = {
        ...style,
        transform: 'translateY(-50%) translateX(-50%) scale(0.5)',
        zIndex: 1,
        opacity: 0,
        left: position > 0 ? '100%' : '0%',
      };
    }

    return style;
  };

  // 获取slide的CSS类名
  const getSlideClass = (position: number) => {
    const distance = Math.abs(position);

    if (distance === 0) {
      return `${styles.bannerSlide} ${styles.bannerSlideActive}`;
    } else if (distance === 1) {
      return `${styles.bannerSlide} ${styles.bannerSlideAdjacent}`;
    } else if (distance === 2) {
      return `${styles.bannerSlide} ${styles.bannerSlideDistant}`;
    } else {
      return `${styles.bannerSlide} ${styles.bannerSlideHidden}`;
    }
  };

  const handleSlideClick = (index: number) => {
    const image = images[index];

    // 如果点击的是当前激活的图片，且有链接配置，则跳转
    if (index === currentIndex && image?.link) {
      navigate(image.link);
    } else {
      // 如果点击的不是当前激活的图片，则切换到该图片
      setCurrentIndex(index);
    }
  };

  // 鼠标进入时暂停轮播
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  // 鼠标离开时恢复轮播
  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      ref={containerRef}
      className={styles.bannerContainer}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.bannerWrapper}>
        {images.map((image, index) => {
          const position = getSlidePosition(index);
          const slideStyle = getSlideStyle(position);
          const slideClass = getSlideClass(position);
          const isActiveWithLink = index === currentIndex && image.link;

          return (
            <div
              key={index}
              className={slideClass}
              style={{
                ...slideStyle,
                cursor: isActiveWithLink
                  ? 'pointer'
                  : position === 0
                    ? 'default'
                    : 'pointer',
              }}
              onClick={() => handleSlideClick(index)}
              title={
                isActiveWithLink ? '点击跳转' : position !== 0 ? '点击查看' : ''
              }
            >
              <div className={styles.bannerSlideInner}>
                <img
                  src={image.src}
                  alt=""
                  className={styles.bannerSlideImage}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 指示器 */}
      {/* <div className={styles.bannerIndicators}>
        {images.map((_, index) => (
          <button
            key={index}
            className={`${styles.bannerIndicator} ${index === currentIndex ? styles.active : ''}`}
            onClick={() => handleSlideClick(index)}
          />
        ))}
      </div> */}
    </div>
  );
};

export default Banner;
