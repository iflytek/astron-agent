import React from 'react';
import { useTranslation } from 'react-i18next';

import importDataTable from '@/assets/imgs/database/import-data-table.svg';
import addTableFields from '@/assets/imgs/database/add-table-fields.svg';

interface FieldActionsProps {
  onImportClick: () => void;
  onAddFieldClick: () => void;
}

/**
 * 字段操作按钮组件
 */
export const FieldActions: React.FC<FieldActionsProps> = ({
  onImportClick,
  onAddFieldClick,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-end gap-[18px]">
      <div
        className="flex items-center gap-2 text-sm text-[#6356EA] cursor-pointer"
        onClick={onImportClick}
      >
        <img src={importDataTable} className="w-[14px] h-[14px]" alt="" />
        <span>{t('database.importFields')}</span>
      </div>
      <div
        className="flex items-center gap-2 text-sm text-[#6356EA] cursor-pointer"
        onClick={onAddFieldClick}
      >
        <img src={addTableFields} className="w-[14px] h-[14px]" alt="" />
        <span>{t('database.addField')}</span>
      </div>
    </div>
  );
};
