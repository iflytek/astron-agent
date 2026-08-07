import React, { useMemo } from 'react';
import { Modal, Button, message } from 'antd';
import styles from './index.module.scss';
import warningImg from '@/assets/imgs/space/warning.png';

import useOrderStore from '@/store/spark-store/order-store';
import { useSpaceType } from '@/hooks/use-space-type';
import { useEnterprise } from '@/hooks/use-enterprise';
import { useNavigate } from 'react-router-dom';

import { quitEnterprise } from '@/services/enterprise';

interface LeaveTeamModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}

const LeaveTeamModal: React.FC<LeaveTeamModalProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  const navigate = useNavigate();
  const orderType = useOrderStore(state => state.userOrderType);
  const { getJoinedEnterpriseList } = useEnterprise();
  const { handleTeamSwitch, switchToPersonal } = useSpaceType(navigate);
  const infoObj = useMemo(() => {
    const orderTypeText = orderType === 'enterprise' ? '企业' : '团队';
    return {
      type: orderTypeText,
      title: `离开${orderTypeText}`,
      content: `确定离开${orderTypeText}吗？离开后所有资源将归属于${orderTypeText}，自创建的空间所有者将由${orderTypeText}的超级管理员接替。`,
      checkErrMsg: `判断${orderTypeText}是否有另外的超级管理员失败`,
      checkFailMsg: `您是${orderTypeText}唯一超级管理员，暂不支持离开团队`,
      leaveErrMsg: `离开${orderTypeText}失败`,
      leaveSuccessMsg: `离开${orderTypeText}成功`,
    };
  }, [orderType]);

  const handleConfirm = async () => {
    try {
      // 执行离开团队操作
      const leaveRes: any = await quitEnterprise();
      console.log(leaveRes, '----------- leaveRes ------------');

      message.success(leaveRes);
      onClose();
      getJoinedEnterpriseList((joinedList: any) => {
        if (joinedList?.length) {
          handleTeamSwitch(joinedList[0].id);
        } else {
          switchToPersonal();
        }
      });
    } catch (error: any) {
      message.error(error?.msg || error?.desc);
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
