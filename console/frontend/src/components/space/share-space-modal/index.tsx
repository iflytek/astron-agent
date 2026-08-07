import React from 'react';
import { Modal } from 'antd';

interface ShareSpaceModalProps {
  open: boolean;
  onClose: () => void;
  spaceInfo: any;
}
//本期不做
export const ShareSpaceModal: React.FC<ShareSpaceModalProps> = ({
  open,
  onClose,
  spaceInfo,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered
      title="分享空间"
      footer={null}
    >
      <div>xxx邀请你加入工作空间</div>
      <img src={spaceInfo.avatarUrl} alt="" />
      <div>邀请链接</div>
      <div>邀请链接</div>
      <div>邀请链接</div>
    </Modal>
  );
};
