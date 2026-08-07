import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tag, message, Modal } from 'antd';
import SpaceTable, {
  SpaceColumnConfig,
  ActionColumnConfig,
  QueryParams,
  QueryResult,
  SpaceTableRef,
} from '@/components/space/space-table';
import { ButtonConfig } from '@/components/button-group';
import { ModuleType, OperationType } from '@/types/permission';
import SpaceTag from '@/components/space/space-tag';

import styles from './index.module.scss';

import {
  getApllyRecord,
  agreeEnterpriseSpace,
  refuseEnterpriseSpace,
} from '@/services/space';
import { STATUS_THEME_MAP_APPLY, PENDING_STATUS } from '@/pages/space/config';
import { useSpaceI18n } from '@/pages/space/hooks/use-space-i18n';
import { useTranslation } from 'react-i18next';

interface Invitation {
  id: string;
  applyNickname: string;
  status: number;
  applyTime: string;
  avatar?: string;
}

interface ApplyManagementProps {
  spaceId: string;
  searchValue?: string;
  statusFilter?: string;
}

// 数据查询Hook返回类型
interface UseApplyDataReturn {
  queryApply: (params: QueryParams) => Promise<QueryResult<Invitation>>;
  checkId: (id: string) => boolean;
}

// 操作处理Hook返回类型
interface UseApplyActionsReturn {
  handleReject: (invitationId: string, username: string) => void;
  handlePass: (invitationId: string, username: string) => void;
}

// 表格配置Hook返回类型
interface UseApplyTableConfigReturn {
  columns: SpaceColumnConfig<Invitation>[];
  actionColumn: ActionColumnConfig<Invitation>;
}

// 数据查询Hook
const useApplyData = (): UseApplyDataReturn => {
  const { t } = useTranslation();
  // 查询申请数据的函数
  const queryApply = async (
    params: QueryParams
  ): Promise<QueryResult<Invitation>> => {
    // 模拟后端根据参数返回过滤后的数据
    console.log('申请管理 API 请求参数:', {
      current: params.current,
      pageSize: params.pageSize,
      searchValue: params.searchValue,
      statusFilter: params.roleFilter, // 这里使用 roleFilter 传递状态筛选
    });

    try {
      const { current, pageSize, searchValue, roleFilter: status } = params;
      const response = await getApllyRecord({
        pageNum: current,
        pageSize,
        nickname: searchValue,
        status,
      });
      const res = response as unknown as {
        records: Invitation[];
        total: number;
      };

      const { records, total } = res;
      return {
        data: records,
        total,
        success: true,
      };
    } catch (err: unknown) {
      const error = err as { msg?: string; desc?: string };
      console.log(error, '------------- getApplyRecord ------------');
      message.error(error?.msg || error?.desc);
      return {
        data: [],
        total: 0,
        success: false,
      };
    }
  };

  // 校验id是否存在
  const checkId = (id: string): boolean => {
    if (!id) {
      message.warning(t('common.applyIdNotExist'));
      return false;
    }
    return true;
  };

  return {
    queryApply,
    checkId,
  };
};

// 操作处理Hook
const useApplyActions = (
  tableRef: React.RefObject<SpaceTableRef>,
  checkId: (id: string) => boolean
): UseApplyActionsReturn => {
  const { t } = useTranslation();
  const handleReject = (invitationId: string, username: string): void => {
    Modal.confirm({
      title: t('common.confirmReject'),
      content: t('common.confirmRejectUser'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          if (!checkId(invitationId)) {
            return;
          }

          await refuseEnterpriseSpace({ applyId: invitationId });

          message.success(t('common.rejectSuccess'));
          tableRef?.current?.reload();
        } catch (error) {
          message.error(t('common.rejectFailed'));
        }
      },
    });
  };

  const handlePass = (invitationId: string, username: string): void => {
    Modal.confirm({
      title: t('common.confirmApprove'),
      content: t('common.confirmApproveApplication'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        if (!checkId(invitationId)) {
          return;
        }

        try {
          await agreeEnterpriseSpace({ applyId: invitationId });

          message.success(t('common.approveSuccess'));
          tableRef?.current?.reload();
        } catch (error) {
          message.error(t('common.approveFailed'));
        }
      },
    });
  };

  return {
    handleReject,
    handlePass,
  };
};

