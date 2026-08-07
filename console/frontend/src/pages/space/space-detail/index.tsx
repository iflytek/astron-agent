import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { Select, message } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { useDebounceFn } from 'ahooks';

import SpaceTab from '@/components/space/space-tab';
import SpaceSearch from '@/components/space/space-search';
import DetailHeader from './components/detail-header';
import MemberManagement from './components/member-management';
import ApplyManagement from './components/apply-management';
import InvitationManagement, {
  InvitationManagementRef,
} from './components/invitation-management';
import SpaceSettings from './components/space-settings';
import AddMemberModal from '@/components/space/add-member-modal';
import SpaceModal from '@/components/space/space-modal';
import { useSpaceI18n } from '@/pages/space/hooks/use-space-i18n';
import { useTranslation } from 'react-i18next';
import useUserStore from '@/store/user-store';
import useSpaceStore from '@/store/space-store';
import { SpaceType, RoleType } from '@/types/permission';
import { roleToRoleType } from '@/pages/space/config';
import { useSpaceType } from '@/hooks/use-space-type';
import { useEnterprise } from '@/hooks/use-enterprise';
import styles from './index.module.scss';
import { TAB_KEYS, DEBOUNCE_DELAY, DEFAULT_VALUES } from '@/pages/space/config';
import { getSpaceDetail, spaceInvite, visitSpace } from '@/services/space';

const { Option } = Select;

interface SpaceInfo {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'member';
  memberCount: number;
  totalMembers: number;
  ownerName: string;
  userRole: number;
  enterpriseId?: string;
}

// 定义筛选状态接口
interface FilterState {
  inputValue: string; // 搜索框实时输入值
  searchValue: string; // 防抖后的搜索值
  filterValue: string; // 筛选器值
}

// 搜索处理器接口
interface SearchHandlers {
  handleMemberSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleApplySearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleInvitationSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleMemberRoleFilterChange: (value: string) => void;
  handleApplyStatusFilterChange: (value: string) => void;
  handleInvitationStatusFilterChange: (value: string) => void;
}

// 选项数据类型
interface OptionData {
  value: string;
  label: string;
}

// Tab动作渲染器参数接口
interface TabActionsParams {
  activeTab: string;
  memberFilter: FilterState;
  applyFilter: FilterState;
  invitationFilter: FilterState;
  roleOptions: OptionData[];
  statusOptions: OptionData[];
  statusOptionsApply: OptionData[];
  searchHandlers: SearchHandlers;
}

// 防抖搜索Hook参数接口
interface DebounceSearchParams {
  setMemberFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  setApplyFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  setInvitationFilter: React.Dispatch<React.SetStateAction<FilterState>>;
}

// 防抖搜索Hook返回类型
interface DebounceSearchReturn {
  debouncedMemberSearch: (value: string) => void;
  debouncedApplySearch: (value: string) => void;
  debouncedInvitationSearch: (value: string) => void;
}

// 搜索处理器Hook参数接口
interface SearchHandlersParams {
  setMemberFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  setApplyFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  setInvitationFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  debouncedMemberSearch: (value: string) => void;
  debouncedApplySearch: (value: string) => void;
  debouncedInvitationSearch: (value: string) => void;
}

// 筛选状态Hook返回类型
interface FilterStatesReturn {
  memberFilter: FilterState;
  setMemberFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  applyFilter: FilterState;
  setApplyFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  invitationFilter: FilterState;
  setInvitationFilter: React.Dispatch<React.SetStateAction<FilterState>>;
}

// 筛选状态管理Hook
const useFilterStates = (): FilterStatesReturn => {
  const [memberFilter, setMemberFilter] = useState<FilterState>({
    inputValue: DEFAULT_VALUES.SEARCH_VALUE,
    searchValue: DEFAULT_VALUES.SEARCH_VALUE,
    filterValue: DEFAULT_VALUES.ROLE_FILTER,
  });

  const [applyFilter, setApplyFilter] = useState<FilterState>({
    inputValue: DEFAULT_VALUES.SEARCH_VALUE,
    searchValue: DEFAULT_VALUES.SEARCH_VALUE,
    filterValue: DEFAULT_VALUES.STATUS_FILTER_APPLY,
  });

  const [invitationFilter, setInvitationFilter] = useState<FilterState>({
    inputValue: DEFAULT_VALUES.SEARCH_VALUE,
    searchValue: DEFAULT_VALUES.SEARCH_VALUE,
    filterValue: DEFAULT_VALUES.STATUS_FILTER,
  });

  return {
    memberFilter,
    setMemberFilter,
    applyFilter,
    setApplyFilter,
    invitationFilter,
    setInvitationFilter,
  };
};

