import {
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
  RefObject,
  MutableRefObject,
} from 'react';
import { pageList, create } from '@/services/database';
import { DatabaseItem, CreateDbParams } from '@/types/database';
import { useInfiniteScroll } from './use-infinite-scroll';
import { message } from 'antd';
import { ResponseBusinessError } from '@/types/global';

type createDatabaseOk = (createParams: CreateDbParams) => void;

interface UseDatabaseListReturn {
  // 状态
  dataSource: DatabaseItem[];
  hasMore: boolean;
  searchValue: string;
  pagination: {
    pageNum: number;
    pageSize: number;
  };

  // 方法
  getList: () => void;
  handleLoadMore: () => void;
  createDatabaseOk: createDatabaseOk;
  setSearchValue: Dispatch<SetStateAction<string>>;
  setPagination: Dispatch<
    SetStateAction<{ pageNum: number; pageSize: number }>
  >;

  // 无限滚动相关
  loader: RefObject<HTMLDivElement>;
  loadingRef: MutableRefObject<boolean>;
}

// 数据库列表 hook
export const useDatabaseList = (): UseDatabaseListReturn => {
  const [hasMore, setHasMore] = useState(false); // 是否还有更多数据
  const [pagination, setPagination] = useState({
    pageNum: 1,
    pageSize: 20,
  }); // 分页信息
  const [dataSource, setDataSource] = useState<DatabaseItem[]>([]); // 数据库列表
  const [searchValue, setSearchValue] = useState(''); // 搜索内容

  // 无限滚动回调函数
  const handleLoadMore = useCallback((): void => {
    setPagination(pagination => ({
      ...pagination,
      pageNum: pagination?.pageNum + 1,
    }));
  }, []);

  const { targetRef: loader, loading: loadingRef } = useInfiniteScroll(
    handleLoadMore,
    hasMore
  );

  // 获取数据库列表
  const getList = useCallback((): void => {
    loadingRef.current = true;
    const params = {
      pageNum: pagination?.pageNum,
      pageSize: pagination?.pageSize,
      search: searchValue,
    };
    pageList(params)
      .then(data => {
        const newData = data?.records || [];
        setDataSource(preDataSource => {
          if (pagination?.pageNum === 1) {
            return [...newData];
          } else {
            return [...preDataSource, ...newData];
          }
        });
        if (20 * pagination?.pageNum < data.total) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      })
      .finally(() => {
        loadingRef.current = false;
      })
      .catch((e: ResponseBusinessError) => {
        message.error(e?.message);
      });
  }, [pagination, searchValue, loadingRef]);

  // 创建数据库
  const createDatabaseOk = useCallback(
    (createParams: CreateDbParams): void => {
      create(createParams)
        .then(() => {
          getList();
        })
        .catch((error: ResponseBusinessError) => {
          message.error(error?.message);
        });
    },
    [getList]
  );

  return {
    // 状态
    dataSource,
    hasMore,
    searchValue,
    pagination,

    // 方法
    getList,
    handleLoadMore,
    createDatabaseOk,
    setSearchValue,
    setPagination,

    // 无限滚动相关
    loader,
    loadingRef,
  };
};
