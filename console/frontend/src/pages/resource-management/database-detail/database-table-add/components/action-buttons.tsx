import React from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

interface ActionButtonsProps {
  isModule?: boolean;
  saveLoading: boolean;
  onCancel: () => void;
  onSave: () => void;
}

/**
 * 底部操作按钮组件
 */
export const ActionButtons: React.FC<ActionButtonsProps> = ({
  isModule,
  saveLoading,
  onCancel,
  onSave,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-center justify-end gap-4 mt-6"
      style={{ paddingBottom: !isModule ? 40 : 0 }}
    >
      <Button type="text" className="px-6 origin-btn" onClick={onCancel}>
        {t('database.cancel')}
      </Button>
      <Button
        type="primary"
        className="px-6"
        loading={saveLoading}
        onClick={onSave}
      >
        {t('database.save')}
      </Button>
    </div>
  );
};
