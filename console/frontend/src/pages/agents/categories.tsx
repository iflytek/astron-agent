import { useEffect, useState, type ReactElement } from 'react';
import { Alert, Button, Select } from 'antd';
import { getAgentType } from '@/services/agent-square';

export type CatalogCategory = { label: string; value: number };

export interface CatalogCategories {
  options: CatalogCategory[];
  loading: boolean;
  error: boolean;
  retry: () => void;
}

export function useCatalogCategories(): CatalogCategories {
  const [options, setOptions] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    getAgentType()
      .then(rows => {
        if (active)
          setOptions(
            rows.map(row => ({
              label: row.typeName,
              value: Number(row.typeKey),
            }))
          );
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return (): void => {
      active = false;
    };
  }, [revision]);
  return {
    options,
    loading,
    error,
    retry: (): void => setRevision(value => value + 1),
  };
}

export function categoryLabel(
  value: number | string | null | undefined,
  options: CatalogCategory[]
): string {
  if (value === null || value === undefined || value === '') return '未分类';
  return (
    options.find(option => String(option.value) === String(value))?.label ||
    `分类 ${value}`
  );
}

export function CategoryError({ retry }: { retry: () => void }): ReactElement {
  return (
    <Alert
      type="warning"
      message="分类加载失败"
      action={
        <Button size="small" onClick={retry}>
          重试
        </Button>
      }
    />
  );
}

export function CategorySelect({
  categories,
  value,
  onChange,
  filter = false,
  className,
}: {
  categories: CatalogCategories;
  value: number | string | null | undefined;
  onChange: (value: number | string | null) => void;
  filter?: boolean;
  className?: string;
}): ReactElement {
  return (
    <Select
      className={className}
      aria-label={filter ? '按分类筛选' : '分类'}
      placeholder={filter ? '全部分类' : '未分类'}
      allowClear
      loading={categories.loading}
      value={value ?? null}
      options={
        filter
          ? [{ value: 'uncategorized', label: '未分类' }, ...categories.options]
          : categories.options
      }
      notFoundContent={categories.error ? '分类加载失败，请重试' : '暂无分类'}
      onChange={value => onChange(value ?? null)}
    />
  );
}
