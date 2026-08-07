import React, { useEffect, useState, useCallback } from 'react';
import { Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
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
}

const SpaceManage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchValue, setSearchValue] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [spaceList, setSpaceList] = useState<SpaceItem[]>([]); //show space list
  const [mySpaceList, setMySpaceList] = useState<SpaceItem[]>([]); //my created space list
  const [allSpaceList, setAllSpaceList] = useState<SpaceItem[]>([]); //all space list
  const [loading, setLoading] = useState<boolean>(false);
  const { t } = useTranslation();
  //get all space list
  const getSpaceList = (name?: string) => {
    getAllSpace(name)
      .then((res: any) => {
        setAllSpaceList(res);
        const mySpaces = res.filter((space: any) => space.userRole === 1);
        setMySpaceList(mySpaces);
        if (activeTab === 'all') {
          setSpaceList(res);
        } else {
          setSpaceList(mySpaces);
        }
      })
      .catch((err: any) => {
        message.error(err?.msg || err?.desc);
      });
  };

  useEffect(() => {
    getSpaceList();
    eventBus.on('spaceList', getSpaceList);
    return () => {
      eventBus.off('spaceList', getSpaceList);
    };
  }, []);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'all') {
      setSpaceList(allSpaceList);
    } else {
      setSpaceList(mySpaceList);
    }
  };

  // use debounce to optimize search
  const { run: debouncedSearch } = useDebounceFn(
    (value: string) => {
      setSearchValue(value);
      getSpaceList(value);
    },
    {
      wait: 500,
    }
  );

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
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
              placeholder={t('space.pleaseEnterSpaceName')}
              onChange={handleSearch}
              onSearch={handleSearchSubmit}
            />
          </div>
        </div>

        <div className={styles.listContainer}>
          <SpaceList
            staticSize={false}
            dataSource={spaceList}
            loading={loading}
            activeTab={activeTab}
            prefix={activeTab === 'all' ? <PersonalSpaceCard /> : null}
          />
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
