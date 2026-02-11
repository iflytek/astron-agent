import React from 'react';
import { Table as AntdTable } from 'antd';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/utils';

export const Table = ({ ...reset }) => {
  const { t } = useTranslation();

  return (
    <AntdTable
      className={cn('astron-table', reset.className)}
      locale={{
        emptyText: (
          <div style={{ padding: '20px' }}>
            <p className="text-[#333333]">{t('common.noData')}</p>
          </div>
        ),
      }}
      {...reset}
    />
  );
};
