import React, { useState, useMemo } from 'react';
import { Button, Input, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './index.module.scss';
import { checkEnterpriseName, createEnterprise } from '@/services/enterprise';
import UploadImage from '@/pages/space/enterprise/page-components/team-settings/components/upload-image';
import useUserStore from '@/store/user-store';
import { useSpaceI18n } from '@/pages/space/hooks/use-space-i18n';
import { useSpaceType } from '@/hooks/use-space-type';
import { useEnterprise } from '@/hooks/use-enterprise';
import { defaultEnterpriseAvatar } from '@/constants/config';
import agentLogoText from '@/assets/imgs/sidebar/agentLogoText.svg';
import agentLogoTextEn from '@/assets/imgs/sidebar/agentLogoTextEn.svg';
import creatorImg from '@/assets/imgs/space/creator.svg';
import defaultUploadIcon from '@/assets/imgs/space/upload.png';
import { useTranslation } from 'react-i18next';

const TeamCreate: React.FC = () => {
  const user = useUserStore((state: any) => state.user);
  const { roleTextMap } = useSpaceI18n();
  const navigate = useNavigate();
  const { handleTeamSwitch } = useSpaceType(navigate);
  const { getJoinedEnterpriseList } = useEnterprise();
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(defaultEnterpriseAvatar);
  const [reUploadImg, setReUploadImg] = useState(false);
  const [triggerChild, setTriggerChild] = useState(false);
  const { type } = useParams();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const roleText = useMemo(() => {
    const key = user?.roleType as keyof typeof roleTextMap | undefined;
    return key && key in roleTextMap ? roleTextMap[key] : '-';
  }, [user?.roleType, roleTextMap]);

  const enterpriseType = useMemo(() => {
    return type === '2' ? t('space.enterprise') : t('space.team');
  }, [type]);

  const textConfig = useMemo(
    () => ({
      emptyTip: t('space.pleaseEnterName', { enterpriseType }),
      existTip: t('space.teamNameExists', { enterpriseType }),
      createSuccessTip: t('space.teamCreateSuccess', { enterpriseType }),
      createFailedTip: t('space.teamCreateFailed', { enterpriseType }),
    }),
    [enterpriseType]
  );

  // 触发上传
  const triggerFileSelectPopup = (callback: () => void) => {
    setTriggerChild(false);
    callback();
  };

  const handleCreateTeam = async () => {
    const name = teamName.trim();
    if (!name) {
      message.error(textConfig.emptyTip);
      return;
    }

    setLoading(true);
    try {
      const checkRes = await checkEnterpriseName({ name });

      if (checkRes) {
        throw new Error(textConfig.existTip);
      }

      const res: any = await createEnterprise({
        name,
        avatarUrl: logoUrl,
      });

      message.success(textConfig.createSuccessTip);
      await getJoinedEnterpriseList();
      handleTeamSwitch(res);
    } catch (error: any) {
      message.error(error?.message || error?.msg || textConfig.createFailedTip);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.teamCreateContainer}>
      {/* Logo */}
      <div className={styles.logo}>
        <img
          src={isEnglish ? agentLogoText : agentLogoTextEn}
          alt="Logo"
          className={styles.logoImage}
        />
      </div>

      {/* 主要内容 */}
      <div className={styles.content}>
        {/* 标题 */}
        <div className={styles.title}>
          {t('space.teamEditionAlreadyEffective', { enterpriseType })}
        </div>

        {/* 用户信息 */}
        <div className={styles.userInfo}>
          <img
            src={user?.avatarUrl || creatorImg}
            alt={t('space.adminAvatar')}
            className={styles.avatar}
          />
          <div className={styles.userDetails}>
            <span className={styles.userName}>{user?.nickname}</span>
            <span className={styles.userRole}>{roleText}</span>
          </div>
        </div>

        {/* 团队信息设置卡片 */}
        <div className={styles.formCard}>
          <div className={styles.formTitle}>
            {t('space.pleaseCompleteInfo', { enterpriseType })}
          </div>

          {/* 团队图标 */}
          <div className={styles.teamIcon}>
            <div className={styles.iconPlaceholder}>
              {reUploadImg && (
                <div
                  className={styles.upHoverBtn}
                  onMouseLeave={() => setReUploadImg(false)}
                  onClick={() => setTriggerChild(true)}
                >
                  <img
                    className={styles.upHoverIcon}
                    src={defaultUploadIcon}
                    alt={t('space.upload')}
                  />
                </div>
              )}
              <img
                src={logoUrl}
                alt={t('space.avatar')}
                className={styles.avatarImg}
                onMouseEnter={() => setReUploadImg(true)}
              />
            </div>
          </div>

          {/* 表单字段 */}
          <div className={styles.formFields}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                {t('space.name', { enterpriseType })}
              </label>
              <Input
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder={textConfig.emptyTip}
                variant="borderless"
                className={styles.fieldInput}
                maxLength={20}
                showCount
              />
            </div>
          </div>

          {/* 创建按钮 */}
          <Button
            type="primary"
            size="large"
            loading={loading}
            onClick={handleCreateTeam}
            className={styles.createButton}
            block
          >
            {t('space.create', { enterpriseType })}
          </Button>
        </div>
      </div>
      <UploadImage
        onSuccess={res => {
          setTriggerChild(false);
          setLogoUrl(res);
          message.success(t('space.avatarUploadSuccess'));
        }}
        onClose={() => {
          setTriggerChild(false);
        }}
        onAction={triggerChild ? triggerFileSelectPopup : null}
      />
    </div>
  );
};

export default TeamCreate;
