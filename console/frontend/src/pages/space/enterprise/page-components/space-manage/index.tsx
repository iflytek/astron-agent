import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Input, message } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';
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
  const navigate = useNavigate();
  const activeTabRef = useRef<string>('all');
  const [searchValue, setSearchValue] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [spaceList, setSpaceList] = useState<SpaceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { getJoinedEnterpriseList } = useEnterprise();

  const queryFnMap: Record<string, (params?: any) => Promise<SpaceItem[]>> = {
    all: getAllCorporateList,
    my: getJoinedCorporateList,
  };

  useEffect(() => {
    // 初始化数据
    querySpaceList();
  }, []);

  const querySpaceList = useCallback(async (name?: string) => {
    try {
      setLoading(true);
      const res: SpaceItem[] | undefined = await queryFnMap[
        activeTabRef.current as keyof typeof queryFnMap
      ]?.({ name });
      console.log(
        res,
        `========== getSpaceList(${activeTabRef.current}) ==========`
      );
      setSpaceList(res || []);
    } catch (err: any) {
      console.log(err, '========== getSpaceList error ==========');
      message.error(err?.msg || err?.desc || '查询失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTabChange = (key: string) => {
    activeTabRef.current = key;
    setSearchValue('');
    querySpaceList();
  };

  // 使用 useDebounceFn 优化搜索
  const { run: debouncedSearch } = useDebounceFn(
    (value: string) => {
      setSearchValue(value);
      console.log('搜索关键词:', value);
      querySpaceList(value);
    },
    {
      wait: 500,
    }
  );

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
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
          <SpaceList
            minCardWidth={440}
            staticSize={false}
            dataSource={spaceList}
            loading={loading}
            activeTab={activeTabRef.current}
            refresh={querySpaceList}
          />
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
