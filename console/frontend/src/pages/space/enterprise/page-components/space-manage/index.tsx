import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Alert, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useDebounceFn } from 'ahooks';
import SpaceButton from '@/components/button-group/space-button';

import SpaceSearch from '@/components/space/space-search';
import SpaceList from '@/components/space/space-list';
import SpaceModal from '@/components/space/space-modal';
import SpaceTab from '@/components/space/space-tab';

import styles from './index.module.scss';
import { ModuleType, OperationType } from '@/types/permission';

import { getAllCorporateList, getJoinedCorporateList } from '@/services/space';
import { useEnterprise } from '@/hooks/use-enterprise';

import { SpaceItem } from '@/types/space';

const SpaceManage: React.FC = () => {
  const activeTabRef = useRef<string>('all');
  const [searchValue, setSearchValue] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [spaceList, setSpaceList] = useState<SpaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const searchRef = useRef('');
  const { getJoinedEnterpriseList } = useEnterprise();

  const querySpaceList = useCallback(async (name = searchRef.current) => {
    const current = ++sequence.current;
    setLoading(true);
    setError('');
    try {
      const query =
        activeTabRef.current === 'all'
          ? getAllCorporateList
          : getJoinedCorporateList;
      const result = await query({ name });
      if (current === sequence.current) setSpaceList(result || []);
    } catch (reason) {
      if (current === sequence.current) setError('无法读取空间列表，请重试。');
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void querySpaceList();
    return () => {
      sequence.current += 1;
    };
  }, [querySpaceList]);

  const handleTabChange = (key: string) => {
    activeTabRef.current = key;
    searchRef.current = '';
    setSearchValue('');
    void querySpaceList('');
  };

  // 使用 useDebounceFn 优化搜索
  const { run: debouncedSearch } = useDebounceFn(
    (value: string) => {
      if (value === searchRef.current) void querySpaceList(value);
    },
    {
      wait: 500,
    }
  );

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      searchRef.current = value;
      setSearchValue(value);
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

  // const handleCreateModalSubmit = (values: any) => {
  //   // TODO: 实现创建空间功能
  //   console.log('创建空间:', values);
  //   setShowCreateModal(false);
  // };

  return (
    <div className={styles.enterpriseManage}>
      <div className={styles.header}>
        <h1 className={styles.title}>空间管理</h1>
        <p className={styles.description}>管理团队中的共享空间及协作范围。</p>
      </div>

      <div className={styles.content}>
        <div className={styles.toolbar}>
          <div className={styles.tabs}>
            <SpaceTab
              options={[
                { key: 'all', label: '全部空间' },
                { key: 'my', label: '我的空间' },
              ]}
              activeKey={activeTabRef.current}
              onChange={handleTabChange}
              className={styles.customTabs}
            />
          </div>

          <div className={styles.actions}>
            <SpaceButton
              config={{
                key: 'create-space',
                text: '创建空间',
                icon: <PlusOutlined />,
                type: 'primary',
                permission: {
                  module: ModuleType.SPACE,
                  operation: OperationType.CREATE,
                },
              }}
              size="small"
              className={styles.createBtn}
              onClick={handleCreateSpace}
            />
            <SpaceSearch
              value={searchValue}
              style={{ borderColor: '#E4EAFF' }}
              placeholder="搜索你感兴趣的空间"
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
              action={
                <Button onClick={() => void querySpaceList()}>重试</Button>
              }
            />
          )}
          {!error && (
            <SpaceList
              emptyText={
                searchValue ? '没有匹配的空间，请调整搜索条件。' : undefined
              }
              minCardWidth={440}
              staticSize={false}
              dataSource={spaceList}
              loading={loading}
              activeTab={activeTabRef.current}
              refresh={querySpaceList}
            />
          )}
        </div>
      </div>

      <SpaceModal
        open={showCreateModal}
        mode="create"
        onClose={handleCreateModalClose}
        onSuccess={() => {
          querySpaceList();
          getJoinedEnterpriseList();
        }}
        // onSubmit={handleCreateModalSubmit}
      />
    </div>
  );
};

export default SpaceManage;
