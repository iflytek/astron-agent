import React, { useState, useEffect, useRef, memo } from 'react';
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
import { Alert, Button, Spin, message } from 'antd';
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
  const currentParam = useRef(param);
  currentParam.current = param;
  const { getJoinedEnterpriseList } = useEnterprise();
  const languageCode = getLanguageCode();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  // 检查邀请是否已过期的函数
  const checkInviteExpired = (info: any) => {
    if (info?.expireTime) {
      const expireDate = new Date(info.expireTime);
      const now = new Date();
      // 确保expireDate是有效的日期对象，并且当前时间已超过过期时间且状态为待处理(1)
      if (
        info.status === 1 &&
        !isNaN(expireDate.getTime()) &&
        now > expireDate
      ) {
        return { ...info, status: 5 };
      }
    }
    return info;
  };

  useEffect(() => {
    let active = true;
    setInviteInfo({});
    setLoading(true);
    setError('');
    setBusy(false);
    if (!param) {
      setError('邀请链接不完整，请向邀请人获取有效链接。');
      setLoading(false);
      return;
    }
    getInviteByParam(param)
      .then(res => {
        if (!res?.id) throw new Error('无效邀请');
        if (active) setInviteInfo(checkInviteExpired(res));
      })
      .catch(() => {
        if (active) setError('无法读取邀请，链接可能已失效，请重试。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [param, revision]);

  const handleJoinSpace = (): void => {
    if (busy) return;
    if (!inviteInfo?.isBelong) {
      message.warning(`您已不在${inviteInfo?.type == 1 ? '空间' : '团队'}`);
      return;
    }
    if (inviteInfo?.type == 1) {
      const actionParam = param;
      setBusy(true);
      setError('');
      visitSpace(inviteInfo?.spaceId)
        .then(res => {
          if (actionParam !== currentParam.current) return;
          getLastVisitSpace();
          setSpaceType('personal');
          navigate(`/space/agent`);
          if (inviteInfo?.enterpriseId) {
            handleJoinTeam();
          }
        })
        .catch(err => {
          if (actionParam === currentParam.current)
            setError(err.msg || '无法进入，请重试。');
        })
        .finally(() => {
          if (actionParam === currentParam.current) setBusy(false);
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
        <h1>空间与团队邀请</h1>
        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              !inviteInfo?.id && param ? (
                <Button onClick={() => setRevision(value => value + 1)}>
                  重试
                </Button>
              ) : undefined
            }
          />
        )}
        {loading && (
          <div
            className={styles.loading}
            role="status"
            aria-label="正在读取邀请"
          >
            <Spin />
          </div>
        )}
        {!loading && inviteInfo?.id && (
          <>
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
                <div className={styles.inviteTag}>
                  {t('spaceManagement.owner')}
                </div>
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
                  <Button
                    disabled={busy}
                    onClick={() => {
                      if (busy) return;
                      const actionParam = param;
                      setBusy(true);
                      setError('');
                      refuseInvite({
                        inviteId: inviteInfo?.id,
                      })
                        .then(res => {
                          if (actionParam !== currentParam.current) return;
                          message.success(t('spaceManagement.refuseSuccess'));
                          setInviteInfo({ ...inviteInfo, status: 2 });
                        })
                        .catch(err => {
                          if (actionParam === currentParam.current)
                            setError(err.msg || '邀请处理失败，请重试。');
                        })
                        .finally(() => {
                          if (actionParam === currentParam.current)
                            setBusy(false);
                        });
                    }}
                    className={styles.refuse}
                  >
                    {t('spaceManagement.refuse')}
                  </Button>
                  <Button
                    type="primary"
                    loading={busy}
                    disabled={busy}
                    onClick={() => {
                      if (busy) return;
                      const actionParam = param;
                      setBusy(true);
                      setError('');
                      acceptInvite({
                        inviteId: inviteInfo?.id,
                      })
                        .then(res => {
                          if (actionParam !== currentParam.current) return;
                          message.success(t('spaceManagement.joinSuccess'));
                          setInviteInfo({
                            ...inviteInfo,
                            status: 3,
                            isBelong: true,
                          });
                        })
                        .catch(err => {
                          if (actionParam === currentParam.current)
                            setError(err.msg || '邀请处理失败，请重试。');
                        })
                        .finally(() => {
                          if (actionParam === currentParam.current)
                            setBusy(false);
                        });
                    }}
                    className={styles.join}
                  >
                    {t('spaceManagement.join')}
                  </Button>
                </>
              )}
              {inviteInfo?.status == 2 && (
                <div className={styles.expire}>
                  {t('spaceManagement.rejected')}
                </div>
              )}
              {inviteInfo?.status == 3 && (
                <Button
                  type="primary"
                  loading={busy}
                  onClick={handleJoinSpace}
                  className={styles.enterBotton}
                >
                  {t('spaceManagement.enter', {
                    spaceOrTeam:
                      inviteInfo?.type == 1
                        ? t('spaceManagement.space')
                        : t('spaceManagement.team'),
                  })}
                </Button>
              )}
              {inviteInfo?.status == 4 && (
                <div className={styles.expire}>
                  {t('spaceManagement.withdrawn')}
                </div>
              )}
              {inviteInfo?.status == 5 && (
                <div className={styles.expire}>
                  {t('spaceManagement.expired')}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(index);
