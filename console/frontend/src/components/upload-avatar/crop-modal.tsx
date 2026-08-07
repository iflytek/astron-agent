import React, { useState } from 'react';
import { Modal, message } from 'antd';
import Cropper from 'react-easy-crop';
import { uploadFile } from '@/utils/utils';
import useUserStore from '@/store/user-store';

interface CropModalProps {
  visible: boolean;
  uploadedSrc: string;
  flag?: boolean;
  setCoverUrl?: (url: string) => void;
  onCancel: () => void;
}

const CropModal: React.FC<CropModalProps> = ({
  visible,
  uploadedSrc,
  flag,
  setCoverUrl,
  onCancel,
}) => {
  const userInfo = useUserStore((state: any) => state.user);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [formData, setFormData] = useState<FormData>();

  const handleCancel = () => {
    onCancel();
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const onCropComplete = (_croppedArea: any, croppedAreaPixels: any) => {
    if (typeof window === 'undefined') return;
    const image = new window.Image();
    image.src = uploadedSrc || '';
    image.onload = () => {
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
          if (!flag) {
            blob && res.append('file', blob, 'cropped-image.jpeg');
          } else {
            blob && res.append('avatar', blob, 'cropped-image.jpeg');
            res.append('nickname', userInfo.nickname);
          }
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
      const result = await uploadFile(file, flag ? 'avatar' : 'space');

      if (flag) {
        if (setCoverUrl) {
          setCoverUrl(result.url);
        }
      } else {
        // For bot image upload
        if (setCoverUrl) {
          setCoverUrl(result.url);
        }
      }
      handleCancel();
    } catch (error: any) {
      message.error(error?.message || '上传失败');
    }
  };

  return (
    <Modal
      open={visible}
      centered
      onCancel={handleCancel}
      closable={false}
      styles={{ body: { height: 600 } }}
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
            aspect={1}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>
      )}
    </Modal>
  );
};

export default CropModal;
