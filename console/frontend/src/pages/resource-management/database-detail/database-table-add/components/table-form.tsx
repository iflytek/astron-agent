import React from 'react';
import { Form, Input } from 'antd';
import { FormInstance } from 'antd/es/form';
import { useTranslation } from 'react-i18next';

interface TableFormProps {
  form: FormInstance;
  databaseKeywords: string[];
}

/**
 * 数据表表单组件
 */
export const TableForm: React.FC<TableFormProps> = ({
  form,
  databaseKeywords,
}) => {
  const { t } = useTranslation();

  return (
    <Form form={form} layout="vertical" className="tool-create-form">
      <Form.Item
        name="name"
        label={
          <span className="text-sm font-medium">
            <span className="text-[#F74E43]">*</span>{' '}
            {t('database.dataTableName')}
          </span>
        }
        rules={[
          {
            required: true,
            message: t('database.pleaseEnterDataTableName'),
          },
          {
            max: 60,
            message: t('database.dataTableNameTooLong'),
          },
          {
            pattern: /^[a-z][a-z0-9_]*$/,
            message: t('database.nameValidationMessage'),
          },
          {
            validator: (_: unknown, value: string): Promise<void> => {
              if (databaseKeywords.some(keyword => keyword === value)) {
                return Promise.reject(
                  new Error(t('database.tableNameMsg', { keyword: value }))
                );
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Input
          placeholder={t('database.pleaseEnter')}
          className="global-input"
          maxLength={60}
          showCount
        />
      </Form.Item>
      <Form.Item name="description" label={t('database.dataTableDescription')}>
        <Input.TextArea
          placeholder={t('database.pleaseEnterDataTableDescription')}
          className="global-input-area h-[78px]"
          style={{ resize: 'none' }}
          maxLength={200}
          styles={{
            count: {
              color: '#B2B2B2',
              fontWeight: 'normal',
              position: 'absolute',
              bottom: '2px',
              right: '8px',
            },
          }}
          showCount
        />
      </Form.Item>
    </Form>
  );
};
