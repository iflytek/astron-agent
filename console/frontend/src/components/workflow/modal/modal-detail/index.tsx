import useAntModal from '@/hooks/use-ant-modal';
import { forwardRef, useImperativeHandle, useState } from 'react';

import { Modal, Table } from 'antd';
import { RpaParameter, RpaRobot } from '@/types/rpa';
import { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

export const ModalDetail = forwardRef<{
  showModal: (values?: RpaRobot) => void;
}>((_, ref) => {
  const { t } = useTranslation();
  const [currentRobot, setCurrentRobot] = useState<RpaRobot | null>(null);
  useImperativeHandle(ref, () => ({
    showModal: (values): void => {
      setCurrentRobot(values || null);
      showModal();
    },
  }));
  const { commonAntModalProps, showModal } = useAntModal();
  const inColumns: ColumnsType<RpaParameter> = [
    {
      title: t('rpa.parameterName'),
      dataIndex: 'varName',
      width: 160,
    },

    {
      title: t('rpa.parameterDescription'),
      dataIndex: 'varDescribe',
    },
    {
      title: t('rpa.parameterType'),
      dataIndex: 'type',
      width: 100,
    },
    {
      title: t('rpa.defaultValue'),
      dataIndex: 'varValue',
      width: 100,
    },
  ];
  const outColumns: ColumnsType<RpaParameter> = [
    {
      title: t('rpa.parameterName'),
      dataIndex: 'varName',
    },
    {
      title: t('rpa.parameterDescription'),
      dataIndex: 'varDescribe',
    },
    {
      title: t('rpa.parameterType'),
      dataIndex: 'type',
    },
  ];

  return (
    <Modal
      zIndex={9999}
      {...commonAntModalProps}
      footer={null}
      title={currentRobot?.name}
      maskClosable
    >
      <div className="pt-[24px]">
        <div className="pb-[20px]">{t('rpa.inputParameter')}</div>
        <Table
          dataSource={(currentRobot?.parameters || []).filter(
            item => item.varDirection === 0
          )}
          columns={inColumns}
          className="document-table"
          pagination={false}
        ></Table>
        <div className="py-[20px]">{t('rpa.outputParameter')}</div>
        <Table
          dataSource={(currentRobot?.parameters || []).filter(
            item => item.varDirection === 1
          )}
          columns={outColumns}
          className="document-table"
          pagination={false}
        ></Table>
      </div>
    </Modal>
  );
});
