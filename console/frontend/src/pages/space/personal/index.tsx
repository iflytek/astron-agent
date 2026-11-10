import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Alert, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useDebounceFn } from 'ahooks';
import eventBus from '@/utils/event-bus';
import SpaceSearch from '@/components/space/space-search';
import SpaceList from '@/components/space/space-list';
import SpaceModal from '@/components/space/space-modal';
import SpaceTab from '@/components/space/space-tab';
import PersonalSpaceCard from './components/personal-space-card';

import styles from './index.module.scss';
import { getAllSpace } from '@/services/space';
import { useTranslation } from 'react-i18next';

interface SpaceItem {
  id: string;
  avatar?: string;
  name: string;
  description: string;
  ownerName: string;
  memberCount: number;
  status?: string;
  userRole?: number;
}

const SpaceManage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchValue, setSearchValue] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [allSpaceList, setAllSpaceList] = useState<SpaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const searchRef = useRef('');
  const { t } = useTranslation();
  const spaceList =
    activeTab === 'all'
      ? allSpaceList
      : allSpaceList.filter(space => space.userRole === 1);
  const getSpaceList = useCallback(
    async (name = searchRef.current) => {
      const current = ++sequence.current;
      setLoading(true);
      setError('');
      try {
        const result = await getAllSpace(name);
        if (current === sequence.current)
          setAllSpaceList(result as unknown as SpaceItem[]);
      } catch (reason) {
        if (current === sequence.current) setError(t('space.queryFailed'));
      } finally {
        if (current === sequence.current) setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void getSpaceList();
    eventBus.on('spaceList', getSpaceList);
    return () => {
      sequence.current += 1;
      eventBus.off('spaceList', getSpaceList);
    };
  }, [getSpaceList]);

  const handleTabChange = (key: string) => setActiveTab(key);

  // use debounce to optimize search
  const { run: debouncedSearch } = useDebounceFn(
    (value: string) => {
      searchRef.current = value;
      void getSpaceList(value);
    },
    {
      wait: 500,
    }
  );

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      searchRef.current = value;
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const handleSearchSubmit = useCallback(
    (value: string) => {
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const handleCreateSpace = () => {
    setShowCreateModal(true);
  };

  const handleCreateModalClose = () => {
    setShowCreateModal(false);
  };

  return (
    <div className={styles.enterpriseManage}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('space.spaceManagement')}</h1>
        <p className={styles.description}>
          管理个人与共享空间，在明确的空间范围内协作。
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.toolbar}>
          <div className={styles.tabs}>
            <SpaceTab
              options={[
                { key: 'all', label: t('space.allSpace') },
                { key: 'my', label: t('space.myCreatedSpace') },
              ]}
              activeKey={activeTab}
              onChange={handleTabChange}
              className={styles.customTabs}
            />
          </div>

          <div className={styles.actions}>
            <Button
              // disabled={!PermissionInfo?.checks?.canCreate(ModuleType.SPACE)}
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateSpace}
              className={styles.createBtn}
            >
              {t('space.createSpace')}
            </Button>
            <SpaceSearch
              value={searchValue}
              placeholder={t('space.pleaseEnterSpaceName')}
              onChange={handleSearch}
              onSearch={handleSearchSubmit}
            />
          </div>
        </div>

        <div className={styles.listContainer}>
          {error && (
            <Alert
              type="error"
              showIcon
              message={error}
              action={<Button onClick={() => void getSpaceList()}>重试</Button>}
            />
          )}
          {!error && (
            <SpaceList
              staticSize={false}
              dataSource={spaceList}
              loading={loading}
              activeTab={activeTab}
              emptyText={
                searchValue ? '没有匹配的空间，请调整搜索条件。' : undefined
              }
              prefix={
                !searchValue && activeTab === 'all' ? (
                  <PersonalSpaceCard />
                ) : null
              }
            />
          )}
        </div>
      </div>

      <SpaceModal
        open={showCreateModal}
        mode="create"
        onClose={handleCreateModalClose}
        onSuccess={getSpaceList}
        // onSubmit={handleCreateModalSubmit}
      />
    </div>
  );
};

export default SpaceManage;