// 防抖搜索Hook
const useDebounceSearch = (
  params: DebounceSearchParams
): DebounceSearchReturn => {
  const { setMemberFilter, setApplyFilter, setInvitationFilter } = params;
  const { run: debouncedMemberSearch } = useDebounceFn(
    (value: string) => {
      setMemberFilter(prev => ({
        ...prev,
        searchValue: value,
      }));
    },
    { wait: DEBOUNCE_DELAY }
  );

  const { run: debouncedApplySearch } = useDebounceFn(
    (value: string) => {
      setApplyFilter(prev => ({
        ...prev,
        searchValue: value,
      }));
    },
    { wait: DEBOUNCE_DELAY }
  );

  const { run: debouncedInvitationSearch } = useDebounceFn(
    (value: string) => {
      setInvitationFilter(prev => ({
        ...prev,
        searchValue: value,
      }));
    },
    { wait: DEBOUNCE_DELAY }
  );

  return {
    debouncedMemberSearch,
    debouncedApplySearch,
    debouncedInvitationSearch,
  };
};

// 搜索处理函数Hook - 重构为更小的组件
const useSearchHandlers = (params: SearchHandlersParams): SearchHandlers => {
  const {
    setMemberFilter,
    setApplyFilter,
    setInvitationFilter,
    debouncedMemberSearch,
    debouncedApplySearch,
    debouncedInvitationSearch,
  } = params;
  const handleMemberSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setMemberFilter(prev => ({
        ...prev,
        inputValue: value,
      }));
      debouncedMemberSearch(value);
    },
    [debouncedMemberSearch, setMemberFilter]
  );

  const handleApplySearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setApplyFilter(prev => ({
        ...prev,
        inputValue: value,
      }));
      debouncedApplySearch(value);
    },
    [debouncedApplySearch, setApplyFilter]
  );

  const handleInvitationSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInvitationFilter(prev => ({
        ...prev,
        inputValue: value,
      }));
      debouncedInvitationSearch(value);
    },
    [debouncedInvitationSearch, setInvitationFilter]
  );

  const handleMemberRoleFilterChange = useCallback(
    (value: string) => {
      setMemberFilter(prev => ({
        ...prev,
        filterValue: value,
      }));
    },
    [setMemberFilter]
  );

  const handleApplyStatusFilterChange = useCallback(
    (value: string) => {
      setApplyFilter(prev => ({
        ...prev,
        filterValue: value,
      }));
    },
    [setApplyFilter]
  );

  const handleInvitationStatusFilterChange = useCallback(
    (value: string) => {
      setInvitationFilter(prev => ({
        ...prev,
        filterValue: value,
      }));
    },
    [setInvitationFilter]
  );

  return {
    handleMemberSearch,
    handleApplySearch,
    handleInvitationSearch,
    handleMemberRoleFilterChange,
    handleApplyStatusFilterChange,
    handleInvitationStatusFilterChange,
  };
};

// 空间信息Hook返回类型
interface UseSpaceInfoReturn {
  spaceInfo: SpaceInfo | null;
  loading: boolean;
  loadSpaceInfo: () => Promise<void>;
}

// 弹窗状态Hook返回类型
interface UseModalStatesReturn {
  showAddMemberModal: boolean;
  showEditModal: boolean;
  handleAddMember: () => void;
  handleEditSpace: () => void;
  handleEditModalClose: () => void;
  handleAddMemberModalClose: () => void;
  handleShare: () => void;
}

// Tab内容Hook参数接口
interface TabContentParams {
  activeTab: string;
  spaceInfo: SpaceInfo | null;
  memberFilter: FilterState;
  applyFilter: FilterState;
  invitationFilter: FilterState;
  invitationManagementRef: React.RefObject<InvitationManagementRef>;
  loadSpaceInfo: () => Promise<void>;
}

