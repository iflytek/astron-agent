import { shouldShowRequestError } from '@/utils/http-error';
import React, { useMemo } from 'react';
import { Modal, Button, message } from 'antd';
import styles from './index.module.scss';
import warningImg from '@/assets/imgs/space/warning.png';

import useOrderStore from '@/store/spark-store/order-store';
import { useSpaceType } from '@/hooks/use-space-type';
import { useEnterprise } from '@/hooks/use-enterprise';
import { useNavigate } from 'react-router-dom';

import { quitEnterprise } from '@/services/enterprise';
import eventBus from '@/utils/event-bus';

interface LeaveTeamModalProps {
  open: boolean;
  onClose: () => void;
}

const LeaveTeamModal: React.FC<LeaveTeamModalProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const orderType = useOrderStore(state => state.userOrderType);
  const { getJoinedEnterpriseList } = useEnterprise();
  const { handleTeamSwitch, switchToPersonal } = useSpaceType(navigate);
  const infoObj = useMemo(() => {
    const orderTypeText = orderType === 'enterprise' ? '企业' : '团队';
    return {
      title: `离开${orderTypeText}`,
      content: `离开后将失去对${orderTypeText}及其空间的访问权限。请先转让您拥有的空间。`,
      leaveErrMsg: `离开${orderTypeText}失败`,
      leaveSuccessMsg: `离开${orderTypeText}成功`,
    };
  }, [orderType]);

  const handleConfirm = async () => {
    try {
      // 执行离开团队操作
      await quitEnterprise();

      message.success(infoObj.leaveSuccessMsg);
      onClose();
      eventBus.emit('spaceList');
      getJoinedEnterpriseList((joinedList: any) => {
        if (joinedList?.length) {
          handleTeamSwitch(joinedList[0].id);
        } else {
          switchToPersonal();
        }
      });
    } catch (error: any) {
      shouldShowRequestError(error) &&
        message.error(error?.msg || error?.desc || infoObj.leaveErrMsg);
    }
  };

  return (
    <Modal
      title={infoObj.title}
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      className={styles.leaveModal}
      maskClosable={false}
      destroyOnClose
      centered
    >
      <div className={styles.modalContent}>
        <div className={styles.warningSection}>
          <div className={styles.warningIcon}>
            <img src={warningImg} alt="warning" />
          </div>
          <div className={styles.warningText}>{infoObj.content}</div>
        </div>
      </div>

      <div className={styles.modalFooter}>
        <Button onClick={onClose} className={styles.cancelBtn}>
          取消
        </Button>
        <Button
          type="primary"
          danger
          onClick={handleConfirm}
          className={styles.confirmBtn}
        >
          确认
        </Button>
      </div>
    </Modal>
  );
};

export default LeaveTeamModal;
