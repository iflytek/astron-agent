import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  KeyboardEvent,
} from 'react';
import { Modal, Input, Checkbox, Button, Select, Avatar, message } from 'antd';
import { useDebounceFn } from 'ahooks';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from './index.module.scss';
import ButtonGroup from '@/components/button-group/button-group';
import type { ButtonConfig } from '@/components/button-group/types';

import SpaceSearch from '@/components/space/space-search';
import UserItem from './user-item';
import SelectedUserItem from './selected-user-item';
import CusCheckBox from './cus-check-box';

import emptyImg from '@/assets/imgs/space/empty.png';
import creatorImg from '@/assets/imgs/space/person-space-icon.svg';

import { searchInviteUsers, getUserLimit } from './config';
import { MEMBER_ROLE } from '@/pages/space/config';

interface User {
  uid: string;
  nickname: string;
  mobile: string;
  avatar?: string;
  status?: number; // 0：未加入，1：已加入，2：确认中 ,
  role?: string;
  username?: string;
}

interface SelectedUser {
  uid: string;
  nickname: string;
  mobile: string;
  avatar?: string;
  role: string;
  status?: number;
  username?: string;
}

interface AddMemberModalProps {
  title?: React.ReactNode;
  inviteType?: 'enterprise' | 'space';
  open: boolean;
  onClose: () => void;
  onSubmit: (values: SelectedUser[]) => void;
  maxMembers?: number; // 最大成员数量
  initialUsers?: User[]; // 初始用户列表（用于批量导入）
}

