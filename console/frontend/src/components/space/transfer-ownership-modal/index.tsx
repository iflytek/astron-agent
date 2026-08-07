import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Input, Button, Select, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import ButtonGroup from '@/components/button-group/button-group';
import type { ButtonConfig } from '@/components/button-group/types';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

import { getEnterpriseSpaceMemberList, transferSpace } from '@/services/space';
import { useSpaceI18n } from '@/pages/space/hooks/use-space-i18n';

const { Option } = Select;

interface Member {
  id: string;
  username: string;
  role: string;
  roleText: string;
}

interface TransferOwnershipModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: { memberId: string }) => void;
  onSuccess?: () => void;
}

const TransferOwnershipModal: React.FC<TransferOwnershipModalProps> = ({
  open,
  onClose,
  onSubmit,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberList, setMemberList] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { memberRoleOptions } = useSpaceI18n();

  const roleMap = useMemo(() => {
    return memberRoleOptions.reduce(
      (acc, curr) => {
        acc[curr.value] = curr.label;
        return acc;
      },
      {} as Record<string, string>
    );
  }, [memberRoleOptions]);

  useEffect(() => {
    if (open) {
      loadMembers();
    }
  }, [open]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const res: any = await getEnterpriseSpaceMemberList();
      console.log(res, '------------ getEnterpriseSpaceMemberList -----------');
      const members = (res || []).map((item: any) => {
        const { uid, nickname, role } = item;
        return { id: uid, username: nickname, role };
      });
      setMemberList(members);
    } catch (error: any) {
      message.error(error?.msg || error?.desc);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberChange = (value: string) => {
    setSelectedMemberId(value);
  };

  const handleSubmit = async () => {
    if (!selectedMemberId) {
      message.warning(t('space.transferOwnershipSelectMember'));
      return;
    }

    try {
      const res = await transferSpace({ uid: selectedMemberId });
      console.log(res, '------------ transferSpace -----------');
      message.success(t('space.transferOwnershipSuccess'));
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      message.error(err?.msg || err?.desc);
    }
  };

  const handleClose = () => {
    setSelectedMemberId('');
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
      disabled: !selectedMemberId,
    },
  ];

  return (
    <Modal
      title={t('space.transferOwnershipTitle')}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={500}
      className={styles.transferModal}
      destroyOnClose
      centered
      maskClosable={false}
      keyboard={false}
    >
      <div className={styles.modalContent}>
        <div className={styles.warningText}>
          {t('space.transferOwnershipWarning')}
        </div>

        <div className={styles.formSection}>
          <div className={styles.formLabel}>
            {t('space.transferOwnershipLabel')}
          </div>
          <Select
            placeholder={t('space.transferOwnershipPlaceholder')}
            value={selectedMemberId}
            onChange={handleMemberChange}
            className={styles.memberSelect}
            loading={loading}
            showSearch
            filterOption={(input, option) =>
              (option?.children as unknown as string)
                ?.toLowerCase()
                .includes(input.toLowerCase())
            }
          >
            {memberList.map(member => (
              <Option key={member.id} value={member.id}>
                <div className={styles.memberOption}>
                  <UserOutlined className={styles.memberIcon} />
                  <span className={styles.memberName}>{member.username}</span>
                  <span className={styles.memberRole}>
                    ({roleMap[member.role]})
                  </span>
                </div>
              </Option>
            ))}
          </Select>
        </div>
      </div>

      <div className={styles.modalFooter}>
        <ButtonGroup buttons={buttons} size="large" />
      </div>
    </Modal>
  );
};

export default TransferOwnershipModal;
