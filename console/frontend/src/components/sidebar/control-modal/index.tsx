import styles from './index.module.scss';
import teamIcon from '@/assets/imgs/sidebar/team-avatar.svg';
import personalIcon from '@/assets/imgs/sidebar/person-avatar.svg';
import switchArrow from '@/assets/imgs/sidebar/switch.svg';
import personalCenterIcon from '@/assets/imgs/sidebar/person-center.svg';
import orderIcon from '@/assets/imgs/trace/orderIcon.svg';
import feedbackIcon from '@/assets/imgs/sidebar/feedback.svg';
import logoutIcon from '@/assets/imgs/sidebar/logout.svg';
// import HeaderFeedbackModal from '@/components/header-feedback-modal';
import spaceChooseIcon from '@/assets/imgs/sidebar/space-choosed.png';
// import config from '@/config/index';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import { Popover, Tooltip } from 'antd';
import useSpaceStore from '@/store/space-store';
import useEnterpriseStore from '@/store/enterprise-store';
import { useSpaceType } from '@/hooks/use-space-type';
import { useEnterprise } from '@/hooks/use-enterprise';
import { useTranslation } from 'react-i18next';
import { visitSpace } from '@/services/space';
import { handleLogout } from '@/utils/auth';
import LanguageSwitcher from '@/components/language-switcher';

const spaceRole = {
  '1': 'sidebar.spaceRoles.superAdmin',
  '2': 'sidebar.spaceRoles.admin',
  '3': 'sidebar.spaceRoles.member',
} as const;

