import React from 'react';
import { useTranslation } from 'react-i18next';

import toolArrowLeft from '@/assets/imgs/common/back.png';

interface BackButtonProps {
  onBack: () => void;
}

/**
 * 返回按钮组件
 */
export const BackButton: React.FC<BackButtonProps> = ({ onBack }) => {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-center gap-2 mt-6 mb-8 cursor-pointer fit-content"
      onClick={onBack}
    >
      <img src={toolArrowLeft} className="w-[18px] h-[18px]" alt="" />
      <div className="mr-1 font-medium text-4">{t('database.back')}</div>
      <div className="">
        <span className="text-[#7F7F7F] text-[14px]">
          {t('database.database')}
        </span>
      </div>
    </div>
  );
};
