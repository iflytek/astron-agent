import React, { useState, useEffect, useCallback } from 'react';
import { message, Switch, Input, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  generatePersonalityContent,
  polishPersonalityContent,
  type PersonalityGenerateResponse,
} from '@/services/agent-personality';
import useAgentDirectiveCreateStore from '@/store/agent-directive-create';
import PersonalityLibraryModal from './personality-library-modal';
import PersonalityDetailModal from './personality-detail-modal';

import ExquisiteCharacter from '@/assets/imgs/agent-create-personality/personality-category.svg';
import aiGenerate from '@/assets/imgs/agent-create-personality/personality-ai-generate.svg';
import aiPolish from '@/assets/imgs/agent-create-personality/personality-ai-polish.svg';
import scenarioIcon1 from '@/assets/imgs/agent-create-personality/personality-types01-purple.svg';
import scenarioIcon2 from '@/assets/imgs/agent-create-personality/personality-types02-blue.svg';
import scenarioCheckIcon from '@/assets/imgs/agent-create-personality/personality-types-checked.svg';

import styles from './index.module.scss';

const { TextArea } = Input;

interface PersonalityInfo {
  id: string;
  name: string;
  description: string;
  cover?: string;
  headCover?: string;
  prompt: string;
}

interface PersonalityProps {
  enablePersonality?: boolean;
  personalityConfig?: {
    personality?: string;
    sceneType?: 1 | 2; // 1为陪伴场景, 2为陪练场景
    sceneInfo?: string;
  };
  onPersonalityChange?: (data: {
    enablePersonality: boolean;
    personalityConfig: {
      personality?: string;
      sceneType?: 1 | 2;
      sceneInfo?: string;
    } | null;
  }) => void;
  // 用于AI接口调用的参数
  botName?: string;
  botType?: string;
  botDesc?: string;
  prompt?: string;
}

/**
 * 从接口响应中提取人设内容
 */
const extractPersonalityContent = (
  response: PersonalityGenerateResponse
): string => {
  if (typeof response === 'string') {
    return response;
  }
  if (response.data) {
    return typeof response.data === 'string'
      ? response.data
      : response.data.content || '';
  }
  return response.content || '';
};

