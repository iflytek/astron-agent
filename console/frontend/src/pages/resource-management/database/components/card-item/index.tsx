import React from 'react';
import { Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import databaseIcon from '@/assets/imgs/database/database-page-icon.svg';
import styles from '../../../knowledge-page/components/card-item/index.module.scss';
import { DatabaseItem } from '@/types/database';
interface CardItemProps {
  database: DatabaseItem;
  onClick: (database: DatabaseItem) => void;
  onDelete: (database: DatabaseItem, event: React.MouseEvent) => void;
}
const CardItem: React.FC<CardItemProps> = ({ database, onClick, onDelete }) => (
  <article className={styles.cardItem}>
    <div className={styles.header}>
      <img src={databaseIcon} className={styles.folderIcon} alt="" />
      <button
        className={`${styles.title} text-left`}
        onClick={() => onClick(database)}
      >
        {database.name}
      </button>
    </div>
    <p className={styles.description} title={database.description}>
      {database.description || '暂无说明'}
    </p>
    <footer className={styles.footer}>
      <Button
        type="text"
        danger
        icon={<DeleteOutlined />}
        onClick={event => onDelete(database, event)}
      >
        删除
      </Button>
      <Button type="link" onClick={() => onClick(database)}>
        进入数据库
      </Button>
    </footer>
  </article>
);
export default CardItem;
