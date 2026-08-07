import React from 'react';
import styles from './index.module.scss';

interface BotCardProps {
  messageInfo: any;
}

const BotCard: React.FC<BotCardProps> = ({ messageInfo }) => {
  return (
    <div className={styles.bot_card_wrap}>
      <img src={messageInfo?.coverImage} alt="" />
      <div className={styles.card_info_wrap}>
        <div className={styles.card_title}>{messageInfo?.title}</div>
        <div className={styles.card_desc}>{messageInfo?.summary}</div>
      </div>
    </div>
  );
};

export default BotCard;
