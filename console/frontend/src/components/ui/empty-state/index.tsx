import React from 'react';
import { PrimaryBtn } from '../btns';
import { ReactSVG } from 'react-svg';
import emptyIcon from '@/assets/svgs/resource-empty.svg';
import i18n from 'i18next';

interface EmptyStateProps {
  /**
   * 空状态提示文案
   */
  description?: string;
  /**
   * 创建按钮的文案
   */
  buttonText?: string;
  /**
   * 点击创建按钮的回调函数
   */
  onCreate?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  description = i18n.t('common.pleaseCreate'),
  buttonText = i18n.t('common.new'),
  onCreate,
}) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <ReactSVG src={emptyIcon} />
      <div className="text-sm text-[#999] mt-2">{description}</div>
      {onCreate && (
        <div className="mt-5">
          <PrimaryBtn text={buttonText} onClick={onCreate} showIcon />
        </div>
      )}
    </div>
  );
};
