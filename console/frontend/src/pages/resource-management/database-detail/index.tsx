import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Skeleton } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { DatabaseProvider, useDatabaseState } from './context/database-context';
import DatabaseSidebar from './components/database-sidebar';
import MainContent from './components/main-content';
import ModalComponents from './components/modal-components';
import { useDatabaseInitializer } from './hooks/use-database-initializer';
import { resourceStyles as styles } from '../knowledge-page/resource-surface';
const DatabaseDetailContent: React.FC = () => {
  const { loading, error, retry } = useDatabaseInitializer();
  const { dbDetailData } = useDatabaseState();
  const navigate = useNavigate();
  return (
    <main className={styles.detail}>
      <div className={styles.heading}>
        <div>
          <Button
            icon={<ArrowLeftOutlined />}
            type="text"
            onClick={() => navigate('/resource/database')}
          >
            返回数据库
          </Button>
          <h1 className="mt-3">{dbDetailData.name || '数据库详情'}</h1>
          {dbDetailData.description && <p>{dbDetailData.description}</p>}
        </div>
      </div>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={<Button onClick={retry}>重试</Button>}
        />
      )}
      {loading ? (
        <Skeleton active />
      ) : (
        !error && (
          <div className={styles.databaseWorkspace}>
            <div className={styles.databaseSidebar}>
              <DatabaseSidebar />
            </div>
            <div className={styles.databaseMain}>
              <MainContent />
            </div>
          </div>
        )
      )}
      <ModalComponents />
    </main>
  );
};
const DatabaseDetailPage: React.FC = () => (
  <DatabaseProvider>
    <DatabaseDetailContent />
  </DatabaseProvider>
);
export default memo(DatabaseDetailPage);
