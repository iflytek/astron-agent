import React from 'react';
import styles from './index.module.scss';

// 导入图标
import nodeStartIcon from '@/assets/imgs/trace/node-start.svg';
import nodeContentIcon from '@/assets/imgs/trace/node-content.svg';
import robotContentIcon from '@/assets/imgs/trace/robot-content.svg';
import linkContentIcon from '@/assets/imgs/trace/link-content.svg';
import bookContentIcon from '@/assets/imgs/trace/book-content.svg';
import fileContentIcon from '@/assets/imgs/trace/file-content.svg';
import clockIcon from '@/assets/imgs/trace/clock.svg';

// 添加超时阈值常量
const DURATION_THRESHOLD = 1000; // 1000毫秒作为超时阈值

interface TreeNodeProps {
  title: string;
  icon?: React.ReactNode;
  type?: string;
  isSelected?: boolean;
  duration?: number;
  executionTime?: string;
}

/**
 * 树节点组件
 * @param props 组件属性
 * @returns 树节点组件
 */
const TreeNode: React.FC<TreeNodeProps> = ({
  title,
  icon,
  type,
  isSelected = false,
  executionTime,
  duration,
}) => {
  // 根据类型获取图标
  const getIconByType = () => {
    if (icon) return icon;

    // 根据类型返回不同图标
    switch (type) {
      case 'node_start':
        return <img src={nodeStartIcon} className={styles.icon} alt="root" />;
      case 'node_end':
        return <img src={linkContentIcon} className={styles.icon} alt="root" />;
      // case 'text':
      //   return <img src={nodeContentIcon} className={styles.icon} alt="text" />;
      // case 'input':
      //   return <img src={fileContentIcon} className={styles.icon} alt="input" />;
      // case 'output':
      //   return <img src={robotContentIcon} className={styles.icon} alt="output" />;
      // case 'nlu':
      //   return <img src={linkContentIcon} className={styles.icon} alt="nlu" />;
      // case 'retrieval':
      //   return <img src={bookContentIcon} className={styles.icon} alt="retrieval" />;
      // case 'generation':
      //   return <img src={fileContentIcon} className={styles.icon} alt="generation" />;
      default:
        return (
          <img src={nodeContentIcon} className={styles.icon} alt="default" />
        );
    }
  };

  // 提取条件：判断是否超过持续时间阈值
  const isDurationWarning = duration && duration > DURATION_THRESHOLD;

  return (
    <div className={styles.treeNodeWrapper}>
      <div
        className={`${styles.treeNode} ${isSelected ? styles.selected : ''}`}
      >
        {getIconByType()}
        <span className={styles.title}>{title}</span>
      </div>

      {executionTime && (
        <div className={styles.timeInfo}>
          <img
            src={clockIcon}
            className={`${styles.clockIcon} ${isDurationWarning ? styles.warningIcon : ''}`}
            alt="time"
          />
          <span
            className={`${styles.time} ${isDurationWarning ? styles.warning : ''}`}
          >
            {executionTime}
          </span>
        </div>
      )}
    </div>
  );
};

export default TreeNode;