// 空间信息管理Hook
const useSpaceInfo = (spaceId: string | undefined): UseSpaceInfoReturn => {
  const navigate = useNavigate();
  const { setUserRole } = useUserStore();
  const { spaceType, setSpaceStore } = useSpaceStore();
  const { isTeamSpace, deleteSpaceCb, handleTeamSwitch, getLastVisitSpace } =
    useSpaceType(navigate);
  const { isTeamSpaceEmpty } = useEnterprise();

  const [spaceInfo, setSpaceInfo] = useState<SpaceInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const updateSpaceStore = useCallback(
    async (spaceInfo: SpaceInfo): Promise<void> => {
      const { enterpriseId: detailEnterpriseId } = spaceInfo;

      if (
        (isTeamSpace() && !detailEnterpriseId) ||
        (detailEnterpriseId && !isTeamSpace())
      ) {
        await visitSpace(spaceId);
        setSpaceStore({
          enterpriseId: detailEnterpriseId,
          spaceType: detailEnterpriseId ? 'team' : 'personal',
        });
        setTimeout(() => {
          getLastVisitSpace();
        });
      }
    },
    [spaceId, isTeamSpace, setSpaceStore, getLastVisitSpace]
  );

  const loadSpaceInfo = useCallback(async (): Promise<void> => {
    if (!spaceId) {
      setLoading(false);
      return;
    }

    setSpaceStore({ spaceId });

    try {
      setLoading(true);
      const response = await getSpaceDetail();
      const spaceInfo = response as unknown as SpaceInfo;
      updateSpaceStore(spaceInfo);
      setSpaceInfo(spaceInfo);
      setUserRole(
        spaceType as SpaceType,
        roleToRoleType(spaceInfo?.userRole, isTeamSpace()) as RoleType
      );
    } catch (err: unknown) {
      const error = err as { msg?: string; desc?: string };
      message.error(error?.msg || error?.desc);
      deleteSpaceCb();
    } finally {
      setLoading(false);
    }
  }, [
    spaceId,
    spaceType,
    isTeamSpace,
    updateSpaceStore,
    setUserRole,
    deleteSpaceCb,
    setSpaceStore,
  ]);

  const checkNoTeamSpace = useCallback(() => {
    if (isTeamSpaceEmpty) {
      handleTeamSwitch();
    }
  }, [isTeamSpaceEmpty, handleTeamSwitch]);

  useEffect(() => {
    loadSpaceInfo();
    checkNoTeamSpace();
  }, [loadSpaceInfo, checkNoTeamSpace]);

  return {
    spaceInfo,
    loading,
    loadSpaceInfo,
  };
};

// 弹窗状态管理Hook
const useModalStates = (): UseModalStatesReturn => {
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  const handleAddMember = useCallback(() => {
    setShowAddMemberModal(true);
  }, []);

  const handleEditSpace = useCallback(() => {
    setShowEditModal(true);
  }, []);

  const handleEditModalClose = useCallback(() => {
    setShowEditModal(false);
  }, []);

  const handleAddMemberModalClose = useCallback(() => {
    setShowAddMemberModal(false);
  }, []);

  const handleShare = useCallback(() => {
    // Share functionality can be implemented here
  }, []);

  return {
    showAddMemberModal,
    showEditModal,
    handleAddMember,
    handleEditSpace,
    handleEditModalClose,
    handleAddMemberModalClose,
    handleShare,
  };
};

// Tab内容渲染Hook
const useTabContent = (params: TabContentParams): React.ReactNode => {
  const {
    activeTab,
    spaceInfo,
    memberFilter,
    applyFilter,
    invitationFilter,
    invitationManagementRef,
    loadSpaceInfo,
  } = params;
  return useMemo(() => {
    if (!spaceInfo) return null;

    switch (activeTab) {
      case TAB_KEYS.MEMBERS:
        return (
          <MemberManagement
            spaceId={spaceInfo.id}
            searchValue={memberFilter.searchValue}
            roleFilter={memberFilter.filterValue}
          />
        );
      case TAB_KEYS.APPLY:
        return (
          <ApplyManagement
            spaceId={spaceInfo.id}
            searchValue={applyFilter.searchValue}
            statusFilter={applyFilter.filterValue}
          />
        );
      case TAB_KEYS.INVITATIONS:
        return (
          <InvitationManagement
            ref={invitationManagementRef}
            spaceId={spaceInfo.id}
            searchValue={invitationFilter.searchValue}
            statusFilter={invitationFilter.filterValue}
          />
        );
      case TAB_KEYS.SETTINGS:
        return (
          <SpaceSettings spaceInfo={spaceInfo} onRefresh={loadSpaceInfo} />
        );
      default:
        return null;
    }
  }, [
    activeTab,
    spaceInfo,
    memberFilter.searchValue,
    memberFilter.filterValue,
    applyFilter.searchValue,
    applyFilter.filterValue,
    invitationFilter.searchValue,
    invitationFilter.filterValue,
    invitationManagementRef,
    loadSpaceInfo,
  ]);
};

