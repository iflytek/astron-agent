import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Tabs, message, Tooltip, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  getPersonalityCategory,
  getPersonalityByCategory,
} from '@/services/agent-personality';

import styles from './index.module.scss';

const { TabPane } = Tabs;

export interface PersonalityInfo {
  id: string;
  name: string;
  description: string;
  cover?: string;
  headCover?: string;
  prompt: string;
}

interface PersonalityType {
  id: string;
  name: string;
}

interface PersonalityLibraryModalProps {
  visible: boolean;
  onCancel: () => void;
  onPersonalitySelect: (personality: PersonalityInfo) => void;
}

const PersonalityLibraryModal: React.FC<PersonalityLibraryModalProps> = ({
  visible,
  onCancel,
  onPersonalitySelect,
}) => {
  const { t } = useTranslation();
  const [personalityList, setPersonalityList] = useState<PersonalityInfo[]>([]);
  const [personalityTypes, setPersonalityTypes] = useState<PersonalityType[]>(
    []
  );
  const [activeTab, setActiveTab] = useState('-1');
  const [loading, setLoading] = useState(false);
  // 用于跟踪最新的请求，避免竞态条件
  const latestRequestIdRef = useRef(0);

  // 获取人设类型
  const fetchPersonalityTypes = useCallback(async (): Promise<void> => {
    try {
      const response = await getPersonalityCategory();
      setPersonalityTypes(response || []);
    } catch (error: unknown) {
      message.error((error as Error)?.message || '获取人设类型失败');
    }
  }, []);

  // 获取人设列表
  const fetchPersonalityList = useCallback(
    async (categoryId: string): Promise<void> => {
      // 生成新的请求 ID
      const requestId = ++latestRequestIdRef.current;

      setLoading(true);
      try {
        const response = await getPersonalityByCategory({
          categoryId: categoryId,
          pageNum: 1,
          pageSize: 100,
        });

        // 只处理最新的请求结果，忽略过期的请求
        if (requestId === latestRequestIdRef.current) {
          setPersonalityList(response?.records || []);
        }
      } catch (error: unknown) {
        // 只为最新请求显示错误
        if (requestId === latestRequestIdRef.current) {
          message.error((error as Error)?.message || '获取人设列表失败');
          setPersonalityList([]);
        }
      } finally {
        // 只在最新请求完成时关闭 loading
        if (requestId === latestRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  // 处理tab切换
  const handleTabChange = (key: string): void => {
    setActiveTab(key);
    fetchPersonalityList(key);
  };

  // 处理人设选择
  const handlePersonalityClick = (personality: PersonalityInfo): void => {
    onPersonalitySelect(personality);
  };

  useEffect(() => {
    if (visible) {
      // 重置请求 ID
      latestRequestIdRef.current = 0;
      setActiveTab('1');
      const initData = async (): Promise<void> => {
        await fetchPersonalityTypes();
        await fetchPersonalityList('1');
      };
      initData();
    }
  }, [visible, fetchPersonalityTypes, fetchPersonalityList]);

  return (
    <Modal
      title={t('configBase.CapabilityDevelopment.personalityLibraryTitle')}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={769}
      destroyOnClose
      className={styles.personalityLibraryModal}
    >
      <div className={styles.personalityLibraryContent}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          className={styles.personalityTabs}
        >
          {personalityTypes.map(type => (
            <TabPane tab={type.name} key={type.id} />
          ))}
        </Tabs>

        <Spin spinning={loading}>
          <div
            className={styles.personalityGrid}
            style={{ minHeight: loading ? '300px' : 'auto' }}
          >
            {Array.isArray(personalityList) &&
              personalityList?.map((personality: PersonalityInfo) => (
                <div
                  key={personality.id}
                  className={styles.personalityCard}
                  onClick={(): void => handlePersonalityClick(personality)}
                >
                  <div className={styles.personalityImage}>
                    <img src={personality.headCover} alt={personality.name} />
                  </div>
                  <div className={styles.personalityInfo}>
                    <div className={styles.personalityName}>
                      <span>{personality.name}</span>
                      <span className={styles.detailButton}>
                        {t(
                          'configBase.CapabilityDevelopment.personalityDetail'
                        )}
                      </span>
                    </div>
                    <Tooltip title={personality.description} placement="top">
                      <div className={styles.personalityDesc}>
                        {personality.description}
                      </div>
                    </Tooltip>
                  </div>
                </div>
              ))}
          </div>
        </Spin>
      </div>
    </Modal>
  );
};

export default PersonalityLibraryModal;
