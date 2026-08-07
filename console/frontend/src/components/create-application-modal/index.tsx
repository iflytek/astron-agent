import React, { useEffect, useState } from 'react';
import { Modal, Form, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getLanguageCode } from '@/utils/http';
import AgentCreationModal from '@/components/agent-creation';
import MakeCreateModal from '@/components/make-creation';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';
import classNames from 'classnames';
import VirtualConfig from '../virtual-config-modal';
import { createTalkAgent } from '@/services/spark-common';
interface HeaderFeedbackModalProps {
  visible: boolean;
  onCancel: () => void;
}

const HeaderFeedbackModal: React.FC<HeaderFeedbackModalProps> = ({
  visible,
  onCancel,
}) => {
  const { t } = useTranslation();
  const languageCode = getLanguageCode();
  const navigate = useNavigate();
  const [makeModalVisible, setMakeModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [selectedBox, setSelectedBox] = useState('');
  const [AgentCreationModalVisible, IntelligentModalVisible] =
    useState<boolean>(false); //智能体创建
  const [virtualModal, setVirtualModal] = useState<boolean>(false); //虚拟人创建
  const handleBoxClick = (boxName: string): void => {
    setSelectedBox(boxName);
    if (boxName === 'cueWord') {
      IntelligentModalVisible(true);
    } else if (boxName === 'workflow') {
      setMakeModalVisible(true);
    } else if (boxName === 'virtual') {
      setVirtualModal(true);
    }
  };

  const handleCancel = (): void => {
    setSelectedBox('');
    onCancel();
  };

  useEffect(() => {
    if (visible) {
      //
    }
  }, [visible]);

  return (
    <Modal
      wrapClassName={styles.open_source_modal}
      width="auto"
      open={visible}
      centered
      onCancel={handleCancel}
      destroyOnClose
      maskClosable={false}
      footer={null}
    >
      <div className={styles.modal_content}>
        <div className={styles.title}>
          <span>{t('createAgent1.create')}</span>
        </div>
        <div className={styles.intelligentAgents}>
          <div
            className={`${styles.cueWord} ${
              selectedBox === 'cueWord' ? styles.selected : ''
            }`}
            onClick={() => handleBoxClick('cueWord')}
          >
            <div className={styles.cueWord_img}></div>
            <p>{t('createAgent1.promptCreation')}</p>
            <span>{t('createAgent1.promptSetup')}</span>
          </div>
          <div
            className={`${styles.Workflow} ${
              selectedBox === 'workflow' ? styles.selected : ''
            }`}
            onClick={() => handleBoxClick('workflow')}
          >
            <div
              className={classNames(styles.cueWord_img, styles.Workflow_img)}
            ></div>
            <p>{t('createAgent1.workflowCreation')}</p>
            <span>{t('createAgent1.workflowDesign')}</span>
          </div>
          <div
            className={`${styles.virtual} ${
              selectedBox === 'virtual' ? styles.selected : ''
            }`}
            onClick={() => handleBoxClick('virtual')}
          >
            <div
              className={classNames(styles.cueWord_img, styles.virtual_img)}
            ></div>
            <p>{t('createAgent1.virtualCreation')}</p>
            <span>{t('createAgent1.virtualCreationDesc')}</span>
          </div>
        </div>
      </div>
      {makeModalVisible && (
        <MakeCreateModal
          visible={makeModalVisible}
          onCancel={() => {
            setMakeModalVisible(false);
          }}
        />
      )}

      <AgentCreationModal
        visible={AgentCreationModalVisible}
        onCancel={() => {
          IntelligentModalVisible(false);
        }}
      />
      {virtualModal && (
        <VirtualConfig
          visible={virtualModal}
          onSubmit={values => {
            createTalkAgent(values)
              .then((res: any) => {
                message.success(t('createAgent1.createSuccess'));
                navigate(
                  `/work_flow/${res?.maasId}/arrange?botId=${res?.botId}`
                );
                setVirtualModal(false);
              })
              .catch((err: any) => {
                // message.error(err?.message || err);
              });
          }}
          onCancel={() => {
            setVirtualModal(false);
          }}
        />
      )}
    </Modal>
  );
};
// }
export default HeaderFeedbackModal;
