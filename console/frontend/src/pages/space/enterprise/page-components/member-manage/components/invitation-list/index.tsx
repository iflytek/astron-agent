import React, {
  useCallback,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { message, Modal, Tag } from 'antd';
import SpaceTable, {
  SpaceColumnConfig,
  ActionColumnConfig,
  QueryParams,
  QueryResult,
  SpaceTableRef,
} from '@/components/space/space-table';
import { ButtonConfig } from '@/components/button-group';
import SpaceTag from '@/components/space/space-tag';
import {
  getEnterpriseInviteList,
  revokeEnterpriseInvite,
} from '@/services/enterprise';
import { STATUS_THEME_MAP_INVITE, PENDING_STATUS } from '@/pages/space/config';
import { useSpaceI18n } from '@/pages/space/hooks/use-space-i18n';
import { useTranslation } from 'react-i18next';

interface InvitationData {
  id: string;
  inviterUid: string;
  inviteeNickname: string;
  createTime: string;
  status: number;
}

interface InvitationListProps {
  searchValue: string;
  statusFilter: string;
}

export interface InvitationListRef {
  reload: () => void;
}

const InvitationList = forwardRef<InvitationListRef, InvitationListProps>(
  ({ searchValue, statusFilter }, ref) => {
    const tableRef = useRef<SpaceTableRef>(null);
    const { invitationStatusTextMap } = useSpaceI18n();
    const { t } = useTranslation();
    // 模拟查询邀请数据的函数
    const queryInvitationData = useCallback(
      async (params: QueryParams): Promise<QueryResult<InvitationData>> => {
        // 模拟后端根据参数返回过滤后的数据
        console.log('邀请管理 API 请求参数:', {
          current: params.current,
          pageSize: params.pageSize,
          searchValue: params.searchValue,
          statusFilter: params.roleFilter, // 这里使用 roleFilter 传递状态筛选
        });

        try {
          const {
            current: pageNum,
            pageSize,
            searchValue,
            roleFilter: status,
          } = params;
          const res: any = await getEnterpriseInviteList({
            pageNum,
            pageSize,
            nickname: searchValue,
            status,
          });

          const { records, total } = res;
          return {
            data: records,
            total,
            success: true,
          };
        } catch (err: any) {
          console.log(
            err,
            '------------- getEnterpriseInviteList -------------'
          );

          message.error(err?.msg || err?.desc);

          return {
            data: [],
            total: 0,
            success: false,
          };
        }
      },
      []
    );

    useImperativeHandle(ref, () => ({
      reload: () => {
        tableRef.current?.reload();
      },
    }));

    // 获取状态标签
    const getStatusTag = useCallback(
      (status: number) => {
        const key = String(status) as keyof typeof STATUS_THEME_MAP_INVITE;
        const theme = STATUS_THEME_MAP_INVITE[key];
        return (
          <SpaceTag theme={theme}>{invitationStatusTextMap[key]}</SpaceTag>
        );
      },
      [invitationStatusTextMap]
    );

    // 列配置
    const columns: SpaceColumnConfig<InvitationData>[] = useMemo(
      () => [
        {
          title: t('common.username'),
          dataIndex: 'inviteeNickname',
          key: 'inviteeNickname',
          width: 200,
        },
        {
          title: t('space.invitationStatus'),
          dataIndex: 'status',
          key: 'status',
          width: 120,
          render: (status: number) => getStatusTag(status),
        },
        {
          title: t('space.joinTime'),
          dataIndex: 'createTime',
          key: 'createTime',
          width: 180,
        },
      ],
      [getStatusTag, t]
    );

    // 处理重发邀请
    const handleResend = useCallback(
      (record: InvitationData) => {
        message.success(
          t('common.invitationResentToUser', {
            username: record.inviteeNickname,
          })
        );
      },
      [t]
    );

    // 处理取消邀请
    const handleCancel = useCallback(
      async (record: InvitationData) => {
        try {
          await revokeEnterpriseInvite({ inviteId: record.id });

          message.success(t('space.revokeSuccess'));
        } catch (err: any) {
          message.error(err?.msg || err?.desc);
        } finally {
          tableRef.current?.reload();
        }
      },
      [t]
    );

    // 处理删除邀请记录
    const handleDelete = useCallback(
      (record: InvitationData) => {
        message.success(
          t('common.invitationRecordDeleted', {
            username: record.inviteeNickname,
          })
        );
      },
      [t]
    );

    // 操作列配置
    const actionColumn: ActionColumnConfig<InvitationData> = useMemo(
      () => ({
        title: t('space.operation'),
        width: 100,
        getActionButtons: (record: InvitationData) => {
          if (record.status !== Number(PENDING_STATUS)) {
            return [];
          }

          const buttons: ButtonConfig[] = [
            {
              key: 'cancel',
              text: t('space.revoke'),
              type: 'link',
              onClick: () => {
                Modal.confirm({
                  title: t('space.confirmRevoke'),
                  content: t('space.confirmRevokeInvitation', {
                    nickname: record.inviteeNickname,
                  }),
                  okText: t('space.confirm'),
                  cancelText: t('space.cancel'),
                  onOk: () => handleCancel(record),
                });
              },
            },
          ];

          return buttons;
        },
      }),
      [handleResend, handleCancel, handleDelete, t]
    );

    return (
      <SpaceTable<InvitationData>
        ref={tableRef}
        queryData={queryInvitationData}
        columns={columns}
        actionColumn={actionColumn}
        extraParams={{
          searchValue,
          roleFilter: statusFilter,
        }}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => t('space.totalDataCount', { total }),
          pageSizeOptions: ['10', '20', '50'],
        }}
      />
    );
  }
);

export default InvitationList;
