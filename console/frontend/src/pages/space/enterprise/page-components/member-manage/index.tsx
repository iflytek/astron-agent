import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Select, message } from 'antd';
import { useDebounceFn } from 'ahooks';
import SpaceTab, { TabOption } from '@/components/space/space-tab';
import SpaceSearch from '@/components/space/space-search';
import SpaceButton, {
  SpaceButtonProps,
} from '@/components/button-group/space-button';
import MemberList from './components/member-list';
import InvitationList, {
  InvitationListRef,
} from './components/invitation-list';
import AddMemberModal from '@/components/space/add-member-modal';
import BatchImport from './components/batch-import';
import { useSpaceI18n } from '@/pages/space/hooks/use-space-i18n';

import styles from './index.module.scss';
import { ModuleType, OperationType } from '@/types/permission';
import { enterpriseInvite } from '@/services/enterprise';
import { DEFAULT_VALUES } from '@/pages/space/config';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

// 常量定义
const TAB_KEYS = {
  MEMBERS: 'members',
  INVITATIONS: 'invitations',
} as const;

const DEBOUNCE_DELAY = 300;

// 定义筛选状态接口
interface FilterState {
  inputValue: string; // 搜索框实时输入值
  searchValue: string; // 防抖后的搜索值
  filterValue: string; // 筛选器值
}

