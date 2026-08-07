import React, { ReactNode, useEffect } from 'react';
import { Modal } from 'antd';
import { useRecoilValue } from 'recoil';
import { COMBOCONFIG, MODELRESOURCE, MODELRESOURCE_EN } from './combo-config';
import useOrderStore from '@/store/spark-store/order-store';
import useOrderData from '@/hooks/use-order-data';
import { TableBody } from './table-body';

import modalBg from '@/assets/imgs/trace/contrast-bg.png';

import styles from './combo-contrast-modal.module.scss';
import { useTranslation } from 'react-i18next';

interface ComboModalProps {
  visible: boolean;
  onCancel: () => void;
  width?: number; // 可选的自定义宽度
  footer?: ReactNode; // 可选的自定义底部
  fullScreen?: boolean; // 新增全屏控制参数
}

// Helper functions
const getEnvUrl = (): string => {
  const NODE_ENV = import.meta.env.MODE;
  return NODE_ENV === 'production'
    ? ''
    : NODE_ENV === 'development' || NODE_ENV === 'test'
      ? 'test.'
      : 'pre.';
};

const jumpPicePage = (url: string | null): void => {
  if (url) {
    window.open(url, '_blank');
  }
};

const isUsingPlan = (
  orderShowArr: number[],
  planIndex: number,
  planType: number
): boolean => {
  if (planIndex === 0) {
    return orderShowArr[0] === planType;
  }
  return (
    orderShowArr[1] === planType &&
    (orderShowArr.length === 3 ? !!orderShowArr[2] : true)
  );
};

const getPlanButtonText = (isUsing: boolean, t: any): string => {
  return isUsing
    ? t('comboContrastModal.common.using')
    : t('comboContrastModal.common.subscribe');
};

const getPlanButtonClass = (isUsing: boolean, styles: any): string => {
  return `${styles.priceBtn} ${isUsing ? styles.useType : ''}`;
};

export default function ComboContrastModal({
  visible,
  onCancel,
  width,
  fullScreen = true,
}: ComboModalProps): React.JSX.Element {
  const envUrl = getEnvUrl();
  const { orderDerivedInfo } = useOrderStore();
  const { orderShowArr } = orderDerivedInfo;
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const { fetchUserMeta } = useOrderData();

  useEffect(() => {
    if (visible) {
      fetchUserMeta();
    }
  }, [visible]);

  return (
    <Modal
      className={styles.ComboContrastModal}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={fullScreen ? '80%' : width}
      style={{
        top: fullScreen ? 0 : undefined,
        maxWidth: fullScreen ? '100%' : undefined,
        height: fullScreen ? 'calc(100vh - 40px)' : undefined,
        borderRadius: fullScreen ? '20px' : undefined,
        marginTop: fullScreen ? '40px' : undefined,
      }}
      styles={{
        body: {
          height: fullScreen ? 'calc(100vh - 40px)' : undefined,
          overflow: fullScreen ? 'auto' : undefined,
          background: `url(${modalBg}) no-repeat left top`,
          backgroundSize: 'contain',
          backgroundPosition: '-90px 0',
          backgroundAttachment: 'local',
          borderRadius: '20px',
        },
      }}
    >
      <div className={styles.ModalWrap}>
        <h1 className={styles.title}>
          {t('comboContrastModal.comboContrastTitle')}
        </h1>
        <p className={styles.modalDesc}>
          {t('comboContrastModal.comboContrastSubTitleDoc')}
        </p>
        <table className={styles.contrastTabel}>
          <thead>
            <tr>
              <th>{t('comboContrastModal.comboContrastPlan')}</th>
              <th>
                <div>
                  {t('comboContrastModal.comboContrastPersonalFreeVersion')}
                </div>
                <div
                  className={styles.priceBox}
                  style={{ height: '42px', margin: '13px 0 18px' }}
                >
                  <span className={styles.priceLongth}>
                    {t('comboContrastModal.comboContrastPersonalUser')}
                  </span>
                  <br />
                  <span className={styles.priceFree}>
                    {t('comboContrastModal.comboContrastFreeTrial')}
                  </span>
                </div>
                <div
                  className={getPlanButtonClass(orderShowArr[0] === 0, styles)}
                  style={{ cursor: 'auto' }}
                >
                  {orderShowArr[0] === 0
                    ? t('comboContrastModal.comboContrastUsing')
                    : t('comboContrastModal.comboContrastAlwaysUse')}
                </div>
              </th>
              <th>
                <div>
                  {t('comboContrastModal.comboContrastPersonalProVersion')}
                </div>
                <div className={styles.priceBox}>
                  <span className={styles.price}>9.9</span>
                  <span className={styles.priceLongth}>
                    {t('comboContrastModal.common.priceUnit')}
                  </span>
                </div>
                <div
                  className={getPlanButtonClass(
                    isUsingPlan(orderShowArr, 0, 1),
                    styles
                  )}
                  onClick={() =>
                    jumpPicePage(
                      `http://${envUrl}console.xfyun.cn/sale/buy?wareId=9178&packageId=9178001&serviceName=%E6%98%9F%E8%BE%B0Agent%E5%A5%97%E9%A4%90`
                    )
                  }
                >
                  {getPlanButtonText(isUsingPlan(orderShowArr, 0, 1), t)}
                </div>
              </th>
              <th>
                <div>{t('comboContrastModal.comboContrastTeamVersion')}</div>
                <div className={styles.priceBox}>
                  <span className={styles.price}>128</span>
                  <span className={styles.priceLongth}>
                    {t('comboContrastModal.common.priceUnit')}
                  </span>
                </div>
                <div
                  className={getPlanButtonClass(
                    isUsingPlan(orderShowArr, 1, 2),
                    styles
                  )}
                  onClick={() =>
                    jumpPicePage(
                      `http://${envUrl}console.xfyun.cn/sale/buy?wareId=9178&packageId=9178002&serviceName=%E6%98%9F%E8%BE%B0Agent%E5%A5%97%E9%A4%90`
                    )
                  }
                >
                  {getPlanButtonText(isUsingPlan(orderShowArr, 1, 2), t)}
                </div>
              </th>
              <th>
                <div>
                  {t('comboContrastModal.comboContrastEnterpriseVersion')}
                </div>
                <div className={styles.priceBox}>
                  <span className={styles.price}>3999</span>
                  <span className={styles.priceLongth}>
                    {t('comboContrastModal.common.priceUnit')}
                  </span>
                </div>
                <div
                  className={getPlanButtonClass(
                    isUsingPlan(orderShowArr, 1, 3),
                    styles
                  )}
                  onClick={() =>
                    jumpPicePage(
                      `http://${envUrl}console.xfyun.cn/sale/buy?wareId=9178&packageId=9178003&serviceName=%E6%98%9F%E8%BE%B0Agent%E5%A5%97%E9%A4%90`
                    )
                  }
                >
                  {getPlanButtonText(isUsingPlan(orderShowArr, 1, 3), t)}
                </div>
              </th>
            </tr>
          </thead>
          <TableBody
            resources={isEnglish ? MODELRESOURCE_EN : MODELRESOURCE}
            styles={styles}
          />
        </table>
      </div>
    </Modal>
  );
}
