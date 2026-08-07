import React, { useCallback, useMemo } from 'react';
import { Avatar } from 'antd';
import classNames from 'classnames';
import CusCheckBox from '../cus-check-box';
import styles from './index.module.scss';
import defaultAvatar from '@/assets/imgs/space/creator.png';
import { useTranslation } from 'react-i18next';
interface User {
  uid: string;
  username?: string;
  mobile: string;
  avatar?: string;
  status?: number;
  nickname?: string;
}
interface UserItemProps {
  user: User;
  isUserSelected: (userId: string) => boolean;
  handleSelectUser: (user: User, checked: boolean) => void;
  checkboxDisabled: boolean;
}

const UserItem: React.FC<UserItemProps> = React.memo(
  ({ user, isUserSelected, handleSelectUser, checkboxDisabled }) => {
    const { t } = useTranslation();
    // 根据用户status判断状态
    const isExisting = useMemo(() => user.status === 1, [user.status]);
    const isInvited = useMemo(() => user.status === 2, [user.status]);

    const userItemClassName = useMemo(
      () =>
        classNames(
          styles.userItem,
          isUserSelected(user.uid) && styles.selected,
          (isExisting || isInvited) && styles.existing
        ),
      [user.uid, isUserSelected, isExisting, isInvited]
    );

    const userStatus = useMemo(() => {
      if (isInvited) {
        return t('space.invited');
      }
      if (isExisting) {
        return t('space.joined');
      }
      return '';
    }, [isInvited, isExisting, t]);

    const handleCheckboxChange = useCallback(
      (checked: boolean) => {
        handleSelectUser(user, checked);
      },
      [user, handleSelectUser]
    );

    // 处理整个用户项的点击事件
    const handleUserItemClick = useCallback(
      (e: React.MouseEvent) => {
        // 如果点击的是复选框本身，不处理（避免重复触发）
        if ((e.target as HTMLElement).closest('[data-checkbox]')) {
          return;
        }

        // 如果是已存在的成员或复选框被禁用，不处理
        if (checkboxDisabled || isExisting) {
          return;
        }

        // 切换选中状态
        const currentSelected = isUserSelected(user.uid);
        handleSelectUser(user, !currentSelected);
      },
      [user, handleSelectUser, checkboxDisabled, isExisting, isUserSelected]
    );

    return (
      <div className={userItemClassName} onClick={handleUserItemClick}>
        <div data-checkbox>
          <CusCheckBox
            checked={isUserSelected(user.uid)}
            disabled={checkboxDisabled}
            onChange={handleCheckboxChange}
          />
        </div>
        <Avatar
          icon={<img src={user.avatar || defaultAvatar} alt="" />}
          className={styles.userAvatar}
        />
        <span className={styles.username}>{user.username}</span>
        <span className={styles.existingLabel}>{userStatus}</span>
      </div>
    );
  }
);

UserItem.displayName = 'UserItem';

export default UserItem;