const MemberManage: React.FC = () => {
  const { t } = useTranslation();
  const invitationListRef = useRef<InvitationListRef>(null);
  const [activeTab, setActiveTab] = useState<string>(TAB_KEYS.MEMBERS);

  // 为每个tab维护独立的筛选状态
  const [memberFilter, setMemberFilter] = useState<FilterState>({
    inputValue: '',
    searchValue: '',
    filterValue: DEFAULT_VALUES.ROLE_FILTER,
  });

  const [invitationFilter, setInvitationFilter] = useState<FilterState>({
    inputValue: '',
    searchValue: '',
    filterValue: DEFAULT_VALUES.STATUS_FILTER,
  });

  // 添加弹窗状态
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false);

  // 添加国际化支持
  const { messages, statusOptions, enterpriseRoleOptions } = useSpaceI18n();

  // 选项卡配置
  const tabOptions: TabOption[] = [
    {
      key: TAB_KEYS.MEMBERS,
      label: '成员列表',
    },
    {
      key: TAB_KEYS.INVITATIONS,
      label: '邀请管理',
      permission: {
        module: ModuleType.SPACE,
        operation: OperationType.INVITATION_MANAGE,
      },
    },
  ];

  // 成员搜索防抖
  const { run: debouncedMemberSearch } = useDebounceFn(
    (value: string) => {
      setMemberFilter(prev => ({
        ...prev,
        searchValue: value,
      }));
    },
    { wait: DEBOUNCE_DELAY }
  );

  // 邀请搜索防抖
  const { run: debouncedInvitationSearch } = useDebounceFn(
    (value: string) => {
      setInvitationFilter(prev => ({
        ...prev,
        searchValue: value,
      }));
    },
    { wait: DEBOUNCE_DELAY }
  );

  // 处理选项卡切换
  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key);
  }, []);

  // 成员搜索处理
  const handleMemberSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setMemberFilter(prev => ({
        ...prev,
        inputValue: value,
      }));
      debouncedMemberSearch(value);
    },
    [debouncedMemberSearch]
  );

  // 邀请搜索处理
  const handleInvitationSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInvitationFilter(prev => ({
        ...prev,
        inputValue: value,
      }));
      debouncedInvitationSearch(value);
    },
    [debouncedInvitationSearch]
  );

  // 成员角色筛选处理
  const handleMemberRoleFilterChange = useCallback((value: string) => {
    setMemberFilter(prev => ({
      ...prev,
      filterValue: value,
    }));
  }, []);

  // 邀请状态筛选处理
  const handleInvitationStatusFilterChange = useCallback((value: string) => {
    console.log(
      value,
      '============= handleInvitationStatusFilterChange ==========='
    );
    setInvitationFilter(prev => ({
      ...prev,
      filterValue: value,
    }));
  }, []);

  // 添加成员处理
  const handleAddMember = useCallback(() => {
    setShowAddMemberModal(true);
  }, []);

  // 添加弹窗关闭处理函数
  const handleAddMemberModalClose = useCallback(() => {
    setShowAddMemberModal(false);
  }, []);

  // 添加成员提交处理函数
  const handleAddMemberModalSubmit = useCallback(
    async (values: any) => {
      try {
        const members = (values || []).map((item: any) => ({
          uid: item.uid,
          role: item.role,
        }));
        const res = await enterpriseInvite(members);
        console.log(
          res,
          '============= handleAddMemberModalSubmit ==========='
        );

        setShowAddMemberModal(false);
        message.success(messages.SUCCESS.MEMBER_ADD);
        // 刷新邀请列表
        invitationListRef.current?.reload();
        return true;
      } catch (error: any) {
        message.error(error?.msg || error?.desc);
        return false;
      }
    },
    [messages]
  );

  // 批量导入成功处理函数
  const handleBatchImportSuccess = useCallback((data: any) => {
    console.log('批量导入成功:', data);
    message.success(`批量导入成功：${data.successCount || 0}个成员`);
    // 刷新邀请列表
    invitationListRef.current?.reload();
  }, []);

  // 添加成员按钮配置
  const addMemberButtonConfig = useMemo(
    () => ({
      key: 'add-member',
      text: '添加成员',
      type: 'primary' as const,
      size: 'small' as const,
      permission: {
        module: ModuleType.SPACE,
        operation: OperationType.ADD_MEMBERS,
      },
      onClick: (key: string, event: React.MouseEvent) => handleAddMember(),
    }),
    [handleAddMember]
  );

  // 渲染tab操作区域的通用函数
  const renderTabActions = useCallback(
    (config: {
      filterValue: string;
      onFilterChange: (value: string) => void;
      filterOptions: Array<{ value: string; label: string }>;
      filterPlaceholder: string;
      inputValue: string;
      onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
      inputPlaceholder: string;
    }) => {
      const {
        filterValue,
        onFilterChange,
        filterOptions,
        filterPlaceholder,
        inputValue,
        onInputChange,
        inputPlaceholder,
      } = config;

      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Select
            value={filterValue}
            onChange={onFilterChange}
            style={{ width: 120 }}
            placeholder={filterPlaceholder}
          >
            {filterOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
          <SpaceSearch
            style={{ borderColor: '#E4EAFF', width: 200 }}
            value={inputValue}
            onChange={onInputChange}
            placeholder={inputPlaceholder}
          />
          <BatchImport onSubmit={handleAddMemberModalSubmit} />
          <SpaceButton config={addMemberButtonConfig} />
        </div>
      );
    },
    [handleAddMemberModalSubmit, addMemberButtonConfig]
  );

  // 缓存tab内容渲染
  const tabContentRender = useMemo(() => {
    switch (activeTab) {
      case TAB_KEYS.MEMBERS:
        return (
          <MemberList
            searchValue={memberFilter.searchValue}
            roleFilter={memberFilter.filterValue}
          />
        );
      case TAB_KEYS.INVITATIONS:
        return (
          <InvitationList
            ref={invitationListRef}
            searchValue={invitationFilter.searchValue}
            statusFilter={invitationFilter.filterValue}
          />
        );
      default:
        return null;
    }
  }, [
    activeTab,
    memberFilter.searchValue,
    memberFilter.filterValue,
    invitationFilter.searchValue,
    invitationFilter.filterValue,
  ]);

  // 缓存右侧操作区域渲染
  const tabActionsRender = useMemo(() => {
    switch (activeTab) {
      case TAB_KEYS.MEMBERS:
        return renderTabActions({
          filterValue: memberFilter.filterValue,
          onFilterChange: handleMemberRoleFilterChange,
          filterOptions: enterpriseRoleOptions,
          filterPlaceholder: '选择角色',
          inputValue: memberFilter.inputValue,
          onInputChange: handleMemberSearch,
          inputPlaceholder: '请输入用户名',
        });

      case TAB_KEYS.INVITATIONS:
        return renderTabActions({
          filterValue: invitationFilter.filterValue,
          onFilterChange: handleInvitationStatusFilterChange,
          filterOptions: statusOptions,
          filterPlaceholder: '选择状态',
          inputValue: invitationFilter.inputValue,
          onInputChange: handleInvitationSearch,
          inputPlaceholder: '请输入用户名',
        });

      default:
        return null;
    }
  }, [
    activeTab,
    renderTabActions,
    memberFilter.filterValue,
    memberFilter.inputValue,
    invitationFilter.filterValue,
    invitationFilter.inputValue,
    enterpriseRoleOptions,
    statusOptions,
    handleMemberRoleFilterChange,
    handleMemberSearch,
    handleInvitationStatusFilterChange,
    handleInvitationSearch,
  ]);

  return (
    <div className={styles.memberManage}>
      <div className={styles.header}>
        <h1 className={styles.title}>成员管理</h1>
      </div>

      <div className={styles.content}>
        <SpaceTab
          className={styles.tabContainer}
          options={tabOptions}
          activeKey={activeTab}
          onChange={handleTabChange}
          tabContent={tabContentRender}
        >
          {tabActionsRender}
        </SpaceTab>
      </div>

      {/* 添加成员弹窗 */}
      <AddMemberModal
        open={showAddMemberModal}
        onClose={handleAddMemberModalClose}
        onSubmit={handleAddMemberModalSubmit}
      />
    </div>
  );
};

export default MemberManage;
