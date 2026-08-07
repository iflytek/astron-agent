import React, { useState } from 'react';
import { Input } from 'antd';
import styles from './index.module.scss';
import search from '@/assets/imgs/file/icon_zhishi_search.png';
import classNames from 'classnames';

interface SpaceSearchProps {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value?: string;
  placeholder?: string;
  onSearch?: (value: string) => void;
  className?: string;
  retractable?: boolean; // 是否启用展开收起功能，默认为 false
  noBorder?: boolean;
  [key: string]: any;
}

const SpaceSearch: React.FC<SpaceSearchProps> = ({
  onChange,
  value: propValue,
  placeholder = '搜索用户名',
  onSearch,
  className,
  retractable = false,
  noBorder = true,
  ...restProps
}) => {
  const [expand, setExpand] = useState(!retractable); // 当不启用收缩功能时，默认展开
  const [internalValue, setInternalValue] = useState('');

  // 使用受控或非受控逻辑
  const isControlled = propValue !== undefined;
  const value = isControlled ? propValue : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    if (!isControlled) {
      setInternalValue(inputValue);
    }

    onChange?.(e);
  };

  const handleSearch = () => {
    // 当输入框展开状态或不启用收缩功能时，且有输入内容，触发搜索
    if ((expand || !retractable) && value) {
      onSearch?.(value as string);
    }

    // 只有启用收缩功能时才执行展开收起逻辑
    if (retractable) {
      setExpand(!expand);
    }
  };

  const handlePressEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value) {
      onSearch?.(value as string);
    }
  };

  return (
    <div
      className={classNames(
        styles.spaceSearch,
        !retractable && styles.notRetractable,
        noBorder && styles.noBorder,
        className
      )}
    >
      <img
        src={search}
        className={styles.searchIcon}
        alt="搜索"
        onClick={handleSearch}
      />
      <Input
        className={classNames(
          styles.searchInput,
          (expand || !retractable) && styles.expanded,
          !(expand || !retractable) && styles.collapsed
        )}
        placeholder={expand || !retractable ? placeholder : ''}
        value={value}
        onChange={handleChange}
        onPressEnter={handlePressEnter}
        {...restProps}
      />
    </div>
  );
};

export default SpaceSearch;
