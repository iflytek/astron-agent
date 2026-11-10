import { useEffect, useState, type ReactElement } from 'react';
import { Alert, Button, Empty, Table } from 'antd';
import Credential from './components/credential';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { listApplications } from '@/services/published-api';
import type { UserApp } from '@/types/common';
import { errorText } from '@/pages/agents/errors';
import CreateApplication from './components/create-application';
import styles from './app-list.module.scss';

export default function AppListPage(): ReactElement {
  const { t } = useTranslation();
  const [apps, setApps] = useState<UserApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    listApplications()
      .then(rows => {
        if (active) setApps(rows);
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
  }, [revision]);

  return (
    <main className={styles.appListPage}>
      <header className={styles.title}>
        <h1 className={styles.aff}>{t('sidebar.appManagement')}</h1>
        <div className={styles.tableOperation}>
          <Button
            onClick={() => setRevision(value => value + 1)}
            disabled={loading}
          >
            刷新
          </Button>
          <Button type="primary" onClick={() => setCreating(true)}>
            {t('botApi.createApp')}
          </Button>
        </div>
      </header>
      <p>应用密钥用于调用已绑定的 Agent 和工作流。请仅在服务端保存密钥。</p>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          className="mb-5"
          action={
            <Button
              size="small"
              onClick={() => setRevision(value => value + 1)}
            >
              重试
            </Button>
          }
        />
      )}
      <div className={styles.tableArea}>
        <Table<UserApp>
          loading={loading}
          dataSource={apps}
          rowKey="appId"
          pagination={false}
          locale={{
            emptyText: loading ? (
              '正在加载应用…'
            ) : error ? (
              '应用未能加载，请重试。'
            ) : (
              <Empty description="暂无应用，创建应用后即可绑定发布版本。" />
            ),
          }}
          scroll={{ x: 1000 }}
          columns={[
            { title: t('appManage.appId'), dataIndex: 'appId' },
            { title: t('appManage.appName'), dataIndex: 'appName' },
            { title: t('appManage.appDescribe'), dataIndex: 'appDescribe' },
            {
              title: 'API Key',
              dataIndex: 'appKey',
              render: (value: string): ReactElement => (
                <Credential value={value} />
              ),
            },
            {
              title: 'API Secret',
              dataIndex: 'appSecret',
              render: (value: string): ReactElement => (
                <Credential value={value} />
              ),
            },
            {
              title: t('appManage.createTime'),
              dataIndex: 'createTime',
              render: (value: string): string =>
                value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—',
            },
          ]}
        />
      </div>
      {creating && (
        <CreateApplication
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setRevision(value => value + 1);
          }}
        />
      )}
    </main>
  );
}
