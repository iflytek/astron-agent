import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Alert, Button, Image, Input, Spin } from 'antd';
import {
  StarOutlined,
  StarFilled,
  TagOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import http from '@/utils/http';
import { errorText } from '@/pages/agents/errors';
import {
  CategoryError,
  CategorySelect,
  categoryLabel,
  useCatalogCategories,
} from '@/pages/agents/categories';
import botIcon from '@/assets/imgs/avatars/agent-chat-avatar.svg';
import workflowIcon from '@/assets/imgs/avatars/agent-workflow-avatar.svg';
import styles from '@/pages/agents/catalog.module.scss';
interface Item {
  botId: number;
  botName: string;
  botDesc: string;
  isFavorite: boolean;
  avatar?: string;
  version: number;
  botType?: number | null;
}
interface MarketCardProps {
  item: Item;
  category?: string;
  busy: number | null;
  onFavorite: (item: Item) => Promise<void>;
}
function MarketCard({
  item,
  category,
  busy,
  onFavorite,
}: MarketCardProps): ReactElement {
  const isWorkflow = item.version !== 1;
  const fallback = isWorkflow ? workflowIcon : botIcon;
  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <Link
          className={`${styles.cardBody} ${styles.cardLink}`}
          to={`/published/${item.botId}`}
          aria-label={`使用 ${item.botName}`}
        >
          <Image
            preview={false}
            width={36}
            height={36}
            wrapperStyle={{ flexShrink: 0 }}
            className={styles.avatar}
            src={item.avatar || fallback}
            fallback={fallback}
            alt=""
          />
          <div className={styles.details}>
            <h2 title={item.botName}>{item.botName}</h2>
            <span className={styles.tag}>
              {isWorkflow ? '工作流' : '独立 Agent'}
            </span>
          </div>
        </Link>
      </div>
      <p className={styles.description} title={item.botDesc}>
        {item.botDesc || '暂无描述'}
      </p>
      <div className={styles.resources} aria-label="分类">
        <span className={styles.resourceChip}>
          <TagOutlined />
          {category || (item.botType ? `分类 ${item.botType}` : '未分类')}
        </span>
      </div>
      <div className={styles.footer}>
        <div className={styles.cardMeta}>
          <span className={styles.updated}>已发布到市场</span>
          <div className={styles.cardMenus}>
            <Button
              type="text"
              icon={item.isFavorite ? <StarFilled /> : <StarOutlined />}
              aria-label={
                item.isFavorite
                  ? `取消收藏 ${item.botName}`
                  : `收藏 ${item.botName}`
              }
              title={item.isFavorite ? '取消收藏' : '收藏'}
              aria-pressed={item.isFavorite}
              loading={busy === item.botId}
              disabled={busy !== null}
              onClick={() => void onFavorite(item)}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
export default function Market(): ReactElement {
  const [items, setItems] = useState<Item[]>([]);
  const categories = useCatalogCategories();
  const [category, setCategory] = useState<number | string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  const submitting = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    http
      .get<unknown, { records: Item[]; total: number }>(
        '/home-page/agent-square/get-bot-page-by-type',
        { params: { search, type: category, favorite, page, size: 20 } }
      )
      .then(data => {
        if (active) {
          const lastPage = Math.max(1, Math.ceil(data.total / 20));
          if (page > lastPage) {
            setPage(lastPage);
            return;
          }
          setItems(data.records);
          setTotal(data.total);
        }
      })
      .catch(reason => {
        if (active) setError(errorText(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return (): void => {
      active = false;
    };
  }, [search, category, favorite, page, revision]);
  const toggleFavorite = async (item: Item): Promise<void> => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(item.botId);
    setActionError('');
    try {
      await http.post(
        `/bot/favorite/${item.isFavorite ? 'delete' : 'create'}`,
        { botId: item.botId }
      );
      setItems(current =>
        current.map(row =>
          row.botId === item.botId
            ? { ...row, isFavorite: !item.isFavorite }
            : row
        )
      );
      // Recount and refill the current page after removing a favorite.
      setRevision(value => value + 1);
    } catch (reason) {
      setActionError(errorText(reason));
    } finally {
      submitting.current = false;
      setBusy(null);
    }
  };
  const filtered = Boolean(search || category !== null || favorite);
  const clearFilters = (): void => {
    setSearchInput('');
    setSearch('');
    setCategory(null);
    setFavorite(false);
    setPage(1);
  };
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1>Agent 市场</h1>
            <p>发现并使用已发布的 Agent 和工作流。</p>
          </div>
          <Button href="/management/release">管理我的发布</Button>
        </header>
        <div className={styles.toolbar}>
          <div className={styles.actions}>
            <Input.Search
              aria-label="搜索市场"
              placeholder="搜索名称"
              allowClear
              className={styles.search}
              value={searchInput}
              onChange={event => {
                setSearchInput(event.target.value);
                if (!event.target.value) {
                  setSearch('');
                  setPage(1);
                }
              }}
              onSearch={value => {
                setSearch(value.trim());
                setPage(1);
              }}
            />
            <CategorySelect
              categories={categories}
              value={category}
              filter
              className={styles.categoryFilter}
              onChange={value => {
                setCategory(value);
                setPage(1);
              }}
            />
            <div
              className={styles.filters}
              role="group"
              aria-label="市场收藏筛选"
            >
              <Button
                type={!favorite ? 'text' : 'default'}
                aria-pressed={!favorite}
                onClick={() => {
                  setFavorite(false);
                  setPage(1);
                }}
              >
                全部
              </Button>
              <Button
                type={favorite ? 'text' : 'default'}
                aria-pressed={favorite}
                onClick={() => {
                  setFavorite(true);
                  setPage(1);
                }}
              >
                仅收藏
              </Button>
            </div>
            <Button
              icon={<ReloadOutlined />}
              aria-label="刷新市场"
              title="刷新市场"
              disabled={loading}
              onClick={() => setRevision(value => value + 1)}
            />
          </div>
          {!loading && !error && (
            <span className={styles.count}>{total} 个发布</span>
          )}
        </div>
        {categories.error && <CategoryError retry={categories.retry} />}
        {actionError && (
          <Alert
            className={styles.notice}
            type="error"
            showIcon
            message={actionError}
          />
        )}
        {error && (
          <Alert
            className={styles.notice}
            type="error"
            showIcon
            message="无法读取市场"
            description={error}
            action={
              <Button onClick={() => setRevision(value => value + 1)}>
                重试
              </Button>
            }
          />
        )}
        {loading ? (
          <div role="status" className={styles.state}>
            <Spin />
            <p>正在读取市场…</p>
          </div>
        ) : (
          !error && (
            <>
              <div className={styles.grid}>
                {items.map(item => (
                  <MarketCard
                    key={item.botId}
                    item={item}
                    category={categoryLabel(item.botType, categories.options)}
                    busy={busy}
                    onFavorite={toggleFavorite}
                  />
                ))}
              </div>
              {!items.length && (
                <section className={styles.state}>
                  <h2>{filtered ? '没有匹配的发布' : '市场暂无发布'}</h2>
                  <p>
                    {filtered
                      ? '试试其他名称或分类，或清除筛选条件。'
                      : '发布 Agent 到市场后，即可在这里使用。'}
                  </p>
                  {filtered ? (
                    <Button onClick={clearFilters}>清除筛选</Button>
                  ) : (
                    <Button href="/management/release">前往发布管理</Button>
                  )}
                </section>
              )}
              {total > 0 && (
                <div className={`${styles.pagination} ${styles.actions}`}>
                  <Button
                    disabled={page === 1}
                    onClick={() => setPage(value => value - 1)}
                  >
                    上一页
                  </Button>
                  <span className={styles.count}>
                    第 {page} 页 · 共 {total} 个发布
                  </span>
                  <Button
                    disabled={page * 20 >= total}
                    onClick={() => setPage(value => value + 1)}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )
        )}
      </div>
    </main>
  );
}
