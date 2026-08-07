import React from 'react';
import { message } from 'antd';
import { ReactSVG } from 'react-svg';
import copyIcon from '@/assets/imgs/trace/copy.svg';
import { copyText } from '@/utils/spark-utils';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

interface CopyButtonProps {
  text?: string;
  successMsg?: string;
  className?: string;
  iconClassName?: string;
  onClick?: () => void;
}

/**
 * 复制按钮组件
 * @param props 组件属性
 * @returns 复制按钮组件
 */
const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  successMsg,
  className = '',
  iconClassName = '',
  onClick,
}) => {
  // 处理复制
  const handleCopy = () => {
    // 如果有自定义点击事件，优先执行
    if (onClick) {
      onClick();
      return;
    }

    // 默认复制行为
    if (!text) return;

    copyText({
      text,
      successText: successMsg || t('releaseDetail.TraceLogPage.copied'),
    });
  };
  const { t } = useTranslation();
  return (
    <span
      className={`${styles.copyButton} ${className}`}
      onClick={handleCopy}
      title={t('releaseDetail.TraceLogPage.copy')}
    >
      <ReactSVG
        src={copyIcon}
        className={iconClassName}
        beforeInjection={svg => {
          svg.setAttribute('width', '14');
          svg.setAttribute('height', '14');

          // 将SVG中所有路径的fill颜色替换为currentColor
          const paths = svg.querySelectorAll('path');
          paths.forEach(path => {
            path.setAttribute('fill', 'currentColor');
            path.removeAttribute('fill-opacity');
            path.removeAttribute('style');
          });
        }}
      />
    </span>
  );
};

export default CopyButton;