// 成员Tab操作渲染器
const renderMembersTabAction = (
  memberFilter: FilterState,
  roleOptions: OptionData[],
  searchHandlers: SearchHandlers,
  t: (key: string) => string
): React.JSX.Element => (
  <div key={TAB_KEYS.MEMBERS} className={styles.tabActions}>
    <Select
      value={memberFilter.filterValue}
      onChange={searchHandlers.handleMemberRoleFilterChange}
      className={styles.filterSelect}
      placeholder={t('space.selectRole')}
    >
      {roleOptions.map(option => (
        <Option key={option.value} value={option.value}>
          {option.label}
        </Option>
      ))}
    </Select>
    <SpaceSearch
      style={{ borderColor: '#E4EAFF' }}
      value={memberFilter.inputValue}
      onChange={searchHandlers.handleMemberSearch}
      placeholder={t('space.pleaseEnterUsername')}
    />
  </div>
);

// 申请Tab操作渲染器
const renderApplyTabAction = (
  applyFilter: FilterState,
  statusOptionsApply: OptionData[],
  searchHandlers: SearchHandlers,
  t: (key: string) => string
): React.JSX.Element => (
  <div key={TAB_KEYS.APPLY} className={styles.tabActions}>
    <Select
      value={applyFilter.filterValue}
      onChange={searchHandlers.handleApplyStatusFilterChange}
      className={styles.filterSelect}
      placeholder={t('space.selectStatus')}
    >
      {statusOptionsApply.map(option => (
        <Option key={option.value} value={option.value}>
          {option.label}
        </Option>
      ))}
    </Select>
    <SpaceSearch
      style={{ borderColor: '#E4EAFF' }}
      value={applyFilter.inputValue}
      onChange={searchHandlers.handleApplySearch}
      placeholder={t('space.pleaseEnterUsername')}
    />
  </div>
);

// 邀请Tab操作渲染器
const renderInvitationTabAction = (
  invitationFilter: FilterState,
  statusOptions: OptionData[],
  searchHandlers: SearchHandlers,
  t: (key: string) => string
): React.JSX.Element => (
  <div key={TAB_KEYS.INVITATIONS} className={styles.tabActions}>
    <Select
      value={invitationFilter.filterValue}
      onChange={searchHandlers.handleInvitationStatusFilterChange}
      className={styles.filterSelect}
      placeholder={t('space.selectStatus')}
    >
      {statusOptions.map(option => (
        <Option key={option.value} value={option.value}>
          {option.label}
        </Option>
      ))}
    </Select>
    <SpaceSearch
      style={{ borderColor: '#E4EAFF' }}
      value={invitationFilter.inputValue}
      onChange={searchHandlers.handleInvitationSearch}
      placeholder={t('space.pleaseEnterUsername')}
    />
  </div>
);

// Tab操作区域渲染Hook - 重构为更小的函数
const useTabActions = (params: TabActionsParams): React.ReactNode => {
  const {
    activeTab,
    memberFilter,
    applyFilter,
    invitationFilter,
    roleOptions,
    statusOptions,
    statusOptionsApply,
    searchHandlers,
  } = params;

  const { t } = useTranslation();

  return useMemo(() => {
    switch (activeTab) {
      case TAB_KEYS.MEMBERS:
        return renderMembersTabAction(
          memberFilter,
          roleOptions,
          searchHandlers,
          t
        );
      case TAB_KEYS.APPLY:
        return renderApplyTabAction(
          applyFilter,
          statusOptionsApply,
          searchHandlers,
          t
        );
      case TAB_KEYS.INVITATIONS:
        return renderInvitationTabAction(
          invitationFilter,
          statusOptions,
          searchHandlers,
          t
        );
      default:
        return null;
    }
  }, [
    activeTab,
    memberFilter.filterValue,
    memberFilter.inputValue,
    applyFilter.filterValue,
    applyFilter.inputValue,
    invitationFilter.filterValue,
    invitationFilter.inputValue,
    roleOptions,
    statusOptions,
    statusOptionsApply,
    searchHandlers,
    t,
  ]);
};

