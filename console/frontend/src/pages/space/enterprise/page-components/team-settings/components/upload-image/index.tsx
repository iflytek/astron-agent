import React, { useEffect, useRef, useState } from 'react';
import { Button, message, Modal } from 'antd';
import styles from './index.module.scss';
import TeamSetCardBgImg from '@/assets/imgs/space/TeamSettingCardBg.png';
import { uploadBotImg } from '@/services/spark-common';
import Cropper from 'react-easy-crop';
import { compressImage } from '@/utils';
import { updateLogo } from '@/services/enterprise-auth-api';
import useEnterpriseStore from '@/store/enterprise-store';
import { uploadFile } from '@/utils/utils';
// 定义认证状态枚举
export enum CertificationStatus {
  NOT_CERTIFIED = 'not_certified', // 未认证
  CERTIFIED = 'certified', // 已认证
}

interface UploadImageProps {
  onSuccess: (res: any) => void;
  onClose: () => void;
  onAction: null | ((data: any) => void);
}

const UploadImage: React.FC<UploadImageProps> = ({
  onSuccess,
  onClose,
  onAction,
}) => {
  const inputRef = useRef<any>(null);
  // state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [visible, setVisible] = useState(false);
  const [uploadedSrc, setUploadedSrc] = useState(''); // 这是本地选择的图像
  const [formData, setFormData] = useState<FormData>(); // blob 二进制文件流

  // 触发上传
  const triggerFileSelectPopup = () => {
    inputRef.current.value = '';
    inputRef && inputRef?.current?.click();
  };
  useEffect(() => {
    if (onAction) {
      console.log('onAction', onAction);
      onAction(triggerFileSelectPopup);
    }
  }, [onAction]);

  const onCancel = () => {
    setVisible(false);
    setUploadedSrc('');
    onClose();
    setZoom(1);
  };
  // 上传图片
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file) return;
      if (file.type.startsWith('image/')) {
        if (file.size > 5 * 1024 * 1024) {
          message.error('文件大小不能超过5MB');
          return;
        }
        const newFile: any = await compressImage(file, 0.2, 1000000);
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          setUploadedSrc(reader.result as string);
          setVisible(true);
        });
        reader.readAsDataURL(newFile);
      } else {
        message.error('只能上传图片');
      }
    }
  };
  const onCropComplete = (_croppedArea: any, croppedAreaPixels: any) => {
    const image = new window.Image();
    image.src = uploadedSrc || '';
    image.onload = () => {
      // 确保图像已经加载
      const canvas = document.createElement('canvas');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext('2d');
      ctx &&
        ctx.drawImage(
          image,
          croppedAreaPixels.x * (image.width / image.naturalWidth),
          croppedAreaPixels.y * (image.height / image.naturalHeight),
          croppedAreaPixels.width * (image.width / image.naturalWidth),
          croppedAreaPixels.height * (image.height / image.naturalHeight),
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );
      canvas.toBlob(
        blob => {
          const res = new FormData();
          blob && res.append('file', blob, 'cropped-image.jpeg');
          setFormData(res);
        },
        'image/jpeg',
        1
      );
    };
  };

  // Convert FormData to File for upload
  const convertFormDataToFile = (formData: FormData): File | null => {
    const fileEntry =
      (formData.get('file') as File) || (formData.get('avatar') as File);
    return fileEntry || null;
  };

  const handleOk = async () => {
    if (!formData) {
      message.info('图片处理未完成，请稍候...');
      return;
    }

    const file = convertFormDataToFile(formData);
    if (!file) {
      message.error('无法获取图片文件');
      return;
    }

    try {
      const result = await uploadFile(file, 'space');
      if (result?.url) {
        onSuccess(result?.url);
      }
    } catch (error: any) {
      message.error(error?.message || '上传失败');
    }

    setVisible(false);
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        ref={inputRef}
        onChange={onFileChange}
        style={{ display: 'none' }}
      />

      <Modal
        open={visible}
        centered
        onCancel={onCancel}
        closable={false}
        style={{ height: '600px' }}
        width={600}
        maskClosable={false}
        onOk={handleOk}
      >
        {uploadedSrc && (
          <div
            style={{
              height: '500px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Cropper
              image={uploadedSrc}
              crop={crop}
              zoom={zoom}
              aspect={1} // 比例
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
        )}
      </Modal>
    </>
  );
};

export default UploadImage;
