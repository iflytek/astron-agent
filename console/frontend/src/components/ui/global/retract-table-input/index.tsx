import React, { useState, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from 'antd';

import search from '@/assets/imgs/file/icon-zhishi-search.png';
type SearchInputProps = {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value?: string | number;
  restrictFirstChar?: boolean;
  [key: string]: any;
};
function index({
  flag,
  onChange,
  value: propValue,
  restrictFirstChar = false, // 新增prop控制是否限制首字符
  ...restProps
}: SearchInputProps) {
  const { t } = useTranslation();
  const [expand, setExpand] = useState(true);
  const [internalValue, setInternalValue] = useState('');
  // 使用受控或非受控逻辑
  const isControlled = propValue !== undefined;
  const value = isControlled ? propValue : internalValue;
  const handleChange = e => {
    const inputValue = e.target.value;
    // 启用了首字符限制
    if (restrictFirstChar) {
      if (inputValue === '' || !/^[%_]/.test(inputValue)) {
        if (!isControlled) {
          setInternalValue(inputValue);
        }
        onChange?.(e);
      }
    } else {
      if (!isControlled) {
        setInternalValue(inputValue);
      }
      onChange?.(e);
    }
  };

  return (
    <div
      className="relative"
      style={{ borderRadius: 10, border: '1px solid #E7E7F0' }}
    >
      <img
        src={search}
        className="w-4 h-4 absolute left-[8px] top-[8px] z-10 cursor-pointer"
        alt=""
        onClick={() => setExpand(!expand)}
      />
      <Input
        className="global-input search-input p-0 transition-all pl-8"
        placeholder={flag ? t('common.taskName') : t('common.inputPlaceholder')}
        style={{
          borderRadius: 10,
          height: 30,
          fontWeight: 400,
          background: '#fff !important',
          width: flag ? 160 : expand ? 200 : 32,
        }}
        onChange={handleChange}
        {...restProps}
        value={value}
      />
    </div>
  );
}

export default index;
