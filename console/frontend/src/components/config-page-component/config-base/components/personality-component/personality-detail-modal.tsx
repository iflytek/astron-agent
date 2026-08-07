import React, { useState, useEffect } from 'react';
import { Modal, Button, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import vipIcon from '@/assets/imgs/agent-create-personality/personality-vip.svg';

import styles from './index.module.scss';

interface PersonalityDetailModalProps {
  visible: boolean;
  personality: import('./personality-library-modal').PersonalityInfo | null;
  onCancel: () => void;
  onConfirm: () => void;
}

const PersonalityDetailModal: React.FC<PersonalityDetailModalProps> = ({
  visible,
  personality,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // 当 personality 改变时重置加载状态
  useEffect(() => {
    if (personality) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [personality?.id]);

  const handleImageLoad = (): void => {
    setImageLoading(false);
  };

  const handleImageError = (): void => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <Modal
      title={t('configBase.CapabilityDevelopment.personalityLibraryTitle')}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={769}
      destroyOnClose
      className={styles.personalityDetailModal}
    >
      {personality && (
        <div className={styles.personalityDetailContent}>
          <div className={styles.personalityDetailImage}>
            {imageLoading && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1,
                }}
              >
                <Spin />
              </div>
            )}
            {imageError ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#999',
                }}
              >
                {t('configBase.CapabilityDevelopment.imageLoadError') ||
                  '图片加载失败'}
              </div>
            ) : (
              <img
                key={personality.id}
                className={styles.personalityPerson}
                src={personality.cover}
                alt={personality.name}
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ opacity: imageLoading ? 0 : 1 }}
              />
            )}
            <img className={styles.personalityVip} src={vipIcon} alt="" />
          </div>
          <div className={styles.personalityDetailInfo}>
            <div className={styles.personalityDetailName}>
              {personality.name}
            </div>
            <div className={styles.personalityDetailDesc}>
              <div>{personality.description}</div>
            </div>
            <div className={styles.personalityDetailPrompt}>
              {personality.prompt}
            </div>
            <div className={styles.personalityDetailActions}>
              <Button onClick={onCancel}>
                {t('configBase.CapabilityDevelopment.back')}
              </Button>
              <Button type="primary" onClick={onConfirm}>
                {t('configBase.CapabilityDevelopment.select')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PersonalityDetailModal;
