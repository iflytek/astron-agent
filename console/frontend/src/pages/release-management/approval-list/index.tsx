import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Drawer,
  Input,
  Modal,
  Select,
  Table,
  Tag,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  approvePublishApproval,
  cancelPublishApproval,
  getPublishApprovals,
  PublishApproval,
  rejectPublishApproval,
} from '@/services/release-management';

import styles from './index.module.scss';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'gold',
  EXECUTING: 'processing',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELED: 'default',
  EXECUTE_FAILED: 'volcano',
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const formatTime = (value?: string): string => {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
};

const formatJson = (value?: string): string => {
  if (!value) return '-';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

const ApprovalList: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [approvals, setApprovals] = useState<PublishApproval[]>([]);
  const [detail, setDetail] = useState<PublishApproval | null>(null);
  const [pageInfo, setPageInfo] = useState({ page: 1, size: 10 });
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string | undefined>('PENDING');
  const [resourceId, setResourceId] = useState('');

  const canReviewApproval = useCallback(
    (approval: PublishApproval) => approval.canReview === true,
    []
  );

  const canCancelApproval = useCallback(
    (approval: PublishApproval) => approval.canCancel === true,
    []
  );

  const loadApprovals = useCallback(() => {
    setLoading(true);
    getPublishApprovals({
      page: pageInfo.page,
      size: pageInfo.size,
      approvalStatus: status,
      resourceId: resourceId || undefined,
    })
      .then(res => {
        setApprovals(res?.records ?? []);
        setTotal(res?.total ?? 0);
      })
      .catch(err => {
        err?.msg && message.error(err.msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [pageInfo.page, pageInfo.size, resourceId, status]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const openReviewModal = (
    approval: PublishApproval,
    action: 'approve' | 'reject'
  ) => {
    let reviewComment = '';
    Modal.confirm({
      title:
        action === 'approve'
          ? t('releaseManagement.approveApproval')
          : t('releaseManagement.rejectApproval'),
      width: 480,
      content: (
        <Input.TextArea
          rows={4}
          maxLength={512}
          placeholder={t('releaseManagement.reviewComment')}
          onChange={event => {
            reviewComment = event.target.value;
          }}
        />
      ),
      okText: t('releaseManagement.confirm'),
      cancelText: t('releaseModal.cancel'),
      onOk: async () => {
        if (action === 'approve') {
          await approvePublishApproval(approval.id, reviewComment);
          message.success(t('releaseManagement.approveSuccess'));
        } else {
          await rejectPublishApproval(approval.id, reviewComment);
          message.success(t('releaseManagement.rejectSuccess'));
        }
        setDetail(null);
        loadApprovals();
      },
    });
  };

  const cancelApproval = (approval: PublishApproval) => {
    Modal.confirm({
      title: t('releaseManagement.cancelApproval'),
      okText: t('releaseManagement.confirm'),
      cancelText: t('releaseModal.cancel'),
      onOk: async () => {
        await cancelPublishApproval(approval.id);
        message.success(t('releaseManagement.cancelApprovalSuccess'));
        setDetail(null);
        loadApprovals();
      },
    });
  };

  const columns = [
    {
      dataIndex: 'id',
      title: t('releaseManagement.approvalId'),
      width: 100,
    },
    {
      dataIndex: 'resourceId',
      title: t('releaseManagement.agentId'),
      width: 120,
    },
    {
      dataIndex: 'publishType',
      title: t('releaseManagement.platform'),
      width: 130,
    },
    {
      dataIndex: 'approvalStatus',
      title: t('releaseManagement.status'),
      width: 140,
      render: (value: string) => (
        <Tag color={STATUS_COLORS[value] || 'default'}>
          {t(`releaseManagement.approvalStatus.${value}`)}
        </Tag>
      ),
    },
    {
      dataIndex: 'requesterUid',
      title: t('releaseManagement.requester'),
      ellipsis: true,
    },
    {
      dataIndex: 'reviewerUid',
      title: t('releaseManagement.reviewer'),
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    {
      dataIndex: 'createdTime',
      title: t('releaseManagement.applyTime'),
      width: 170,
      render: formatTime,
    },
    {
      dataIndex: 'operation',
      title: t('releaseManagement.operation'),
      width: 220,
      render: (_: unknown, record: PublishApproval) => (
        <span className={styles.actions}>
          <span onClick={() => setDetail(record)}>
            {t('releaseManagement.detail')}
          </span>
          {canReviewApproval(record) && record.approvalStatus === 'PENDING' && (
            <>
              <span onClick={() => openReviewModal(record, 'approve')}>
                {t('releaseManagement.approve')}
              </span>
              <span onClick={() => openReviewModal(record, 'reject')}>
                {t('releaseManagement.reject')}
              </span>
            </>
          )}
          {canCancelApproval(record) && record.approvalStatus === 'PENDING' && (
            <span onClick={() => cancelApproval(record)}>
              {t('releaseManagement.cancelApprovalShort')}
            </span>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className={styles.approvalPage}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <Select
            allowClear
            value={status}
            placeholder={t('releaseManagement.status')}
            style={{ width: 160 }}
            onChange={value => {
              setStatus(value);
              setPageInfo(pre => ({ ...pre, page: 1 }));
            }}
            options={[
              {
                label: t('releaseManagement.approvalStatus.PENDING'),
                value: 'PENDING',
              },
              {
                label: t('releaseManagement.approvalStatus.APPROVED'),
                value: 'APPROVED',
              },
              {
                label: t('releaseManagement.approvalStatus.REJECTED'),
                value: 'REJECTED',
              },
              {
                label: t('releaseManagement.approvalStatus.CANCELED'),
                value: 'CANCELED',
              },
              {
                label: t('releaseManagement.approvalStatus.EXECUTE_FAILED'),
                value: 'EXECUTE_FAILED',
              },
            ]}
          />
          <Input.Search
            allowClear
            value={resourceId}
            placeholder={t('releaseManagement.agentId')}
            onChange={event => setResourceId(event.target.value)}
            onSearch={() => setPageInfo(pre => ({ ...pre, page: 1 }))}
            style={{ width: 220 }}
          />
        </div>
        <Button onClick={loadApprovals}>
          {t('releaseManagement.refresh')}
        </Button>
      </div>

      <Table
        className={approvals.length === 0 ? styles.noData : ''}
        loading={loading}
        dataSource={approvals}
        columns={columns}
        rowKey="id"
        pagination={{
          position: ['bottomCenter'],
          total,
          current: pageInfo.page,
          pageSize: pageInfo.size,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          showTotal: totalCount =>
            `${t('releaseManagement.total')} ${totalCount} ${t(
              'releaseManagement.totalData'
            )}`,
          onChange: (page, size) => setPageInfo({ page, size }),
        }}
      />

      <Drawer
        width={560}
        open={Boolean(detail)}
        title={t('releaseManagement.approvalDetail')}
        extra={
          detail?.approvalStatus === 'PENDING' && (
            <span className={styles.actions}>
              {canReviewApproval(detail) && (
                <>
                  <span onClick={() => openReviewModal(detail, 'approve')}>
                    {t('releaseManagement.approve')}
                  </span>
                  <span onClick={() => openReviewModal(detail, 'reject')}>
                    {t('releaseManagement.reject')}
                  </span>
                </>
              )}
              {canCancelApproval(detail) && (
                <span onClick={() => cancelApproval(detail)}>
                  {t('releaseManagement.cancelApprovalShort')}
                </span>
              )}
            </span>
          )
        }
        onClose={() => setDetail(null)}
      >
        {detail && (
          <div className={styles.detail}>
            <div className={styles.detailGrid}>
              <span>{t('releaseManagement.approvalId')}</span>
              <strong>{detail.id}</strong>
              <span>{t('releaseManagement.agentId')}</span>
              <strong>{detail.resourceId}</strong>
              <span>{t('releaseManagement.platform')}</span>
              <strong>{detail.publishType}</strong>
              <span>{t('releaseManagement.status')}</span>
              <strong>
                {t(`releaseManagement.approvalStatus.${detail.approvalStatus}`)}
              </strong>
              <span>{t('releaseManagement.requester')}</span>
              <strong>{detail.requesterUid}</strong>
              <span>{t('releaseManagement.reviewer')}</span>
              <strong>{detail.reviewerUid || '-'}</strong>
              <span>{t('releaseManagement.applyTime')}</span>
              <strong>{formatTime(detail.createdTime)}</strong>
              <span>{t('releaseManagement.reviewTime')}</span>
              <strong>{formatTime(detail.reviewedTime)}</strong>
            </div>
            <div className={styles.sectionTitle}>
              {t('releaseManagement.publishSnapshot')}
            </div>
            <pre className={styles.jsonBlock}>
              {formatJson(detail.publishSnapshot)}
            </pre>
            <div className={styles.sectionTitle}>
              {t('releaseManagement.executionResult')}
            </div>
            <pre className={styles.jsonBlock}>
              {formatJson(detail.executionResult)}
            </pre>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ApprovalList;