const SpaceDetail: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const {
    tabOptions,
    roleOptions,
    statusOptions,
    statusOptionsApply,
    messages,
  } = useSpaceI18n();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<string>(DEFAULT_VALUES.TAB);
  const invitationManagementRef = useRef<InvitationManagementRef>(null);

  // 使用自定义 Hooks
  const { spaceInfo, loading, loadSpaceInfo } = useSpaceInfo(spaceId);

  const {
    memberFilter,
    setMemberFilter,
    applyFilter,
    setApplyFilter,
    invitationFilter,
    setInvitationFilter,
  } = useFilterStates();

  const {
    debouncedMemberSearch,
    debouncedApplySearch,
    debouncedInvitationSearch,
  } = useDebounceSearch({
    setMemberFilter,
    setApplyFilter,
    setInvitationFilter,
  });

  const searchHandlers = useSearchHandlers({
    setMemberFilter,
    setApplyFilter,
    setInvitationFilter,
    debouncedMemberSearch,
    debouncedApplySearch,
    debouncedInvitationSearch,
  });

  const {
    showAddMemberModal,
    showEditModal,
    handleAddMember,
    handleEditSpace,
    handleEditModalClose,
    handleAddMemberModalClose,
    handleShare,
  } = useModalStates();

  const tabContentRender = useTabContent({
    activeTab,
    spaceInfo,
    memberFilter,
    applyFilter,
    invitationFilter,
    invitationManagementRef,
    loadSpaceInfo,
  });

  const tabActionsRender = useTabActions({
    activeTab,
    memberFilter,
    applyFilter,
    invitationFilter,
    roleOptions,
    statusOptions,
    statusOptionsApply,
    searchHandlers,
  });

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key);
  }, []);

  const handleAddMemberModalSubmit = useCallback(
    async (values: Array<{ uid: string; role: string }>) => {
      try {
        const members = (values || []).map(item => ({
          uid: item.uid,
          role: item.role,
        }));
        await spaceInvite(members);
        message.success(t('common.inviteSuccess'));
        handleAddMemberModalClose();
        invitationManagementRef.current?.reload();
      } catch (error: unknown) {
        const err = error as { msg?: string };
        message.error(err?.msg || messages.ERROR.MEMBER_ADD);
      }
    },
    [t, handleAddMemberModalClose, messages]
  );

  // 加载状态渲染
  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSkeleton}>
            <div className={styles.skeletonHeader}></div>
            <div className={styles.skeletonContent}></div>
          </div>
        </div>
      </div>
    );
  }

  // 如果没有空间信息，返回空内容
  if (!spaceInfo) {
    return <div className={styles.spaceDetail}></div>;
  }

  return (
    <div className={styles.spaceDetail}>
      <DetailHeader
        spaceInfo={spaceInfo}
        onEditSpace={handleEditSpace}
        onAddMember={handleAddMember}
        onShare={handleShare}
      />

      <div className={styles.content}>
        <SpaceTab
          options={tabOptions}
          activeKey={activeTab}
          onChange={handleTabChange}
          className={styles.customTabs}
          tabContent={tabContentRender}
        >
          {tabActionsRender}
        </SpaceTab>
      </div>

      {/* 弹窗组件 */}
      <AddMemberModal
        inviteType="space"
        open={showAddMemberModal}
        onClose={handleAddMemberModalClose}
        onSubmit={handleAddMemberModalSubmit}
      />

      <SpaceModal
        open={showEditModal}
        mode="edit"
        initialData={{ ...spaceInfo }}
        onClose={handleEditModalClose}
        onSuccess={loadSpaceInfo}
      />
    </div>
  );
};

export default SpaceDetail;
