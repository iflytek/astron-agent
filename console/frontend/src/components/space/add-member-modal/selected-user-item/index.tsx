import React, { useCallback } from 'react';
import { Select, Avatar, Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import styles from './index.module.scss';
import { useSpaceI18n } from '@/pages/space/hooks/use-space-i18n';
import defaultAvatar from '@/assets/imgs/space/creator.png';

const { Option } = Select;

interface SelectedUser {
  uid: string;
  username?: string;
  avatar?: string;
  role: string;
  nickname?: string;
}

interface SelectedUserItemProps {
  user: SelectedUser;
  handleRoleChange: (userId: string, role: string) => void;
  handleRemoveUser: (userId: string) => void;
}

const SelectedUserItem: React.FC<SelectedUserItemProps> = React.memo(
  ({ user, handleRoleChange, handleRemoveUser }) => {
    const { memberRoleOptions } = useSpaceI18n();
    const handleRoleChangeCallback = useCallback(
      (value: string) => {
        handleRoleChange(user.uid, value);
      },
      [user.uid, handleRoleChange]
    );

    const handleRemoveCallback = useCallback(() => {
      handleRemoveUser(user.uid);
    }, [user.uid, handleRemoveUser]);

    return (
      <div className={classNames(styles.selectedUserItem, styles.userItem)}>
        <Avatar
          icon={<img src={user.avatar || defaultAvatar} alt="" />}
          className={styles.userAvatar}
        />
        <span className={styles.username}>{user.username}</span>
        <Select
          value={`${user.role}`}
          onChange={handleRoleChangeCallback}
          className={styles.roleSelect}
          popupMatchSelectWidth={false}
        >
          {memberRoleOptions
            .filter(option => option.value != null)
            .map(option => (
              <Option key={option.value} value={`${option.value}`}>
                {option.label}
              </Option>
            ))}
        </Select>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={handleRemoveCallback}
          className={styles.removeBtn}
          size="small"
        />
      </div>
    );
  }
);

SelectedUserItem.displayName = 'SelectedUserItem';

export default SelectedUserItem;
