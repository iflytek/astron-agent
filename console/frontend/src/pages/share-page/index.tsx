import React, { useState, useEffect, memo } from 'react';
import styles from './index.module.scss';
import shareLog from '@/assets/imgs/share-page/sharepageLog.svg';
import agentLogoTextEn from '@/assets/imgs/sidebar/agentLogoTextEn.svg';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  getInviteByParam,
  acceptInvite,
  refuseInvite,
} from '@/services/spark-common';
import { visitSpace } from '@/services/space';
import { message } from 'antd';
import spaceAvatar from '@/assets/imgs/share-page/spaceAva.svg';
import useSpaceStore from '@/store/space-store';
import { useEnterprise } from '@/hooks/use-enterprise';
import { useSpaceType } from '@/hooks/use-space-type';
import { getLanguageCode } from '@/utils/http';
import { useTranslation } from 'react-i18next';

function index() {
  const { setSpaceType, setEnterpriseId } = useSpaceStore();
  const navigate = useNavigate();
  const { getLastVisitSpace, handleTeamSwitch } = useSpaceType(navigate);
  const [inviteInfo, setInviteInfo] = useState<any>({});
  const [searchParams] = useSearchParams();
  const param = searchParams.get('param');
  const { getJoinedEnterpriseList } = useEnterprise();
  const languageCode = getLanguageCode();
  const { t } = useTranslation();
  // 检查邀请是否已过期的函数
  const checkInviteExpired = (info: any) => {
    if (info?.expireTime) {
      const expireDate = new Date(info.expireTime);
      const now = new Date();
      // 确保expireDate是有效的日期对象，并且当前时间已超过过期时间且状态为待处理(1)
      if (!isNaN(expireDate.getTime()) && now > expireDate) {
        info.status = 5;
        return { ...info };
      }
    }
    return info;
  };

  useEffect(() => {
    getInviteByParam(param)
      .then(res => {
        // 获取数据后立即检查是否过期
        const checkedInfo = checkInviteExpired(res);
        setInviteInfo(checkedInfo);
      })
      .catch(err => {
        message.error(err.msg);
      });
  }, [param]);

  // 当inviteInfo更新时，再次检查是否过期
  useEffect(() => {
    if (inviteInfo && Object.keys(inviteInfo).length > 0) {
      const checkedInfo = checkInviteExpired(inviteInfo);
      // 只有当状态发生变化时才更新，避免无限循环
      if (checkedInfo.status !== inviteInfo.status) {
        setInviteInfo(checkedInfo);
      }
    }
  }, [inviteInfo]);

  const handleJoinSpace = () => {
    if (!inviteInfo?.isBelong) {
      return message.warning(
        `您已不在${inviteInfo?.type == 1 ? '空间' : '团队'}`
      );
    }
    if (inviteInfo?.type == 1) {
      visitSpace(inviteInfo?.spaceId)
        .then(res => {
          getLastVisitSpace();
          setSpaceType('personal');
          navigate(`/space/agent`);
          if (inviteInfo?.enterpriseId) {
            handleJoinTeam();
          }
        })
        .catch(err => {
          message.error(err.msg);
        });
    } else {
      handleJoinTeam();
    }
  };
  const handleJoinTeam = () => {
    setEnterpriseId(inviteInfo?.enterpriseId);
    setSpaceType('team');
    getJoinedEnterpriseList();
    handleTeamSwitch(inviteInfo?.enterpriseId);
  };
  return (
    <div className={styles.sharePage}>
      <img
        className={styles.shareLog}
        src={languageCode === 'en-US' ? agentLogoTextEn : shareLog}
        alt=""
      />
      <div className={styles.invite}>
        <div className={styles.flex}>
          <img
            className={styles.inviteImg}
            src={inviteInfo?.inviterAvatar}
            alt=""
          />
          <div className={styles.inviteName}>{inviteInfo?.inviterName}</div>
        </div>
        <div
          title={
            inviteInfo?.type == 1
              ? inviteInfo?.spaceName
              : inviteInfo?.enterpriseName
          }
          className={styles.inviteText}
        >
          {t('spaceManagement.inviteYouToJoin')}
          {inviteInfo?.type == 1
            ? inviteInfo?.spaceName
            : inviteInfo?.enterpriseName}
        </div>
        <div className={styles.centerInfo}>
          <div>
            <img
              className={styles.infoImg}
              src={
                inviteInfo?.type == 1
                  ? inviteInfo?.spaceAvatar || spaceAvatar
                  : inviteInfo?.enterpriseAvatar || spaceAvatar
              }
              alt=""
            />
          </div>
          <div
            title={
              inviteInfo?.type == 1
                ? inviteInfo?.spaceName
                : inviteInfo?.enterpriseName
            }
            className={styles.infoTitle}
          >
            {inviteInfo?.type == 1
              ? inviteInfo?.spaceName
              : inviteInfo?.enterpriseName}
          </div>
          {inviteInfo?.type == 1 && (
            <div
              title={inviteInfo?.spaceDescription}
              className={styles.infoDesc}
            >
              {inviteInfo?.spaceDescription}
            </div>
          )}
          <div className={styles.flex}>
            <img
              className={styles.inviteImg}
              src={inviteInfo?.ownerAvatar}
              alt=""
            />
            <div className={styles.inviteName}>{inviteInfo?.ownerName}</div>
            <div className={styles.inviteTag}>{t('spaceManagement.owner')}</div>
          </div>
        </div>
        <div className={styles.inviteText}>
          {t('spaceManagement.inviteWillExpireAt', {
            expireTime: inviteInfo?.expireTime,
          })}
        </div>
        <div className={styles.flex}>
          {inviteInfo?.status == 1 && (
            <>
              <div
                onClick={() => {
                  refuseInvite({
                    inviteId: inviteInfo?.id,
                  })
                    .then(res => {
                      message.success(t('spaceManagement.refuseSuccess'));
                      inviteInfo.status = 2;
                      setInviteInfo({ ...inviteInfo });
                    })
                    .catch(err => {
                      message.error(err.msg);
                    });
                }}
                className={styles.refuse}
              >
                {t('spaceManagement.refuse')}
              </div>
              <div
                onClick={() => {
                  acceptInvite({
                    inviteId: inviteInfo?.id,
                  })
                    .then(res => {
                      message.success(t('spaceManagement.joinSuccess'));
                      inviteInfo.status = 3;
                      inviteInfo.isBelong = true;
                      setInviteInfo({ ...inviteInfo });
                    })
                    .catch(err => {
                      message.error(err.msg);
                    });
                }}
                className={styles.join}
              >
                {t('spaceManagement.join')}
              </div>
            </>
          )}
          {inviteInfo?.status == 2 && (
            <div className={styles.expire}>{t('spaceManagement.rejected')}</div>
          )}
          {inviteInfo?.status == 3 && (
            <div onClick={handleJoinSpace} className={styles.enterBotton}>
              {t('spaceManagement.enter', {
                spaceOrTeam:
                  inviteInfo?.type == 1
                    ? t('spaceManagement.space')
                    : t('spaceManagement.team'),
              })}
            </div>
          )}
          {inviteInfo?.status == 4 && (
            <div className={styles.expire}>
              {t('spaceManagement.withdrawn')}
            </div>
          )}
          {inviteInfo?.status == 5 && (
            <div className={styles.expire}>{t('spaceManagement.expired')}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(index);