const Personality: React.FC<PersonalityProps> = ({
  enablePersonality: propEnablePersonality = false,
  personalityConfig: propPersonalityConfig = null,
  onPersonalityChange,
  botName = '',
  botType = '',
  botDesc = '',
  prompt = '',
}) => {
  const { t } = useTranslation();
  const [enablePersonality, setEnablePersonality] = useState(
    propEnablePersonality ||
      (propPersonalityConfig !== null && propPersonalityConfig !== undefined)
  );
  const [personalityInfo, setPersonalityInfo] = useState(
    propPersonalityConfig?.personality || ''
  );
  const [scenarioType, setScenarioType] = useState<1 | 2 | undefined>(
    propPersonalityConfig?.sceneType
  );
  const [scenarioDescription, setScenarioDescription] = useState(
    propPersonalityConfig?.sceneInfo || ''
  );
  const [personalityLibraryVisible, setPersonalityLibraryVisible] =
    useState(false);
  const [personalityDetailVisible, setPersonalityDetailVisible] =
    useState(false);
  const [selectedPersonality, setSelectedPersonality] =
    useState<PersonalityInfo | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const { agentType } = useAgentDirectiveCreateStore();

  const handlePersonalityLibraryClick = (): void => {
    setPersonalityLibraryVisible(true);
  };

  const handlePersonalitySelect = (personality: PersonalityInfo): void => {
    setSelectedPersonality(personality);
    setPersonalityDetailVisible(true);
  };

  const handlePersonalityConfirm = (): void => {
    if (selectedPersonality) {
      setPersonalityInfo(selectedPersonality.prompt);
      setPersonalityDetailVisible(false);
      setPersonalityLibraryVisible(false);
      setSelectedPersonality(null);
    }
  };

  const handlePersonalityDetailClose = (): void => {
    setPersonalityDetailVisible(false);
    setSelectedPersonality(null);
  };

  const handleScenarioTypeChange = (type: 1 | 2): void => {
    // 如果点击的是当前已选中的类型，则取消选择
    if (scenarioType === type) {
      setScenarioType(undefined);
      setScenarioDescription('');
      return;
    }

    setScenarioType(type);

    // 根据场景类型自动填充对应的文案内容
    const scenarioTemplates = {
      1: '陪伴场景，角色陪伴用户在完成角色任务的基础上进行陪伴，说话风格偏向闲聊。营造舒服的聊天氛围，不搞正式表达',
      2: '陪练场景，角色陪伴用户在完成角色任务的基础上进行陪练，说话风格偏向教学，耐心解答疑问，用易懂的话指导，帮助用户掌握相关能力',
    };

    setScenarioDescription(scenarioTemplates[type]);
  };

  // 验证AI生成所需参数
  const validateAiParams = (): boolean => {
    const missingFields: string[] = [];

    if (!botName || botName.trim() === '') {
      missingFields.push(
        t('configBase.CapabilityDevelopment.aiPersonalityBotNameRequired')
      );
    }
    if (!botType) {
      missingFields.push(
        t('configBase.CapabilityDevelopment.aiPersonalityBotTypeRequired')
      );
    }
    if (!botDesc || botDesc.trim() === '') {
      missingFields.push(
        t('configBase.CapabilityDevelopment.aiPersonalityBotDescRequired')
      );
    }
    if (!prompt || prompt.trim() === '') {
      missingFields.push(
        t('configBase.CapabilityDevelopment.aiPersonalityPromptRequired')
      );
    }

    if (missingFields.length > 0) {
      message.info(missingFields.join('、'));
      return false;
    }
    return true;
  };

  const getCategoryName = (botType: string): string => {
    return (
      agentType.find(
        (item: { key: number; name: string }) => item.key === Number(botType)
      )?.name ||
      botType ||
      ''
    );
  };

  // AI生成/润色人设内容
  const handleAiGenerate = async (): Promise<void> => {
    if (aiLoading) return;

    // 验证必需参数
    if (!validateAiParams()) {
      return;
    }

    setAiLoading(true);
    try {
      if (personalityInfo) {
        // 润色现有内容
        const response = await polishPersonalityContent({
          botName: botName,
          category: getCategoryName(botType),
          info: botDesc,
          prompt: prompt,
          personality: personalityInfo,
        });
        setPersonalityInfo(extractPersonalityContent(response));
      } else {
        // 生成新内容
        const response = await generatePersonalityContent({
          botName: botName,
          category: getCategoryName(botType),
          info: botDesc,
          prompt: prompt,
        });
        setPersonalityInfo(extractPersonalityContent(response));
      }
    } catch (error) {
      message.error('AI生成失败，请稍后重试');
    } finally {
      setAiLoading(false);
    }
  };

  // 使用useCallback包装数据变化通知逻辑，确保函数引用稳定
  const notifyParentChange = useCallback((): void => {
    if (onPersonalityChange) {
      const personalityConfig = enablePersonality
        ? {
            personality: personalityInfo,
            sceneType: scenarioType,
            sceneInfo: scenarioDescription,
          }
        : null;

      onPersonalityChange({
        enablePersonality,
        personalityConfig,
      });
    }
  }, [
    enablePersonality,
    personalityInfo,
    scenarioType,
    scenarioDescription,
    onPersonalityChange,
  ]);

  // 数据变化时通知父组件
  useEffect(() => {
    notifyParentChange();
  }, [notifyParentChange]);

  return (
    <div className={styles.personality}>
      <div className={styles.personalityHeader}>
        <div className={styles.personalityTitle}>
          <span className={styles.titleText}>
            {t('configBase.CapabilityDevelopment.personality')}
          </span>
        </div>
        <Switch
          className="list-switch config-switch"
          checked={enablePersonality}
          onChange={(checked: boolean): void => setEnablePersonality(checked)}
        />
      </div>

      {enablePersonality && (
        <div className={styles.personalityContent}>
          {/* 人设信息 */}
          <div className={styles.personalityInfo}>
            <div className={styles.personalityInfoHeader}>
              <span className={styles.sectionTitle}>
                {t('configBase.CapabilityDevelopment.personalityInfo')}
              </span>
              <span
                className={styles.libraryLink}
                onClick={handlePersonalityLibraryClick}
              >
                <img src={ExquisiteCharacter} alt="精品人设库" />
                {t('configBase.CapabilityDevelopment.personalityLibrary')}
              </span>
            </div>
            <div className={styles.personalityInputWrapper}>
              <TextArea
                className={styles.personalityTextArea}
                placeholder={t(
                  'configBase.CapabilityDevelopment.personalityDescription'
                )}
                value={personalityInfo}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                  setPersonalityInfo(e.target.value)
                }
                maxLength={1000}
                showCount
                rows={4}
              />
              <Button
                className={styles.aiButton}
                type="link"
                size="small"
                loading={aiLoading}
                onClick={handleAiGenerate}
              >
                <img src={personalityInfo ? aiPolish : aiGenerate} alt="" />
                {personalityInfo
                  ? t('configBase.CapabilityDevelopment.aiPolish')
                  : t('configBase.CapabilityDevelopment.aiGenerate')}
              </Button>
            </div>
          </div>

          {/* 场景信息 */}
          <div className={styles.scenarioInfo}>
            <div className={styles.scenarioInfoHeader}>
              <span className={styles.sectionTitle}>
                {t('configBase.CapabilityDevelopment.scenarioInfo')}
              </span>
            </div>

            <div className={styles.scenarioOptions}>
              <div
                className={`${styles.scenarioOption} ${
                  scenarioType === 1 ? styles.selected : ''
                }`}
                onClick={(): void => handleScenarioTypeChange(1)}
              >
                <div className={styles.scenarioIcon}>
                  <div className={styles.iconPlaceholder}>
                    <img src={scenarioIcon1} alt="" />
                  </div>
                </div>
                <div className={styles.scenarioContent}>
                  <div className={styles.scenarioTitle}>
                    {t('configBase.CapabilityDevelopment.companionScenario')}
                  </div>
                  <div className={styles.scenarioDesc}>
                    {t(
                      'configBase.CapabilityDevelopment.companionScenarioDesc'
                    )}
                  </div>
                </div>
                <div
                  className={`${styles.scenarioCheckbox} ${
                    scenarioType === 1 ? styles.scenarioChecked : ''
                  }`}
                >
                  {scenarioType === 1 && <img src={scenarioCheckIcon} alt="" />}
                </div>
              </div>

              <div
                className={`${styles.scenarioOption} ${
                  scenarioType === 2 ? styles.selected : ''
                }`}
                onClick={(): void => handleScenarioTypeChange(2)}
              >
                <div className={styles.scenarioIcon}>
                  <div className={styles.iconPlaceholder}>
                    <img src={scenarioIcon2} alt="" />
                  </div>
                </div>
                <div className={styles.scenarioContent}>
                  <div className={styles.scenarioTitle}>
                    {t('configBase.CapabilityDevelopment.trainingScenario')}
                  </div>
                  <div className={styles.scenarioDesc}>
                    {t('configBase.CapabilityDevelopment.trainingScenarioDesc')}
                  </div>
                </div>
                <div
                  className={`${styles.scenarioCheckbox} ${
                    scenarioType === 2 ? styles.scenarioChecked : ''
                  }`}
                >
                  {scenarioType === 2 && <img src={scenarioCheckIcon} alt="" />}
                </div>
              </div>
            </div>

            {scenarioType && (
              <div className={styles.scenarioDescription}>
                <TextArea
                  className={styles.scenarioTextArea}
                  placeholder={t(
                    'configBase.CapabilityDevelopment.scenarioDescription'
                  )}
                  value={scenarioDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                    setScenarioDescription(e.target.value)
                  }
                  maxLength={500}
                  rows={4}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 人设库弹窗 */}
      <PersonalityLibraryModal
        visible={personalityLibraryVisible}
        onCancel={(): void => setPersonalityLibraryVisible(false)}
        onPersonalitySelect={handlePersonalitySelect}
      />

      {/* 人设详情弹窗 */}
      <PersonalityDetailModal
        visible={personalityDetailVisible}
        personality={selectedPersonality}
        onCancel={handlePersonalityDetailClose}
        onConfirm={handlePersonalityConfirm}
      />
    </div>
  );
};

export default Personality;
