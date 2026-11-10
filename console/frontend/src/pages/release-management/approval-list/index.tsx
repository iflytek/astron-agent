import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
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

import { errorText } from '@/pages/agents/errors';
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
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<PublishApproval[]>([]);
  const [detail, setDetail] = useState<PublishApproval | null>(null);
  const [pageInfo, setPageInfo] = useState({ page: 1, size: 10 });
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string | undefined>('PENDING');
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
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
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    getPublishApprovals({
      page: pageInfo.page,
      size: pageInfo.size,
      approvalStatus: status,
      resourceId: resourceId || undefined,
    })
      .then(res => {
        if (currentRequest !== requestId.current) return;
        setApprovals(res?.records ?? []);
        setTotal(res?.total ?? 0);
      })
      .catch(err => {
        if (currentRequest === requestId.current) setError(errorText(err));
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
  }, [pageInfo.page, pageInfo.size, resourceId, status]);

  useEffect(() => {
    loadApprovals();
    return () => {
      requestId.current += 1;
    };
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
        if (!mounted.current) return;
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
        if (!mounted.current) return;
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
          <Button type="link" onClick={() => setDetail(record)}>
            {t('releaseManagement.detail')}
          </Button>
          {canReviewApproval(record) && record.approvalStatus === 'PENDING' && (
            <>
              <Button
                type="link"
                onClick={() => openReviewModal(record, 'approve')}
              >
                {t('releaseManagement.approve')}
              </Button>
              <Button
                type="link"
                onClick={() => openReviewModal(record, 'reject')}
              >
                {t('releaseManagement.reject')}
              </Button>
            </>
          )}
          {canCancelApproval(record) && record.approvalStatus === 'PENDING' && (
            <Button type="link" onClick={() => cancelApproval(record)}>
              {t('releaseManagement.cancelApprovalShort')}
            </Button>
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
            aria-label={t('releaseManagement.status')}
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
            aria-label={t('releaseManagement.agentId')}
            onChange={event => {
              setResourceId(event.target.value);
              setPageInfo(pre => ({ ...pre, page: 1 }));
            }}
            onSearch={() => setPageInfo(pre => ({ ...pre, page: 1 }))}
            style={{ width: 220 }}
          />
        </div>
        <Button onClick={loadApprovals}>
          {t('releaseManagement.refresh')}
        </Button>
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={<Button onClick={loadApprovals}>重试</Button>}
        />
      )}
      <Table
        scroll={{ x: 1100 }}
        locale={{
          emptyText: error ? '审批列表未能加载' : '暂无符合条件的审批',
        }}
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
        width="min(560px, 100vw)"
        open={Boolean(detail)}
        title={t('releaseManagement.approvalDetail')}
        extra={
          detail?.approvalStatus === 'PENDING' && (
            <span className={styles.actions}>
              {canReviewApproval(detail) && (
                <>
                  <Button
                    type="link"
                    onClick={() => openReviewModal(detail, 'approve')}
                  >
                    {t('releaseManagement.approve')}
                  </Button>
                  <Button
                    type="link"
                    onClick={() => openReviewModal(detail, 'reject')}
                  >
                    {t('releaseManagement.reject')}
                  </Button>
                </>
              )}
              {canCancelApproval(detail) && (
                <Button type="link" onClick={() => cancelApproval(detail)}>
                  {t('releaseManagement.cancelApprovalShort')}
                </Button>
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
