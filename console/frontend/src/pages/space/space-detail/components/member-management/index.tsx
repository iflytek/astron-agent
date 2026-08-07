import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Select, message, Modal } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSpaceI18n } from '@/pages/space/hooks/use-space-i18n';
import SpaceTable, {
  SpaceColumnConfig,
  ActionColumnConfig,
  QueryParams,
  QueryResult,
  SpaceTableRef,
} from '@/components/space/space-table';
import { ButtonConfig } from '@/components/button-group';
import { ModuleType, OperationType } from '@/types/permission';
import { usePermissions } from '@/hooks/use-permissions';
import useUserStore from '@/store/user-store';

import styles from './index.module.scss';
import {
  getSpaceMemberList,
  updateUserRole,
  deleteUser,
} from '@/services/space';

import {
  OWNER_ROLE,
  roleToRoleType,
  roleTypeToRole,
} from '@/pages/space/config';

const { Option } = Select;

interface Member {
  id: string;
  nickname: string;
  role: string;
  createTime: string;
  avatar?: string;
  uid: number;
}

interface MemberManagementProps {
  spaceId: string;
  searchValue?: string;
  roleFilter?: string;
}

const MemberManagement: React.FC<MemberManagementProps> = ({
  spaceId,
  searchValue: externalSearchValue = '',
  roleFilter: externalRoleFilter = 'all',
}) => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const { roleTextMap, memberRoleOptions } = useSpaceI18n();
  const permissionInfo = usePermissions();
  const tableRef = useRef<SpaceTableRef>(null);

  // 查询成员数据的函数
  const queryMembers = async (
    params: QueryParams
  ): Promise<QueryResult<Member>> => {
    try {
      const { current, pageSize, searchValue, roleFilter } = params;
      const res: any = await getSpaceMemberList({
        nickname: searchValue || '',
        pageNum: current,
        pageSize: pageSize,
        role: Number(roleTypeToRole(roleFilter)),
      });

      return {
        data: res?.records || [],
        total: res?.total || 0,
        success: true,
      };
    } catch (error: any) {
      message.error(error?.msg || error?.desc);
      return {
        data: [],
        total: 0,
        success: false,
      };
    }
  };

  const handleDeleteMember = (uid: number, username: string) => {
    Modal.confirm({
      title: t('space.confirmDelete'),
      content: t('space.confirmDeleteMember', { username }),
      okText: t('space.confirm'),
      cancelText: t('space.cancel'),
      onOk: async () => {
        try {
          // 模拟API调用
          await deleteUser({ uid: uid });
          tableRef.current?.reload();
          message.success(t('space.deleteSuccess'));
        } catch (error: any) {
          message.error(error?.msg || error?.desc);
        }
      },
    });
  };

  const handleRoleChange = async (uid: number, newRole: string) => {
    try {
      await updateUserRole({ uid: uid, role: Number(newRole) });
      message.success(t('space.roleUpdateSuccess'));

      // 判断如果是操作自己，则刷新页面
      if (Number(uid) === Number(user?.uid)) {
        window.location.reload();
      } else {
        // 刷新表格数据
        tableRef.current?.reload();
      }
    } catch (error: any) {
      message.error(error?.msg || error?.desc);
    }
  };

  // 获取角色文本
  const getRoleText = useCallback(
    (role: string) => {
      return (
        roleTextMap[roleToRoleType(Number(role)) as keyof typeof roleTextMap] ||
        role
      );
    },
    [roleTextMap]
  );

  // 获取成员操作按钮配置
  const getMemberActionButtons = (member: Member): ButtonConfig[] => {
    // 权限控制：
    // - owner(1) 可以删除 admin(2) 和 member(3)
    // - admin(2) 可以删除 member(3)
    // - member(3) 不能删除任何人
    const buttons: ButtonConfig[] = [
      {
        key: 'delete',
        text: t('space.delete'),
        type: 'link',
        size: 'small',
        // danger: true,
        permission: {
          module: ModuleType.SPACE,
          operation: OperationType.ADD_MEMBERS,
          customCheck: () => {
            return !!(
              member.role != OWNER_ROLE &&
              permissionInfo?.checks.canRemoveMembers(ModuleType.SPACE) &&
              !permissionInfo?.checks.canDeleteResource(
                ModuleType.SPACE,
                `${member.uid}`
              )
            );
          },
        },
        onClick: () => handleDeleteMember(member.uid, member.nickname),
      },
    ];

    return buttons;
  };

  // 列配置
  const columns: SpaceColumnConfig<Member>[] = [
    {
      title: t('space.username'),
      dataIndex: 'nickname',
      key: 'nickname',
      render: (text: string, record: Member) => (
        <div className={styles.usernameCell}>
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: t('space.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string, record: Member) => {
        const showText =
          role == OWNER_ROLE ||
          !permissionInfo?.checks.hasModulePermission(
            ModuleType.SPACE,
            OperationType.MODIFY_MEMBER_PERMISSIONS
          );

        if (showText) {
          return <span className={styles.roleText}>{getRoleText(role)}</span>;
        }

        return (
          <Select
            value={role}
            onChange={value => handleRoleChange(record.uid, value)}
            className={styles.roleSelect}
            popupMatchSelectWidth={false}
          >
            {memberRoleOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: t('space.joinTime'),
      dataIndex: 'createTime',
      key: 'createTime',
      render: (text: string) => (
        <span className={styles.createTime}>{text}</span>
      ),
    },
  ];

  // 操作列配置
  const actionColumn: ActionColumnConfig<Member> = {
    title: t('space.operation'),
    width: 200,
    getActionButtons: (record: Member) => getMemberActionButtons(record),
  };

  return (
    <div className={styles.memberManagement}>
      <SpaceTable<Member>
        ref={tableRef}
        queryData={queryMembers}
        columns={columns}
        actionColumn={actionColumn}
        rowKey="id"
        extraParams={{
          spaceId,
          searchValue: externalSearchValue,
          roleFilter: externalRoleFilter,
        }}
        className={styles.memberTable}
      />
    </div>
  );
};

export default MemberManagement;