const ControlModal = ({
  onClose,
  isPersonCenterOpen,
  setIsPersonCenterOpen,
}: {
  onClose?: () => void;
  isPersonCenterOpen: boolean;
  setIsPersonCenterOpen: (visible: boolean) => void;
}) => {
  const { joinedEnterpriseList, info, setEnterpriseInfo } =
    useEnterpriseStore();
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [showSpacePopover, setShowSpacePopover] = useState(false);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { spaceType, spaceId, enterpriseId, setSpaceType, setEnterpriseId } =
    useSpaceStore();
  const { handleTeamSwitch, getLastVisitSpace, isTeamSpace } =
    useSpaceType(navigate);
  const { visitEnterprise } = useEnterprise();

  // 根据spaceType统一获取当前空间列表和配置
  const spaceConfig = useMemo(() => {
    const isPersonal = spaceType === 'personal';
    return {
      icon: isPersonal ? personalIcon : teamIcon,
      displayType: isPersonal
        ? t('sidebar.personalEdition')
        : info?.serviceType === 3
          ? t('sidebar.customEdition')
          : info?.serviceType === 2
            ? t('sidebar.enterpriseEdition')
            : t('sidebar.teamEdition'),
      oppositeType: isPersonal
        ? info?.serviceType === 2
          ? t('sidebar.enterpriseEdition')
          : t('sidebar.teamEdition')
        : t('sidebar.personalEdition'),
      oppositeIcon: isPersonal ? teamIcon : personalIcon,
      oppositeSpaceType: isPersonal ? 'team' : 'personal', // 相反的spaceType值
      chooseSpaceId: isPersonal ? spaceId : enterpriseId,
    };
  }, [spaceType, spaceId, enterpriseId, info?.serviceType, t]);

  // 统一的空间点击处理函数
  const handleSpaceClick = (item: any) => {
    setSpaceType('team');
    handleTeamSwitch(item.id);
    onClose?.();
    setEnterpriseInfo({
      ...item,
      avatarUrl: item?.avatarUrl,
      name: item?.name,
    });
    setShowSpacePopover(false);
  };
  const handleTeamChoose = async () => {
    setEnterpriseInfo({
      id: '',
      logoUrl: '',
      avatarUrl: '',
      name: '',
      role: 0,
      roleTypeText: '',
      officerName: '',
      orgId: '',
      serviceType: 1,
      uid: '',
      createTime: '',
      updateTime: '',
      expireTime: '',
    });
    await visitEnterprise('');
    setEnterpriseId('');
    setShowSpacePopover(false);
    setSpaceType('personal');
    navigate('/space/agent');
    getLastVisitSpace();
    onClose?.();
  };
  // 选择空间弹窗内容
  const tempPopover = (
    <div className={styles.choose_content}>
      {spaceType !== 'personal' && (
        <div
          className={styles.choose_content_title}
          onClick={() => {
            handleTeamChoose();
          }}
          style={{
            borderBottom:
              joinedEnterpriseList?.length > 1
                ? '1px solid rgba(226, 232, 255, 0.5)'
                : 'none',
          }}
        >
          <img
            src={spaceConfig.oppositeIcon}
            alt="space"
            className={styles.team_icon}
          />
          <div className={styles.title_text}>
            <div className={styles.title_name}>{t('sidebar.xingchen')}</div>
            <div className={styles.title_sub}>{spaceConfig.oppositeType}</div>
          </div>
        </div>
      )}
      <div
        className={classNames(
          styles.choose_content_list,
          spaceType === 'personal' && styles.choose_content_list_personal
        )}
      >
        {joinedEnterpriseList
          ?.filter(
            (item: any) =>
              !isTeamSpace() || item.id !== Number(spaceConfig.chooseSpaceId)
          )
          ?.map((item: any) => (
            <div
              className={styles.choose_content_item}
              key={item.id}
              onClick={() => {
                handleSpaceClick(item);
              }}
            >
              <img
                src={item?.avatarUrl || teamIcon}
                alt={item.name}
                className={styles.item_icon}
              />
              <div className={styles.item_text}>
                <div className={styles.top}>
                  <Tooltip
                    title={item.name}
                    placement="top"
                    overlayClassName="black-tooltip"
                  >
                    <div className={styles.text_name}>{item.name}</div>
                  </Tooltip>
                  <div className={styles.team_permission}>
                    {t(spaceRole[String(item.role) as keyof typeof spaceRole])}
                  </div>
                </div>
                <div className={styles.text_sub}>
                  {item.serviceType === 3
                    ? t('sidebar.customEdition')
                    : item.serviceType === 2
                      ? t('sidebar.enterpriseEdition')
                      : t('sidebar.teamEdition')}
                </div>
              </div>
              {/* {item.id === Number(spaceConfig.chooseSpaceId) && (
              <img
                src={spaceChooseIcon}
                alt="choosed"
                className={styles.choose_icon}
              />
            )} */}
            </div>
          ))}
      </div>
    </div>
  );
  //个人中心点击
  const handlePersonalCenter = () => {
    setIsPersonCenterOpen(true);
    onClose?.();
  };

  //订单点击
  const handleOrder = () => {
    // navigate('/OrderManagement');
    navigate('/orderRights');
    onClose?.();
  };

  //意见反馈点击
  const handleFeedback = () => {
    setFeedbackModalVisible(true);
    onClose?.();
  };

  useEffect(() => {
    if (enterpriseId) {
      const enterprise = joinedEnterpriseList.find(
        item => Number(item.id) === Number(enterpriseId)
      );
      setEnterpriseInfo({
        ...enterprise,
        logoUrl: enterprise?.logoUrl,
        name: enterprise?.name,
      });
    }
  }, [enterpriseId, joinedEnterpriseList]);

  return (
    <div className={styles.control_modal}>
      <Popover
        placement="rightTop"
        arrow={false}
        trigger={joinedEnterpriseList?.length > 0 ? 'click' : []}
        content={tempPopover}
        overlayClassName={styles.choose_space_popover_content}
        open={showSpacePopover}
        onOpenChange={visible => {
          setShowSpacePopover(visible);
        }}
      >
        <div className={styles.title}>
          <img
            src={
              spaceType === 'personal'
                ? personalIcon
                : info.avatarUrl || spaceConfig.icon
            }
            alt="space"
            className={styles.team_icon}
          />
          <div className={styles.title_text}>
            <Tooltip
              title={spaceType === 'personal' ? '' : info.name}
              placement="top"
              overlayClassName="black-tooltip"
            >
              <div className={styles.title_name}>
                {spaceType === 'personal' ? t('sidebar.xingchen') : info.name}
              </div>
            </Tooltip>
            <div className={styles.title_sub}>{spaceConfig.displayType}</div>
          </div>
          {joinedEnterpriseList?.length > 0 && (
            <img
              src={switchArrow}
              alt="switch"
              className={styles.right_arrow}
            />
          )}
        </div>
      </Popover>

      <div className={styles.content}>
        <div className={styles.content_item} onClick={handlePersonalCenter}>
          <img src={personalCenterIcon} alt="" />
          <div>{t('sidebar.personalCenter')}</div>
        </div>
        {/* <div className={styles.content_item} onClick={handleOrder}>
          <img src={orderIcon} alt="" />
          <div>{t('sidebar.orderManagement')}</div>
        </div> */}
        {/* <div className={styles.content_item} onClick={handleFeedback}>
          <img src={feedbackIcon} alt="" />
          <div>{t('sidebar.feedback')}</div>
        </div> */}

        <div className={styles.content_item}>
          <LanguageSwitcher className={styles.content_item} />
        </div>

        <div
          className={classNames(styles.content_item, styles.logout)}
          onClick={handleLogout}
        >
          <img src={logoutIcon} alt="" />
          <div>{t('sidebar.logout')}</div>
        </div>
      </div>

      {/* <HeaderFeedbackModal
        visible={feedbackModalVisible}
        onCancel={() => {
          setFeedbackModalVisible(false);
        }}
      /> */}
    </div>
  );
};

export default ControlModal;
