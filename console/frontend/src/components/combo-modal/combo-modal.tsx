import React, { ReactNode, useState, useEffect } from 'react';
import { Modal, Tooltip } from 'antd';
import { COMBOCONFIG, COMBOCONFIG_EN } from './combo-config';
import ComboContrastModal from './combo-contrast-modal';
import useOrderData from '@/hooks/use-order-data';
import { useEnterprise } from '@/hooks/use-enterprise';

import rightGray from '@/assets/imgs/trace/right-gray.svg';
import BackIcon from '@/assets/imgs/sparkImg/back.svg';
import styles from './combo-modal.module.scss';
import { useTranslation } from 'react-i18next';

interface ComboModalProps {
  visible: boolean;
  onCancel: () => void;
  width?: number; // 可选的自定义宽度
  footer?: ReactNode; // 可选的自定义底部
  fullScreen?: boolean; // 新增全屏控制参数
}

export default function ComboModal({
  visible,
  onCancel,
  width,
  footer = null,
  fullScreen = true,
}: ComboModalProps) {
  const [contrastModalVisible, setContrastModalVisible] = useState(false); // 权益套餐弹窗显隐
  const [showQrCode, setShowQrCode] = useState(false); // 二维码显示状态
  const { fetchUserMeta } = useOrderData();
  const { checkNeedCreateTeamFn } = useEnterprise();

  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const jumpPicePage = (url: string | null) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      checkNeedCreateTeamFn();
    }
  };

  useEffect(() => {
    if (visible) {
      // 弹窗打开时，获取用户套餐并添加监听
      fetchUserMeta();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // 弹窗关闭或组件卸载时，移除监听
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [visible]);

  // 点击外部关闭二维码
  useEffect(() => {
    const handleClickOutside = () => {
      setShowQrCode(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <Modal
      className={styles.ComboModal}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={fullScreen ? '100%' : width}
      mask={false}
      closable={false}
      style={{
        top: fullScreen ? 0 : undefined,
        maxWidth: fullScreen ? '100%' : undefined,
        height: fullScreen ? '100vh' : undefined,
      }}
      styles={{
        body: {
          height: fullScreen ? '100vh' : undefined,
          overflow: fullScreen ? 'auto' : undefined,
        },
      }}
    >
      <div
        className="w-[48px] h-[48px] cursor-pointer mt-[32px] ml-[32px]"
        onClick={onCancel}
      >
        <img
          src={BackIcon}
          alt="返回"
          className=" w-[48px] h-[48px] mr-1.5 align-middle"
        />
      </div>
      <div className={styles.ComboModalWrap}>
        <h1 className={styles.title}>
          {t('comboContrastModal.comboModal.freeUse')}
          <span className={styles.titleGradient}>
            {t('comboContrastModal.comboModal.useAgent')}
          </span>
          {t('comboContrastModal.comboModal.orUpgrade')}
        </h1>

        <div className={styles.ComboList}>
          {(isEnglish ? COMBOCONFIG_EN : COMBOCONFIG).map((item, index) => (
            <div key={index + item.titleName} className={styles.ComboItem}>
              <div className={styles.ComboItemHeader}>
                <h2
                  className={styles.ComboTitle}
                  style={{
                    color: item.themeColor ? `${item.themeColor}` : '#000',
                  }}
                >
                  <Tooltip title={item.titleName} placement="top">
                    {item.titleName}
                  </Tooltip>
                </h2>
                <h2 className={styles.ComboDesc}>{item.desc}</h2>
                <div className={styles.ComboPrice}>
                  <Tooltip
                    title={`¥ ${item.monthPrice} ${item.range}`}
                    placement="top"
                  >
                    ¥ {item.monthPrice}
                    <span className={styles.ComboPriceRange}>{item.range}</span>
                  </Tooltip>
                </div>
                <div
                  className={`${styles.ComboBtn} ${
                    item.hasQrcode && showQrCode ? styles.QRactive : ''
                  }`}
                  style={{
                    backgroundColor: item.themeColor
                      ? `${item.themeColor}`
                      : '#fff',
                    color: item.themeColor ? '#fff' : '#000',
                  }}
                  onClick={e => {
                    if (item?.hasQrcode) {
                      e.stopPropagation();
                      setShowQrCode(!showQrCode);
                    } else {
                      jumpPicePage(item?.jumpBtnUrl);
                    }
                  }}
                >
                  {item.jumpBtnName}
                </div>
              </div>

              <div className={styles.ComboItemIntro}>
                {item.ComboIntrolist.map((it, ind) => (
                  <div key={it + ind} className={styles.ComboItemIntroBox}>
                    <img
                      src={rightGray}
                      alt={t('comboContrastModal.comboModal.comboList')}
                    />
                    <span>{it}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          className={styles.CompareBtn}
          onClick={() => {
            setContrastModalVisible(true);
          }}
        >
          {/* 功能/权益对比 */}
        </div>
      </div>

      <ComboContrastModal
        visible={contrastModalVisible}
        onCancel={() => setContrastModalVisible(false)}
      />
    </Modal>
  );
}
