import React, { memo } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import importDataTable from '@/assets/imgs/database/import-data-table.svg';
import addTableFields from '@/assets/imgs/database/add-table-fields.svg';
import exportIcon from '@/assets/imgs/database/export.svg';
import refreshIcon from '@/assets/imgs/database/refresh.svg';
import deleteIcon from '@/assets/imgs/database/delete.svg';

interface ActionButtonsProps {
  dataType: number;
  exportLoading: boolean;
  onAddData: () => void;
  onBatchDelete: () => void;
  onImportData: () => void;
  onExportData: () => void;
  onRefreshData?: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  dataType,
  exportLoading,
  onAddData,
  onBatchDelete,
  onImportData,
  onExportData,
  onRefreshData,
}) => {
  const { t } = useTranslation();

  if (dataType === 1) return null;

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onAddData}
        type="default"
        className="!h-8 !rounded-lg !border !border-blue-100 !text-blue-600"
        icon={<img src={addTableFields} alt="" />}
      >
        {t('database.addData')}
      </Button>
      <Button
        onClick={onBatchDelete}
        type="default"
        className="!h-8 !rounded-lg !border !border-blue-100 !text-blue-600"
        icon={<img src={deleteIcon} alt="" />}
      >
        {t('database.batchDelete')}
      </Button>
      {dataType === 3 && onRefreshData && (
        <Button
          type="default"
          onClick={onRefreshData}
          className="!h-8 !rounded-lg !border !border-blue-100 !text-blue-600"
          icon={<img src={refreshIcon} alt="" />}
        >
          {t('database.refreshData')}
        </Button>
      )}
      <Button
        onClick={onImportData}
        type="default"
        className="!h-8 !rounded-lg !border !border-blue-100 !text-blue-600"
        icon={<img src={importDataTable} alt="" />}
      >
        {t('database.importDataAction')}
      </Button>
      <Button
        onClick={onExportData}
        loading={exportLoading}
        type="default"
        className="!h-8 !rounded-lg !border !border-blue-100 !text-blue-600"
        icon={<img src={exportIcon} alt="" />}
      >
        {t('database.exportData')}
      </Button>
    </div>
  );
};

export default memo(ActionButtons);
