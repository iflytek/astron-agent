import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import folderIcon from '@/assets/imgs/knowledge/folder_icon.svg';
import styles from './index.module.scss';
import { RepoItem } from '@/types/resource';

interface CardItemProps {
  knowledge: RepoItem;
  onDelete: (knowledge: RepoItem) => void;
}
const CardItem: React.FC<CardItemProps> = ({ knowledge, onDelete }) => {
  const { t } = useTranslation();
  const path = `/resource/knowledge/detail/${knowledge.id}/document?tag=${knowledge.tag}`;
  return (
    <article className={styles.cardItem}>
      <div className={styles.header}>
        <img src={folderIcon} className={styles.folderIcon} alt="" />
        <Link
          to={path}
          state={{ parentId: -1 }}
          className={styles.title}
          title={knowledge.name}
        >
          {knowledge.name}
        </Link>
      </div>
      <p className={styles.description} title={knowledge.description}>
        {knowledge.description || '暂无说明'}
      </p>
      <div className={styles.stats}>
        <span>
          {t('knowledge.documentCount')} {knowledge.fileCount ?? 0}
        </span>
        <span>
          {t('knowledge.totalCharacters')}{' '}
          {Math.round((knowledge.charCount || 0) / 1000)}
        </span>
        <span>
          {t('knowledge.relatedAgents')} {knowledge.bots?.length || 0}
        </span>
      </div>
      <footer className={styles.footer}>
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onDelete(knowledge)}
        >
          {t('common.delete')}
        </Button>
        <Link to={path} state={{ parentId: -1 }}>
          查看详情
        </Link>
      </footer>
    </article>
  );
};
export default CardItem;
