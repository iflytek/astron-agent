import type React from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Empty, Input, Skeleton } from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import styles from './resource-surface.module.scss';

export { styles as resourceStyles };

export function ResourceCatalog({
  title,
  description,
  search,
  onSearch,
  onCreate,
  createText,
  onRefresh,
  loading,
  error,
  empty,
  children,
}: {
  title: string;
  description: string;
  search: string;
  onSearch: (value: string) => void;
  onCreate: () => void;
  createText: string;
  onRefresh: () => void;
  loading: boolean;
  error: string;
  empty: boolean;
  children: ReactNode;
}): React.ReactElement {
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          {createText}
        </Button>
      </header>
      <div className={styles.toolbar}>
        <Input
          allowClear
          aria-label={`搜索${title}`}
          placeholder={`搜索${title}名称`}
          prefix={<SearchOutlined />}
          value={search}
          onChange={event => onSearch(event.target.value)}
        />
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => onRefresh()}
        >
          刷新
        </Button>
      </div>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={() => onRefresh()}>
              重试
            </Button>
          }
        />
      )}
      <section
        className={styles.results}
        aria-label={`${title}列表`}
        aria-busy={loading}
      >
        {loading && empty ? (
          <div className={styles.grid}>
            {[0, 1, 2, 3].map(key => (
              <div className={styles.skeleton} key={key}>
                <Skeleton active />
              </div>
            ))}
          </div>
        ) : empty ? (
          !error && (
            <Empty
              description={
                search
                  ? '未找到匹配的资源，请调整搜索词。'
                  : `暂无${title}，创建后即可在当前空间中使用。`
              }
            >
              <Button onClick={search ? () => onSearch('') : onCreate}>
                {search ? '清除搜索' : createText}
              </Button>
            </Empty>
          )
        ) : (
          children
        )}
      </section>
    </main>
  );
}
