import { useState, useEffect, memo, useCallback, type JSX } from 'react';
import type React from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import useUserStore from '@/store/user-store';
import databaseStore from '@/store/database-store';
import CreateDatabase from './components/create-database';
import DeleteModal from './components/delete-database';
import CardItem from './components/card-item';
import { jumpToLogin } from '@/utils/http';
import { DatabaseItem } from '@/types/database';
import { useDatabaseList } from './hooks/use-database-list';
import {
  ResourceCatalog,
  resourceStyles as styles,
} from '../knowledge-page/resource-surface';
const DataBase = (): JSX.Element => {
  const setDatabase = databaseStore(state => state.setDatabase);
  const user = useUserStore(state => state.user);
  const navigate = useNavigate();
  const [botDetail, setBotDetail] = useState<DatabaseItem | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [createDatabaseOpen, setCreateDatabaseOpen] = useState(false);
  const page = useDatabaseList();
  const createDatabase = useCallback((): void => {
    if (!user?.uid) return jumpToLogin();
    setCreateDatabaseOpen(true);
  }, [user?.uid]);
  const select = (database: DatabaseItem): void => {
    setDatabase(database);
    navigate(`/resource/database/${database.id}`);
  };
  const remove = (database: DatabaseItem, event: React.MouseEvent): void => {
    event.stopPropagation();
    setBotDetail(database);
    setDeleteModal(true);
  };
  useEffect(() => {
    const onSearch = (event: Event): void => {
      const { type, value } = (event as CustomEvent).detail;
      if (type === 'database') page.search(value);
    };
    window.addEventListener('headerSearch', onSearch);
    window.addEventListener('headerCreateDatabase', createDatabase);
    return () => {
      window.removeEventListener('headerSearch', onSearch);
      window.removeEventListener('headerCreateDatabase', createDatabase);
    };
  }, [page.search, createDatabase]);
  return (
    <>
      <ResourceCatalog
        title="数据库"
        description="管理结构化数据表，为 Agent 和工作流提供数据读写能力。"
        search={page.searchValue}
        onSearch={page.search}
        onCreate={createDatabase}
        createText="新建数据库"
        onRefresh={page.getList}
        loading={page.loading}
        error={page.error}
        empty={!page.dataSource.length}
      >
        <div className={styles.grid}>
          {page.dataSource.map(database => (
            <CardItem
              key={database.id}
              database={database}
              onClick={select}
              onDelete={remove}
            />
          ))}
        </div>
        {page.hasMore && (
          <div className={styles.more}>
            <Button loading={page.loading} onClick={page.handleLoadMore}>
              加载更多
            </Button>
          </div>
        )}
      </ResourceCatalog>
      {createDatabaseOpen && (
        <CreateDatabase
          open
          type="add"
          handleCancel={() => setCreateDatabaseOpen(false)}
          handleOk={values =>
            page.createDatabaseOk({
              name: values.name,
              description: values.description,
            })
          }
        />
      )}
      {deleteModal && botDetail && (
        <DeleteModal
          setDeleteModal={setDeleteModal}
          currentData={botDetail}
          getDataBase={page.getList}
        />
      )}
    </>
  );
};
export default memo(DataBase);
