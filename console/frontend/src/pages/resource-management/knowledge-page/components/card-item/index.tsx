import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CardButtonGroup, {
  ButtonItemConfig,
} from '@/pages/resource-management/card-button-group';
import folderIcon from '@/assets/imgs/knowledge/folder_icon.svg';

import editIcon from '@/assets/svgs/edit-outline.svg';
import deleteIcon from '@/assets/svgs/delete-outline.svg';
import styles from './index.module.scss';
import { RepoItem } from '@/types/resource';

interface CardItemProps {
  knowledge: RepoItem;
  onDelete: (knowledge: RepoItem) => void;
}

const CardItem: React.FC<CardItemProps> = ({ knowledge, onDelete }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 导航到详情页的通用方法
  const navigateToDetail = () => {
    navigate(
      `/resource/knowledge/detail/${knowledge.id}/document?tag=${knowledge.tag}`,
      {
        state: {
          parentId: -1,
        },
      }
    );
  };

  // 统计信息配置
  const statsConfig = [
    {
      label: t('knowledge.documentCount'),
      value: knowledge.fileCount,
    },
    {
      label: t('knowledge.totalCharacters'),
      value: Math.round(knowledge.charCount / 1000),
    },
    {
      label: t('knowledge.relatedAgents'),
      value: knowledge?.bots?.length,
    },
  ];

  // 配置按钮
  const buttons: ButtonItemConfig[] = [
    {
      key: 'edit',
      text: t('common.edit'),
      icon: <img src={editIcon} alt="edit" />,
      onClick: (key, event) => {
        event.stopPropagation();
        navigateToDetail();
      },
    },
    {
      key: 'delete',
      text: t('common.delete'),
      icon: <img src={deleteIcon} alt="delete" />,
      onClick: (key, event) => {
        event.stopPropagation();
        onDelete(knowledge);
      },
    },
  ];

  return (
    <div className={styles.cardItem} onClick={navigateToDetail}>
      <img src={knowledge?.corner} className={styles.corner} alt="" />
      <div className={styles.content}>
        <div className={styles.header}>
          <img src={folderIcon} className={styles.folderIcon} alt="" />
          <div className={styles.headerRight}>
            <div className={styles.title} title={knowledge.name}>
              {knowledge.name}
            </div>
            <div className={styles.description} title={knowledge.description}>
              {knowledge.description}
            </div>
          </div>
        </div>
        <div>
          <div className={styles.stats}>
            {statsConfig.map((stat, index) => (
              <React.Fragment key={index}>
                {index > 0 && <div className={styles.divider}></div>}
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>{stat.label}</div>
                  <div className={styles.statValue}>{stat.value}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <CardButtonGroup buttons={buttons} gap={8} align="right" />
        </div>
      </div>
    </div>
  );
};

export default CardItem;
