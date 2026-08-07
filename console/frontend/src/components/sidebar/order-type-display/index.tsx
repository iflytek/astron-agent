import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useOrderStore from '@/store/spark-store/order-store';
import { useDebounceFn } from 'ahooks';

import traceFree from '@/assets/imgs/trace/trace-free.svg';
import tracePro from '@/assets/imgs/trace/trace-pro.svg';
import traceTeam from '@/assets/imgs/trace/trace-team.svg';
import traceEnterprise from '@/assets/imgs/trace/trace-enterprise.svg';

import styles from './index.module.scss';
import { Button, message, Modal, Tooltip } from 'antd';
import useEnterpriseStore from '@/store/enterprise-store';
import useSpaceStore from '@/store/space-store';
import { upgradeCombo } from '@/services/enterprise';

interface OrderTypeDisplayProps {
  onClose?: () => void;
}

interface OrderType {
  type: string;
  text: string;
  icon: string;
  alt: string;
}

/** ## 订单类型展示组件 */
const OrderTypeDisplay: React.FC<OrderTypeDisplayProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { joinedEnterpriseList } = useEnterpriseStore();
  // 判断joinedEnterpriseList中是否有serviceType为3的企业
  const hasServiceType3 = joinedEnterpriseList.some(
    enterprise => enterprise.serviceType === 3
  );
  /** ## 订单类型展示组件 */
  const { t } = useTranslation();
  const {
    orderDerivedInfo: { orderTraceAndIcon },
    isSpecialUser: isSpecial,
  } = useOrderStore();
  const { info } = useEnterpriseStore();
  const { spaceType } = useSpaceStore();
  // 使用函数生成 orderTypes 数组，确保每次渲染都使用最新的翻译
  const getOrderTypes = (): OrderType[] => [
    {
      type: 'free',
      text: t('sidebar.orderTypes.upgrade'),
      icon: traceFree,
      alt: t('sidebar.orderTypes.upgrade'),
    },
    {
      type: '个人-专业版',
      text: t('sidebar.orderTypes.professional'),
      icon: tracePro,
      alt: t('sidebar.orderTypes.professional'),
    },
    {
      type: '团队版',
      text: t('sidebar.orderTypes.team'),
      icon: traceTeam,
      alt: t('sidebar.orderTypes.team'),
    },
    {
      type: '企业版',
      text: t('sidebar.orderTypes.enterprise'),
      icon: traceEnterprise,
      alt: t('sidebar.orderTypes.enterprise'),
    },
  ];

  // 获取当前订单类型
  const orderTypes = getOrderTypes();
  const currentOrder =
    orderTypes.find((item, index) => index === orderTraceAndIcon) ||
    orderTypes[0];

  // 套餐升级功能
  const [upgradeComboModalVisible, setUpgradeComboModalVisible] =
    useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const handleUpgradeComboModalOk = async (
    e: React.MouseEvent<HTMLButtonElement>
  ): Promise<void> => {
    e.stopPropagation();

    // 如果正在加载中，直接返回
    if (upgradeLoading) {
      return;
    }

    setUpgradeLoading(true);

    // TODO 升级团队版 需要调用后端接口，接口完成调用关闭弹窗，并跳转创建团队(默认为团队)页面
    try {
      await upgradeCombo();
      setUpgradeComboModalVisible(false);
      navigate('team/create/1');
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '升级失败');
    } finally {
      setUpgradeLoading(false);
    }
  };

  // 使用防抖包装升级确认函数
  const { run: debouncedUpgradeOk } = useDebounceFn(handleUpgradeComboModalOk, {
    wait: 500,
    leading: true,
    trailing: false,
  });

  const handleUpgradeComboModalCancel = (
    e: React.MouseEvent<HTMLButtonElement>
  ): void => {
    e.stopPropagation();
    setUpgradeComboModalVisible(false);
  };

  // 点击升级按钮打开弹窗的函数
  const handleOpenUpgradeModal = (
    event: React.MouseEvent<HTMLDivElement>
  ): void => {
    event.stopPropagation();
    if (currentOrder?.type === 'free' && hasServiceType3) {
      return;
    }
    !isSpecial && setUpgradeComboModalVisible(true);
    // 手动关闭 Popover
    onClose?.();
  };

  // 使用防抖包装打开弹窗函数
  const { run: debouncedOpenModal } = useDebounceFn(handleOpenUpgradeModal, {
    wait: 300,
    leading: true,
    trailing: false,
  });

  const UpgradeComboModal = (): React.ReactElement => {
    return (
      <Modal
        width={400}
        open={upgradeComboModalVisible}
        title={t('sidebar.orderTypes.confirmUpgradeEnterprise')}
        footer={null}
        centered
        onCancel={handleUpgradeComboModalCancel}
      >
        <div className={styles.upgradeComboModalBox}>
          {/* <div className={styles.upgradeComboModalTitle}>确定升级为团队版吗？</div> */}

          {/* footer */}
          <div className={styles.upgradeComboModalFooter}>
            <Button
              type="primary"
              onClick={debouncedUpgradeOk}
              loading={upgradeLoading}
            >
              {t('btnOk')}
            </Button>
            <Button
              onClick={handleUpgradeComboModalCancel}
              disabled={upgradeLoading}
            >
              {t('btnCancel')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  // 如果已经创建或则加入了团队，不展示
  if (joinedEnterpriseList?.length) return null;

  return (
    <Tooltip
      title={
        currentOrder?.type === 'free' &&
        hasServiceType3 &&
        info.serviceType !== 3
          ? '请在定制版中使用更多功能'
          : ''
      }
    >
      <div className={styles.upCombo} onClick={debouncedOpenModal}>
        {info.serviceType === 3 && spaceType !== 'personal' ? (
          <>
            <img src={traceEnterprise} alt={currentOrder?.alt} />
            定制版
          </>
        ) : (
          <>
            <img src={currentOrder?.icon} alt={currentOrder?.alt} />
            {currentOrder?.text}
          </>
        )}
      </div>

      {/* 升级套餐确定弹窗 */}
      <UpgradeComboModal />
    </Tooltip>
  );
};

export default OrderTypeDisplay;