// 状态标签渲染函数
const renderStatusTag = (
  status: number,
  applyStatusTextMap: Record<string, string>
): React.JSX.Element => {
  const theme =
    STATUS_THEME_MAP_APPLY[
      String(status) as keyof typeof STATUS_THEME_MAP_APPLY
    ];
  return (
    <SpaceTag theme={theme}>
      {applyStatusTextMap[String(status) as keyof typeof applyStatusTextMap]}
    </SpaceTag>
  );
};

// 操作按钮生成函数
const generateActionButtons = (
  invitation: Invitation,
  handleReject: (invitationId: string, username: string) => void,
  handlePass: (invitationId: string, username: string) => void,
  t: (key: string) => string
): ButtonConfig[] => {
  if (invitation.status !== Number(PENDING_STATUS)) {
    return [];
  }

  return [
    {
      key: 'reject',
      text: t('common.reject'),
      type: 'link',
      size: 'small',
      permission: {
        module: ModuleType.SPACE,
        operation: OperationType.APPLY_MANAGE,
      },
      onClick: () => handleReject(invitation.id, invitation.applyNickname),
    },
    {
      key: 'pass',
      text: t('common.approve'),
      type: 'link',
      size: 'small',
      permission: {
        module: ModuleType.SPACE,
        operation: OperationType.APPLY_MANAGE,
      },
      onClick: () => handlePass(invitation.id, invitation.applyNickname),
    },
  ];
};

// 表格配置Hook
const useApplyTableConfig = (
  applyStatusTextMap: Record<string, string>,
  handleReject: (invitationId: string, username: string) => void,
  handlePass: (invitationId: string, username: string) => void
): UseApplyTableConfigReturn => {
  const { t } = useTranslation();
  const getStatusTag = useCallback(
    (status: number) => renderStatusTag(status, applyStatusTextMap),
    [applyStatusTextMap]
  );

  const getActionButtons = useCallback(
    (invitation: Invitation) =>
      generateActionButtons(invitation, handleReject, handlePass, t),
    [handleReject, handlePass, t]
  );

  // 列配置
  const columns: SpaceColumnConfig<Invitation>[] = [
    {
      title: t('common.username'),
      dataIndex: 'applyNickname',
      key: 'applyNickname',
      render: (text: string, record: Invitation) => (
        <div className={styles.usernameCell}>
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: t('common.applyTime'),
      dataIndex: 'createTime',
      key: 'createTime',
      render: (text: string) => <span className={styles.joinTime}>{text}</span>,
    },
    {
      title: t('common.applyStatus'),
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => getStatusTag(status),
    },
  ];

  // 操作列配置
  const actionColumn: ActionColumnConfig<Invitation> = {
    title: t('common.action'),
    width: 200,
    getActionButtons: (record: Invitation) => getActionButtons(record),
  };

  return {
    columns,
    actionColumn,
  };
};

const ApplyManagement: React.FC<ApplyManagementProps> = ({
  spaceId,
  searchValue: externalSearchValue = '',
  statusFilter: externalStatusFilter = 'all',
}) => {
  const tableRef = useRef<SpaceTableRef>(null);
  const { applyStatusTextMap } = useSpaceI18n();

  // 使用自定义 Hooks
  const { queryApply, checkId } = useApplyData();
  const { handleReject, handlePass } = useApplyActions(tableRef, checkId);
  const { columns, actionColumn } = useApplyTableConfig(
    applyStatusTextMap,
    handleReject,
    handlePass
  );

  return (
    <div className={styles.invitationManagement}>
      <SpaceTable<Invitation>
        ref={tableRef}
        queryData={queryApply}
        columns={columns}
        actionColumn={actionColumn}
        rowKey="id"
        extraParams={{
          spaceId,
          searchValue: externalSearchValue,
          roleFilter: externalStatusFilter,
        }}
        className={styles.invitationTable}
      />
    </div>
  );
};

export default ApplyManagement;
