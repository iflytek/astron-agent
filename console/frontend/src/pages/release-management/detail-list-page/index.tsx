import React, {
  memo,
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { getBotInfo } from '@/services/spark-common';

import Collapse from '@/assets/imgs/sparkImg/Collapse.png';
import errorIcon from '@/assets/imgs/sparkImg/errorIcon.svg';
import workflowIcon from '@/assets/imgs/release/workflowIcon.svg';

import styles from './index.module.scss';
import { useTranslation } from 'react-i18next';

// 创建插槽上下文
interface SlotContextType {
  registerSlotContent: (content: React.ReactNode) => void;
  unregisterSlotContent: () => void;
}

const SlotContext = createContext<SlotContextType | null>(null);

// 导出hook供子组件使用
export const useSlot = () => {
  const context = useContext(SlotContext);
  if (!context) {
    throw new Error('useSlot must be used within SlotProvider');
  }
  return context;
};

const DetailListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { botId } = useParams();
  const [record, setRecord] = useState(location.state?.record);
  const [slotContent, setSlotContent] = useState<React.ReactNode>(null);
  const { t } = useTranslation();

  // 插槽内容管理方法
  const registerSlotContent = useCallback((content: React.ReactNode) => {
    setSlotContent(content);
  }, []);

  const unregisterSlotContent = useCallback(() => {
    setSlotContent(null);
  }, []);

  const slotContextValue: SlotContextType = {
    registerSlotContent,
    unregisterSlotContent,
  };

  useEffect(() => {
    if (!record && botId) {
      getBotInfo({ botId }).then(data => {
        setRecord(data);
      });
    }
  }, [botId, record]);

  return (
    <SlotContext.Provider value={slotContextValue}>
      <div className={styles.detailList}>
        <div className={styles.detailListHeader}>
          <div
            className={styles.CollapseIcon}
            onClick={() => {
              navigate('/management/release/workflow');
            }}
          >
            <img src={Collapse} />
          </div>

          <div className={styles.botInfoIcon}>
            <img src={record?.avatar || errorIcon} alt="智能体icon" />
          </div>
          <div className={styles.botInfoMain}>
            <div className={styles.botInfoTitle}>
              {record?.botName || '智能体名称'}
            </div>
            <div className={styles.botInfoDesc}>{record?.botDesc || ''}</div>
          </div>
          <span className={styles.botInfoType}>
            <img src={workflowIcon} alt={t('releaseDetail.workflow')} />{' '}
            {t('releaseDetail.workflow')}
          </span>
        </div>

        <div className={styles.detail_header}>
          <div className={styles.changeTab}>
            <div
              className={`${styles.changeBox} ${
                !location.pathname.includes('trace') && styles.activeBox
              }`}
              onClick={() => {
                navigate(`/management/release/detail/${botId}`);
              }}
            >
              {t('releaseDetail.releaseVersion')}
            </div>
            {/* NOTE: Temporarily hide trce module -- 25.10 */}
            {/* <div
              className={`${styles.changeBox} ${
                location.pathname.includes('trace') && styles.activeBox
              }`}
              onClick={() => {
                navigate(`/management/release/detail/${botId}/trace`);
              }}
            >
              {t('releaseDetail.traceLog')}
            </div> */}
          </div>

          {/* 插槽区域 - 用于显示子组件注册的配置展示元素 */}
          {slotContent && slotContent}
        </div>

        <Outlet context={{ record, botId }} />
      </div>
    </SlotContext.Provider>
  );
};

export default memo(DetailListPage);
