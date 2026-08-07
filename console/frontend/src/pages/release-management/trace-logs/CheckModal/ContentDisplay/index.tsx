import React from 'react';
import CopyButton from '../../common/CopyButton';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

interface ContentDisplayProps {
  title: string;
  content?: string | React.ReactNode;
  className?: string;
}

/**
 * 内容展示组件
 * @param props 组件属性
 * @returns 内容展示组件
 */
const ContentDisplay: React.FC<ContentDisplayProps> = ({
  title,
  content,
  className = '',
}) => {
  const { t } = useTranslation();
  // 获取要复制的文本内容
  const getTextContent = () => {
    if (typeof content === 'string') {
      return content;
    } else if (content && React.isValidElement(content)) {
      // 如果是React元素，尝试获取其文本内容
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content.props.dangerouslySetInnerHTML?.__html || '';
      return tempDiv.textContent || '';
    }
    return '';
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.titleWrapper}>
        <div className={styles.title}>{title}</div>
        <div className={styles.copyIcon}>
          <CopyButton
            text={getTextContent()}
            successMsg={t('global.copySuccess')}
          />
        </div>
      </div>
      <div className={styles.content}>
        {typeof content === 'string' ? (
          <div className={styles.textContent}>{content}</div>
        ) : (
          content
        )}
      </div>
    </div>
  );
};

export default ContentDisplay;
