import React from 'react';
import { useTranslation } from 'react-i18next';
import CardButtonGroup, {
  ButtonItemConfig,
} from '@/pages/resource-management/card-button-group';
import databaseIcon from '@/assets/imgs/database/database-page-icon.svg';
import editIcon from '@/assets/svgs/edit-outline.svg';
import deleteIcon from '@/assets/svgs/delete-outline.svg';
import styles from './index.module.scss';
import { DatabaseItem } from '@/types/database';

interface CardItemProps {
  database: DatabaseItem;
  onClick: (database: DatabaseItem) => void;
  onDelete: (database: DatabaseItem, event: React.MouseEvent) => void;
}

const CardItem: React.FC<CardItemProps> = ({ database, onClick, onDelete }) => {
  const { t } = useTranslation();

  // 点击卡片
  const handleClick = () => {
    onClick(database);
  };

  // 配置按钮
  const buttons: ButtonItemConfig[] = [
    {
      key: 'edit',
      text: t('database.goToEdit'),
      icon: <img src={editIcon} alt="edit" />,
      onClick: (key: string, event: React.MouseEvent) => {
        event.stopPropagation();
        handleClick();
      },
    },
    {
      key: 'delete',
      text: t('database.delete'),
      icon: <img src={deleteIcon} alt="delete" />,
      onClick: (key: string, event: React.MouseEvent) => {
        event.stopPropagation();
        onDelete(database, event);
      },
    },
  ];

  return (
    <div className={styles.cardItem} onClick={handleClick}>
      <div className={styles.content}>
        <div className={styles.header}>
          <img src={databaseIcon} className={styles.databaseIcon} alt="" />
          <span className={styles.title} title={database.name}>
            {database.name}
          </span>
        </div>
        <div className={styles.description} title={database.description}>
          {database.description}
        </div>
      </div>

      <div className={styles.footer}>
        <CardButtonGroup buttons={buttons} gap={8} align="right" />
      </div>
    </div>
  );
};

export default CardItem;
