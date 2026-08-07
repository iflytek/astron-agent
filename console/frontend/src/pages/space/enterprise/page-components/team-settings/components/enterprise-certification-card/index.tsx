import React, { useEffect, useRef, useState } from 'react';
import { Button, message, Modal } from 'antd';
import styles from './index.module.scss';
import TeamSetCardBgImg from '@/assets/imgs/space/teamSettingCardBg.png';
import { uploadBotImg } from '@/services/spark-common';
import Cropper from 'react-easy-crop';
import { compressImage } from '@/utils';
import { updateLogo } from '@/services/enterprise-auth-api';
import useEnterpriseStore from '@/store/enterprise-store';
import UploadImage from '../upload-image';

// 定义认证状态枚举
export enum CertificationStatus {
  NOT_CERTIFIED = 'not_certified', // 未认证
  CERTIFIED = 'certified', // 已认证
}

interface EnterpriseCertificationCardProps {
  status: CertificationStatus;
  onUpgrade?: () => void;
}

const EnterpriseCertificationCard: React.FC<
  EnterpriseCertificationCardProps
> = ({ status, onUpgrade }) => {
  const { setEnterpriseInfo } = useEnterpriseStore();
  const [triggerChild, setTriggerChild] = useState(false);
  // 触发上传
  const triggerFileSelectPopup = (callback: () => void) => {
    setTriggerChild(false);
    callback();
  };
  // 根据状态配置内容
  const getCardConfig = () => {
    switch (status) {
      case CertificationStatus.NOT_CERTIFIED:
        return {
          title: '升级为企业认证',
          description: [
            {
              text: '导入Logo徽章为企业LOGO',
            },
            {
              text: '开通为企业认证, 团队内所有成员都享受企业认证',
            },
          ],
          showButton: true,
          buttonText: '去升级',
        };
      case CertificationStatus.CERTIFIED:
        return {
          title: '已升级为企业认证',
          description: [
            {
              text: '导入Logo徽章为企业LOGO',
              buttonText: '替换',
              onClick: () => {
                // todo
                // triggerFileSelectPopup()
                setTriggerChild(true);
              },
            },
            {
              text: '开通为企业认证, 团队内所有成员都享受企业认证',
            },
          ],
        };
      default:
        return null;
    }
  };

  const config = getCardConfig();

  const handleUpgradeClick = (buttonText: string) => {
    if (buttonText === '去升级') {
      // onUpgrade?.();
      window.open('https://console.xfyun.cn/user/authentication/company');
      return;
    }
    if (buttonText === '替换') {
      //
    }
  };

  if (!config) return null;
  return (
    <div className={`${styles.certificationCard} ${styles[status]}`}>
      <img
        className={styles.bgImg}
        src={TeamSetCardBgImg}
        alt="TeamSetCardBgImg"
      />

      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>
          {config.title}
          {config.showButton && (
            <Button
              size="small"
              type="link"
              className={styles.upgradeBtn}
              onClick={() => handleUpgradeClick(config.buttonText || '')}
            >
              {config.buttonText || ''}
            </Button>
          )}
        </h3>
        <div className={styles.cardDescription}>
          {config.description?.map((item, index) => (
            <p key={index}>
              <span className={styles.dot}>•</span>
              {item?.text}{' '}
              {'buttonText' in item && item.buttonText && (
                <span
                  className={styles.renewTag}
                  onClick={() => item?.onClick?.()}
                >
                  {item.buttonText}
                </span>
              )}
            </p>
          ))}
        </div>
      </div>
      <UploadImage
        onSuccess={res => {
          setTriggerChild(false);
          updateLogo(res)
            .then(_ => {
              message.success('logo已上传!');
              setEnterpriseInfo({ logoUrl: res });
            })
            .catch(e => {
              message.error(e?.msg || '上传失败或套餐已过期');
            });
        }}
        onClose={() => {
          setTriggerChild(false);
        }}
        onAction={triggerChild ? triggerFileSelectPopup : null}
      />
    </div>
  );
};

export default EnterpriseCertificationCard;
