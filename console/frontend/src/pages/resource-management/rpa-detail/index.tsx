import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Empty, Skeleton, Table } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { useRpaDetail } from './hooks/use-rpa-detail';
import { RpaRobot } from '@/types/rpa';
import dayjs from 'dayjs';
import { ModalDetail } from '@/components/workflow/modal/modal-detail';
import { ModalRpaRun } from '@/components/workflow/modal/modal-rpa-run';
import { resourceStyles as styles } from '../knowledge-page/resource-surface';
export const RpaDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { rpaDetail, loading, error, refresh } = useRpaDetail();
  const modalDetailRef = useRef<{ showModal: (values?: RpaRobot) => void }>(
    null
  );
  const modalRpaRunRef = useRef<{ showModal: (values?: RpaRobot) => void }>(
    null
  );
  const columns: ColumnsType<RpaRobot> = [
    {
      title: t('rpa.robotName'),
      dataIndex: 'name',
      width: 220,
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <img src={record.icon} className="w-7 h-7 rounded-lg" alt="" />
          <span className="break-words">{record.name}</span>
        </div>
      ),
    },
    { title: t('rpa.description'), dataIndex: 'description', width: 320 },
    {
      title: t('rpa.parameters'),
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => modalDetailRef.current?.showModal(record)}
        >
          {t('rpa.detail')}
        </Button>
      ),
    },
    {
      title: t('rpa.operation'),
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          onClick={() =>
            modalRpaRunRef.current?.showModal({
              ...record,
              assistantId: rpaDetail?.id,
            })
          }
        >
          {t('rpa.run')}
        </Button>
      ),
    },
  ];
  return (
    <main className={styles.detail}>
      <div className="flex justify-between gap-3 flex-wrap">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/resource/rpa')}
        >
          返回 RPA
        </Button>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={refresh}>
          刷新
        </Button>
      </div>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={<Button onClick={refresh}>重试</Button>}
        />
      )}
      {loading ? (
        <Skeleton active />
      ) : (
        rpaDetail && (
          <section className={styles.panel}>
            <header className={styles.heading}>
              <div>
                <h1>{rpaDetail.assistantName}</h1>
                <p>{rpaDetail.userName}</p>
              </div>
              {rpaDetail.icon && (
                <img
                  src={rpaDetail.icon}
                  className="w-12 h-12 rounded-lg"
                  alt=""
                />
              )}
            </header>
            <p className="text-[#526580] break-words mb-4">
              {rpaDetail.remarks || '暂无说明'}
            </p>
            {rpaDetail.updateTime && (
              <p className="text-sm text-[#607089] mb-6">
                {t('rpa.updateTime')}{' '}
                {dayjs(rpaDetail.updateTime).format('YYYY-MM-DD HH:mm:ss')}
              </p>
            )}
            <h2 className="font-semibold text-base mb-4">
              {t('rpa.robotResourceList')}
            </h2>
            <Table
              dataSource={rpaDetail.robots}
              columns={columns}
              rowKey="project_id"
              scroll={{ x: 740 }}
              pagination={false}
              locale={{
                emptyText: (
                  <Empty description="暂无机器人资源，可刷新获取最新数据。" />
                ),
              }}
            />
          </section>
        )
      )}
      <ModalDetail ref={modalDetailRef} />
      <ModalRpaRun ref={modalRpaRunRef} />
    </main>
  );
};
export default RpaDetail;
