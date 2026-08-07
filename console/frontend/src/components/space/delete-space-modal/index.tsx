import React from 'react';
import { Modal, message } from 'antd';
import ButtonGroup from '@/components/button-group/button-group';
import type { ButtonConfig } from '@/components/button-group/types';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

import warningImg from '@/assets/imgs/space/warning.png';
import { useSpaceType } from '@/hooks/use-space-type';
import { useNavigate } from 'react-router-dom';
interface DeleteSpaceModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

const DeleteSpaceModal: React.FC<DeleteSpaceModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deleteSpace, spaceId, deleteSpaceCb } = useSpaceType(navigate);

  const handleSubmit = async () => {
    try {
      // Since we removed captcha, pass dummy values for mobile and verifyCode
      // This assumes the backend will be updated to not require these fields
      await deleteSpace({
        spaceId,
        mobile: '',
        verifyCode: '',
      });
      message.success(t('space.deleteSpaceSuccess'));
      deleteSpaceCb();
      onSubmit();
    } catch (error: any) {
      message.error(error?.msg || error?.desc);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const buttons: ButtonConfig[] = [
    {
      key: 'cancel',
      text: t('space.cancel'),
      type: 'default',
      onClick: () => handleClose(),
    },
    {
      key: 'submit',
      text: t('space.confirm'),
      type: 'primary',
      onClick: () => handleSubmit(),
      disabled: false,
    },
  ];

  return (
    <Modal
      title={t('space.deleteSpaceTitle')}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={500}
      className={styles.deleteModal}
      destroyOnClose
      centered
      maskClosable={false}
      keyboard={false}
    >
      <div className={styles.modalContent}>
        <div className={styles.warningSection}>
          <div className={styles.warningIcon}>
            <img src={warningImg} alt="warning" />
          </div>
          <div className={styles.warningText}>
            {t('space.deleteSpaceWarning')}
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.confirmText}>
            {t('space.deleteSpaceConfirm')}
          </div>
        </div>
      </div>

      <div className={styles.modalFooter}>
        <ButtonGroup buttons={buttons} size="large" />
      </div>
    </Modal>
  );
};

export default DeleteSpaceModal;
