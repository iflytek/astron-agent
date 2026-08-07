import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, message, Tooltip } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import SpaceButton from '@/components/button-group/space-button';
import { ModuleType, OperationType } from '@/types/permission';
import styles from './index.module.scss';

import creator from '@/assets/imgs/space/creator.png';
import defaultUploadIcon from '@/assets/imgs/space/upload.png';
import yes from '@/assets/imgs/personal-center/yes.svg';
import no from '@/assets/imgs/personal-center/no.svg';
import useEnterpriseStore from '@/store/enterprise-store';
import { useEnterprise } from '@/hooks/use-enterprise';

import {
  updateEnterpriseName,
  updateEnterpriseAvatar,
} from '@/services/enterprise';
import UploadImage from '../upload-image';

const InfoHeader = () => {
  const {
    info: { name, officerName, roleTypeText, serviceType, avatarUrl },
    setEnterpriseInfo,
  } = useEnterpriseStore();
  const { getJoinedEnterpriseList } = useEnterprise();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [reUploadImg, setReUploadImg] = useState(false);
  const [triggerChild, setTriggerChild] = useState(false);
  const [inputWidth, setInputWidth] = useState(200); // 默认宽度
  const measureRef = useRef<HTMLSpanElement>(null);
  const teamNameRef = useRef<HTMLDivElement>(null);
  const infoContentRef = useRef<HTMLDivElement>(null);

  // 触发上传
  const triggerFileSelectPopup = (callback: () => void) => {
    setTriggerChild(false);
    callback();
  };

  // 处理编辑模式切换
  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(name);
  };

  // 处理确认编辑
  const handleConfirm = async () => {
    const newName = editValue.trim();

    if (newName === '') {
      message.error('团队名称不能为空');
      return;
    }

    try {
      await updateEnterpriseName({ name: newName });
      setEnterpriseInfo({ name: newName });
      message.success('修改成功');
      setIsEditing(false);
      getJoinedEnterpriseList();
    } catch (err: any) {
      message.error(err?.msg || err?.desc);
    }
  };

  // 处理取消编辑
  const handleCancel = () => {
    setEditValue(name);
    setIsEditing(false);
  };

  // 处理输入框回车
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // 计算文本宽度
  useEffect(() => {
    if (measureRef.current && teamNameRef.current) {
      const textWidth = measureRef.current.offsetWidth;
      const containerWidth = teamNameRef.current.offsetWidth;
      // 计算最大可用宽度，预留一些空间给按钮
      const maxWidth = containerWidth - 80; // 80px 用于放置编辑按钮
      // 设置输入框宽度，确保在最小和最大宽度之间
      setInputWidth(Math.min(Math.max(textWidth + 20, 100), maxWidth));
    }
  }, [editValue]);

  return (
    <div className={styles.infoHeader} ref={infoContentRef}>
      <div className={styles.teamAvatar}>
        {reUploadImg && (
          <div
            className={styles.up_hover_btn}
            onMouseLeave={() => setReUploadImg(false)}
            onClick={() => setTriggerChild(true)}
          >
            <img
              className={styles.up_hover_icon}
              src={defaultUploadIcon}
              onClick={() => setReUploadImg(false)}
              alt=""
            />
          </div>
        )}
        <img
          src={avatarUrl}
          alt="团队头像"
          onMouseEnter={() => setReUploadImg(true)}
        />
      </div>

      <div className={styles.teamInfo}>
        <div className={styles.teamName} ref={teamNameRef}>
          {isEditing ? (
            <div className={styles.editSection}>
              <Input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="请输入团队名称"
                maxLength={50}
                showCount
                autoFocus
                size="small"
                className={styles.editInput}
                style={{ width: inputWidth }}
              />
              <span
                ref={measureRef}
                style={{
                  visibility: 'hidden',
                  position: 'absolute',
                  whiteSpace: 'pre',
                  fontSize: '14px', // 需要与Input的字体大小保持一致
                  padding: '4px 11px', // 需要与Input的padding保持一致
                }}
              >
                {editValue || '请输入团队名称'}
              </span>
              <div className={styles.editActions}>
                <Button
                  type="text"
                  icon={<img src={no} alt="" />}
                  onClick={handleCancel}
                  className={styles.cancelBtn}
                />
                <Button
                  type="text"
                  icon={<img src={yes} alt="" />}
                  onClick={handleConfirm}
                  className={styles.confirmBtn}
                />
              </div>
            </div>
          ) : (
            <div className={styles.staticName}>
              <Tooltip
                title={name}
                placement="bottom"
                getPopupContainer={() =>
                  infoContentRef.current || document.body
                }
                overlayStyle={{
                  maxWidth: '50vw',
                  maxHeight: '100vh',
                  overflow: 'auto',
                }}
              >
                <h2 className={styles.teamNameText}>{name}</h2>
              </Tooltip>
              <SpaceButton
                config={{
                  key: 'edit',
                  text: '',
                  icon: <EditOutlined />,
                  type: 'text',
                  size: 'small',
                  onClick: handleEdit,
                  permission: {
                    module: ModuleType.SPACE,
                    operation: OperationType.ENTERPRISE_EDIT,
                  },
                }}
              />
            </div>
          )}
        </div>
        <div className={styles.authInfo}>
          <div className={styles.authName}>
            <img src={creator} alt="作者头像" />
            <span className={styles.authNameText}>{officerName}</span>
          </div>
          <div className={styles.authRole}>{roleTypeText}</div>
        </div>
      </div>
      <UploadImage
        onSuccess={res => {
          setTriggerChild(false);
          updateEnterpriseAvatar(res)
            .then(_ => {
              message.success('头像已上传!');
              setEnterpriseInfo({ avatarUrl: res });
              getJoinedEnterpriseList();
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

export default InfoHeader;
