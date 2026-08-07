import React, { memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import back from '@/assets/imgs/common/back.png';
import { useNavigate } from 'react-router-dom';
import { Spin, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useRpaDetail } from './hooks/use-rpa-detail';

import { RpaRobot } from '@/types/rpa';
import dayjs from 'dayjs';
import { ModalDetail } from '@/components/workflow/modal/modal-detail';
import { ModalRpaRun } from '@/components/workflow/modal/modal-rpa-run';

export const RpaDetail = () => {
  const { t } = useTranslation();
  const { rpaDetail, loading } = useRpaDetail();
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
      width: 200,
      ellipsis: true,
      render: (_, record) => {
        return (
          <div className="flex items-center">
            <img
              src={record.icon}
              className="w-[28px] h-[28px] rounded-lg"
              alt=""
            />
            <div className="flex-1 pl-[12px] truncate max-w-[166px]">
              {record.name}
            </div>
          </div>
        );
      },
    },
    {
      title: t('rpa.description'),
      dataIndex: 'description',
    },
    {
      title: t('rpa.parameters'),
      dataIndex: 'parameters',
      width: 80,
      render: (_, record) => {
        return (
          <div
            className="text-[#6356EA] cursor-pointer"
            onClick={() => modalDetailRef.current?.showModal(record)}
          >
            {t('rpa.detail')}
          </div>
        );
      },
    },
    {
      title: t('rpa.operation'),
      dataIndex: 'operation',
      width: 80,
      render: (_, record) => {
        return (
          <div
            className="text-[#275EFF] cursor-pointer"
            onClick={() =>
              modalRpaRunRef.current?.showModal({
                ...record,
                apiKey: rpaDetail?.fields?.apiKey,
              })
            }
          >
            {t('rpa.run')}
          </div>
        );
      },
    },
  ];
  return (
    <div className="w-full h-full  flex flex-col">
      <BackButton className="px-6" />
      {loading ? (
        <div className="flex justify-center items-center mx-6 flex-1  my-[24px] bg-[#fff] rounded-2xl px-[24px] py-[24px]">
          <Spin />
        </div>
      ) : (
        <div className="flex flex-col mx-6 flex-1  my-[24px] bg-[#fff] rounded-2xl px-[24px] py-[24px]">
          <div className="w-full flex justify-between items-center">
            <div className="flex">
              <img
                className="w-[62px] h-[62px]"
                src={rpaDetail?.icon}
                alt="rpa"
              />
              <div className="pl-[24px]">
                <div className="text-2xl font-medium">
                  {rpaDetail?.assistantName}
                </div>
                <div className="text-sm text-[#7F7F7F] pt-[12px]">
                  {rpaDetail?.userName}
                </div>
              </div>
            </div>
            <div className="text-sm text-[#7F7F7F] pb-[16px]">
              {t('rpa.updateTime')}
              {dayjs(rpaDetail?.updateTime).format('YYYY-MM-DD HH:mm:ss')}
            </div>
          </div>
          <div className="w-full text-[#7F7F7F]  pt-[12px] ">
            {rpaDetail?.remarks}
          </div>
          <div className="w-full pt-[32px] pb-[12px]">
            {t('rpa.robotResourceList')}
          </div>
          <div className="h-[400px]">
            <Table
              dataSource={rpaDetail?.robots}
              className="document-table"
              columns={columns}
              rowKey="project_id"
              style={{ overflow: 'auto' }}
              pagination={false}
            ></Table>
          </div>
        </div>
      )}
      <ModalDetail ref={modalDetailRef} />
      <ModalRpaRun ref={modalRpaRunRef} />
    </div>
  );
};

const BackButton: React.FC<{ className?: string }> = memo(({ className }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleBack = (): void => navigate(-1);

  return (
    <button
      className={`flex items-center gap-2 mt-6 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      onClick={handleBack}
      type="button"
    >
      <img src={back} className="w-[18px] h-[18px]" alt="back" />
      <div className="mr-1 font-medium text-4">{t('rpa.back')}</div>
    </button>
  );
});

export default RpaDetail;
