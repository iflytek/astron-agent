import { InputParamsData } from '@/types/resource';
import { Input, InputNumber, Select } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import formSelect from '@/assets/imgs/workflow/icon_form_select.png';

export const useRenderInput = ({
  handleInputParamsChange,
  handleCheckInput,
}: {
  handleInputParamsChange: (id: string, value: string) => void;
  handleCheckInput: (record: InputParamsData, key: string) => void;
}): {
  renderInput: (record: InputParamsData) => React.ReactNode;
} => {
  const { t } = useTranslation();
  const renderInput = (record: InputParamsData): React.ReactNode => {
    const type = record?.type;
    if (type === 'string') {
      return (
        <Input
          disabled={!!record?.defalutDisabled}
          placeholder={t('common.pleaseEnterParameterValue')}
          className="global-input params-input"
          value={record?.default as string}
          onChange={e => {
            handleInputParamsChange(record?.id, e.target.value);
            handleCheckInput(record, 'default');
          }}
          onBlur={() => handleCheckInput(record, 'default')}
        />
      );
    } else if (type === 'boolean') {
      return (
        <Select
          placeholder={t('common.pleaseSelect')}
          suffixIcon={<img src={formSelect} className="w-4 h-4 " />}
          options={[
            {
              label: 'true',
              value: true,
            },
            {
              label: 'false',
              value: false,
            },
          ]}
          style={{
            lineHeight: '40px',
            height: '40px',
          }}
          value={record?.default}
          onChange={value => {
            handleInputParamsChange(record?.id, value as string);
            handleCheckInput(record, 'default');
          }}
          onBlur={() => handleCheckInput(record, 'default')}
        />
      );
    } else if (type === 'integer') {
      return (
        <InputNumber
          disabled={!!record?.defalutDisabled}
          placeholder={t('common.pleaseEnterDefaultValue')}
          step={1}
          precision={0}
          controls={false}
          style={{
            lineHeight: '40px',
            height: '40px',
          }}
          className="global-input params-input w-full"
          value={record?.default as string}
          onChange={value => {
            handleInputParamsChange(record?.id, value as string);
            handleCheckInput(record, 'default');
          }}
          onBlur={() => handleCheckInput(record, 'default')}
        />
      );
    } else if (type === 'number') {
      return (
        <InputNumber
          disabled={!!record?.defalutDisabled}
          placeholder={t('common.pleaseEnterDefaultValue')}
          className="global-input params-input w-full"
          controls={false}
          style={{
            lineHeight: '40px',
          }}
          value={record?.default as string}
          onChange={value => {
            handleInputParamsChange(record?.id, value as string);
            handleCheckInput(record, 'default');
          }}
          onBlur={() => handleCheckInput(record, 'default')}
        />
      );
    }
    return null;
  };

  return {
    renderInput,
  };
};