const AddMemberModal: React.FC<AddMemberModalProps> = React.memo(
  ({
    inviteType = 'enterprise',
    open,
    onClose,
    onSubmit,
    initialUsers = [],
  }) => {
    const { t } = useTranslation();
    const [searchValue, setSearchValue] = useState<string>('');
    const [lastSearchedValue, setLastSearchedValue] = useState<string>(''); // 添加这行
    const [allChecked, setAllChecked] = useState<boolean>(false);
    const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
    const [userList, setUserList] = useState<User[]>(initialUsers);
    const [loading, setLoading] = useState<boolean>(false);
    const [maxMembers, setMaxMembers] = useState<number>(48);

    useEffect(() => {
      if (open) {
        updateMaxMembers();
        setSearchValue('');
        setLastSearchedValue('');
      } else {
        // 关闭时重置状态
        setSearchValue('');
        setLastSearchedValue('');
        setSelectedUsers([]);
        setAllChecked(false);
        setUserList([]);
      }
    }, [open]);

    const updateMaxMembers = useCallback(async () => {
      const maxNums: number = await getUserLimit(inviteType);
      setMaxMembers(maxNums);
    }, [inviteType]);

    // 搜索用户接口调用
    const searchUsers = useCallback(
      async (searchKeyword: string) => {
        // 移除对空字符串的检查，允许空搜索
        setLoading(true);
        setLastSearchedValue(searchKeyword.trim());

        try {
          if (!searchKeyword.trim()) {
            // 如果是空字符串，直接清空列表
            setUserList([]);
            return;
          }

          const res = await searchInviteUsers(
            { username: searchKeyword },
            inviteType
          );
          const users = (res || []).map(user => ({
            ...user,
            avatar: user.avatar || creatorImg,
          }));
          setUserList(users);
        } catch (error: any) {
          message.error(error?.msg || error?.desc);
          setUserList([]);
        } finally {
          setLoading(false);
        }
      },
      [inviteType]
    );

    // 处理输入框值变化
    const handleSearch = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchValue(value);

        // 当输入为空时，执行搜索以清空列表
        if (value === '') {
          searchUsers('');
          return;
        }
      },
      [searchUsers]
    );

    // 处理回车事件
    const handleKeyPress = useCallback(
      (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const trimmedValue = searchValue.trim();
          if (!trimmedValue) {
            message.warning(t('space.enterUsername'));
            return;
          }
          searchUsers(trimmedValue);
        }
      },
      [searchValue, searchUsers, t]
    );

    // 用户信息转换
    const transformUserInfo = useCallback((users: any[]) => {
      if (!users || users.length === 0) {
        return [];
      }

      return users.map(user => {
        const { uid, nickname, mobile, avatar, role, status, username } = user;
        return {
          uid,
          username,
          nickname,
          mobile,
          avatar,
          role: role || MEMBER_ROLE,
          status: status || 0,
        };
      });
    }, []);

    const handleSelectUser = useCallback(
      (user: User, checked: boolean) => {
        // 检查是否达到最大值
        if (checked && selectedUsers.length >= maxMembers) {
          message.warning(t('space.memberLimitReached', { count: maxMembers }));
          return;
        }

        if (checked) {
          // 添加用户
          const newUser: SelectedUser = transformUserInfo([
            user,
          ])[0] as SelectedUser;
          setSelectedUsers(prev => [...prev, newUser]);
        } else {
          // 移除用户
          setSelectedUsers(prev => prev.filter(u => u.uid !== user.uid));
        }
      },
      [selectedUsers.length, maxMembers, t, transformUserInfo]
    );

    const handleRoleChange = useCallback((userId: string, role: string) => {
      setSelectedUsers(prev =>
        prev.map(user => (user.uid === userId ? { ...user, role } : user))
      );
    }, []);

    const handleRemoveUser = useCallback((userId: string) => {
      // 只移除当前操作选择的用户，历史成员不在selectedUsers中
      setSelectedUsers(prev => prev.filter(user => user.uid !== userId));
    }, []);

    const handleSubmit = useCallback(() => {
      // selectedUsers 中只包含当前操作选择的用户
      if (selectedUsers.length === 0) {
        message.warning(t('space.selectAtLeastOneUser'));
        return;
      }

      onSubmit(selectedUsers);
    }, [selectedUsers, onSubmit, t]);

    // 缓存已选择用户的 ID 集合
    const selectedUserIds = useMemo(
      () => new Set(selectedUsers.map(user => user.uid)),
      [selectedUsers]
    );

    // 缓存可添加的成员列表（非已加入成员）
    const addableUsers = useMemo(
      () => userList.filter(user => user.status === 0),
      [userList]
    );

    useEffect(() => {
      // 更新全选状态 - 只考虑可添加的成员
      const selectedIds = selectedUsers.map(user => user.uid);
      const allSelected =
        addableUsers.length > 0 &&
        addableUsers.every(user => selectedIds.includes(user.uid));
      setAllChecked(allSelected);
    }, [addableUsers, selectedUsers]);

    const handleSelectAll = useCallback(
      (checked: boolean) => {
        // 检查是否达到最大值
        if (checked && selectedUsers.length >= maxMembers) {
          message.warning(t('space.memberLimitReached', { count: maxMembers }));
          return;
        }

        // 只对可添加成员进行全选操作
        if (checked) {
          // 全选可添加成员，但要考虑最大值限制
          const remainingSlots = maxMembers - selectedUsers.length;
          const usersToAdd = transformUserInfo(
            addableUsers.slice(0, remainingSlots)
          );

          setSelectedUsers(prev => {
            const existingIds = prev.map(u => u.uid);
            const newUsers = usersToAdd.filter(
              user => !existingIds.includes(user.uid)
            );
            return [...prev, ...newUsers];
          });
        } else {
          // 取消全选可添加成员
          const addableUserIds = addableUsers.map(user => user.uid);
          setSelectedUsers(prev =>
            prev.filter(user => !addableUserIds.includes(user.uid))
          );
        }
      },
      [addableUsers, selectedUsers.length, maxMembers, t, transformUserInfo]
    );

    const handleSelectAllChange = useCallback(
      (e: any) => {
        handleSelectAll(e);
      },
      [handleSelectAll]
    );

    const isUserSelected = useCallback(
      (userId: string) => {
        // 已加入成员显示为选中状态，或者在当前选择列表中
        const user = userList.find(u => u.uid === userId);
        return (user && user.status === 1) || selectedUserIds.has(userId);
      },
      [userList, selectedUserIds]
    );

    // 计算复选框是否应该禁用
    const isCheckboxDisabled = useCallback(
      (userId: string) => {
        const isSelected = isUserSelected(userId);
        const user = userList.find(u => u.uid === userId);
        const isExisting = user && user.status !== 0;
        const reachedMaxMembers = selectedUsers.length >= maxMembers;

        return isExisting || (!isSelected && reachedMaxMembers);
      },
      [selectedUsers.length, maxMembers, isUserSelected, userList]
    );

    // 缓存空状态的文本
    const emptyStateText = useMemo(() => {
      return !lastSearchedValue
        ? t('space.searchToAddMembers')
        : t('space.userNotFound', { keyword: lastSearchedValue });
    }, [lastSearchedValue, t]);

    const buttons: ButtonConfig[] = [
      {
        key: 'cancel',
        text: t('space.cancel'),
        type: 'default',
        onClick: () => onClose(),
      },
      {
        key: 'submit',
        text: t('space.confirm'),
        type: 'primary',
        disabled: selectedUsers.length === 0,
        onClick: () => handleSubmit(),
      },
    ];

    return (
      <Modal
        title={t('space.addMember')}
        open={open}
        onCancel={onClose}
        footer={null}
        width={820}
        className={styles.addMemberModal}
        destroyOnClose
        maskClosable={false}
        keyboard={false}
      >
        <div className={styles.modalContent}>
          {/* 左侧：用户搜索和选择 */}
          <div className={styles.leftPanel}>
            <div className={styles.searchSection}>
              <SpaceSearch
                placeholder={t('space.searchUsername')}
                value={searchValue}
                onChange={handleSearch}
                onKeyPress={handleKeyPress}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.userListSection}>
              {userList.length > 1 && (
                <div className={styles.selectAllRow}>
                  <CusCheckBox
                    checked={allChecked}
                    onChange={handleSelectAllChange}
                    className={styles.selectAllCheckbox}
                    disabled={addableUsers.length === 0}
                  >
                    {t('space.selectAll')}
                  </CusCheckBox>
                </div>
              )}

              <div className={styles.userList}>
                {loading ? (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyText}>
                      {t('space.searching')}
                    </span>
                  </div>
                ) : userList.length > 0 ? (
                  userList.map(user => (
                    <UserItem
                      key={user.uid}
                      user={user}
                      isUserSelected={isUserSelected}
                      handleSelectUser={handleSelectUser}
                      checkboxDisabled={isCheckboxDisabled(user.uid)}
                    />
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    <img src={emptyImg} alt="" className={styles.emptyImage} />
                    <span className={styles.emptyText}>{emptyStateText}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：已选用户和角色分配 */}
          <div className={styles.rightPanel}>
            <div className={styles.selectedInfo}>
              {t('space.selected')}
              {selectedUsers.length}
              <span className={styles.maxValue}>
                {t('space.maxValue', { count: maxMembers })}
              </span>
            </div>

            <div className={styles.selectedUsers}>
              {selectedUsers.map(user => (
                <SelectedUserItem
                  key={user.uid}
                  user={user}
                  handleRoleChange={handleRoleChange}
                  handleRemoveUser={handleRemoveUser}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <ButtonGroup buttons={buttons} size="large" />
        </div>
      </Modal>
    );
  }
);

export default AddMemberModal;
