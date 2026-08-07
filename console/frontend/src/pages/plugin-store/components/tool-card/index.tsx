import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.scss';

// 导入需要的图标资源
// import collect from '@/assets/svgs/icon_bot_tag@2x.svg';
// // import checkCollect from '@/assets/svgs/icon_bot_tag_check@2x.svg';
import toolAuthor from '@/assets/svgs/toolStore-author-logo.svg';
import headLogo from '@/assets/svgs/toolStore-head-logo.svg';

interface ToolCardProps {
  tool: {
    id?: string;
    mcpTooId?: string;
    name: string;
    description: string;
    icon?: string;
    address?: string;
    isMcp?: boolean;
    isFavorite?: boolean;
    favoriteCount?: number;
    heatValue?: number;
    tags?: string[];
  };
  onCardClick?: (tool: any) => void;
  onFavoriteClick?: (tool: any) => void;
}

const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  onCardClick,
  onFavoriteClick,
}) => {
  const { t } = useTranslation();
  const [isHovering, setIsHovering] = useState<boolean>(false);

  const handleCardClick = () => {
    onCardClick?.(tool);
  };

  // const handleFavoriteClick = (e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   onFavoriteClick?.(tool);
  // };

  // const handleMouseEnter = () => {
  //   setIsHovering(true);
  // };

  // const handleMouseLeave = () => {
  //   setIsHovering(false);
  // };

  return (
    <div className={styles.toolCard} onClick={handleCardClick}>
      <div className={styles.cardContent}>
        {/* 顶部区域：图标、标题和收藏按钮 */}
        <div className={styles.headerRow}>
          {/* 图标区域 */}
          <div className={styles.iconContainer}>
            <img
              src={tool.isMcp ? tool?.address : tool?.icon}
              className={styles.toolIcon}
              alt={tool.name}
            />
          </div>

          {/* 标题区域 */}
          <div className={styles.titleArea}>
            <div className={styles.titleRow}>
              <div className={styles.toolTitle} title={tool.name}>
                {tool.name}
              </div>
              {/* <div
                className={styles.favoriteButton}
                onClick={handleFavoriteClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <img
                  src={tool?.isFavorite ? checkCollect : collect}
                  className={styles.favoriteIcon}
                  alt="收藏"
                />
              </div> */}
            </div>
            {/* 描述文本 */}
            <div className={styles.description} title={tool.description}>
              {tool.description}
            </div>
          </div>
        </div>

        {/* 底部区域：作者信息和标签按钮 */}
        <div className={styles.bottomRow}>
          <div className={styles.metaInfo}>
            <div className={styles.authorInfo}>
              <img src={toolAuthor} className={styles.metaIcon} alt="作者" />
              <span>{t('common.storePlugin.xingchenAgentOfficial')}</span>
            </div>
            <div className={styles.heatInfo}>
              <img src={headLogo} className={styles.metaIcon} alt="热度" />
              <span>
                {tool?.heatValue && tool.heatValue >= 10000
                  ? `${(tool.heatValue / 10000).toFixed(1)}万`
                  : tool?.heatValue || 0}
              </span>
            </div>
          </div>

          {/* 标签按钮 */}
          <div className={styles.tagButton}>{tool.tags?.[0] || ''}</div>
        </div>
      </div>
    </div>
  );
};

export default ToolCard;
