import { avatarImageGenerate } from '@/services/common';
import { AvatarType } from '@/types/resource';
import { message, UploadFile } from 'antd';
import { UploadChangeParam, UploadProps } from 'antd/es/upload';
import React, { useEffect, useMemo, useState } from 'react';

export const useMoreIcons = ({
  botColor,
  botIcon,
  icons,
  colors,
  setBotIcon,
  setBotColor,
  setShowModal,
}: {
  botColor: string;
  botIcon: {
    value?: string;
    name?: string;
    code?: string;
  };
  icons: { value?: string; name?: string; code?: string }[];
  colors: AvatarType[];
  setBotIcon: (icon: { value?: string; name?: string; code?: string }) => void;
  setBotColor: (color: string) => void;
  setShowModal: (show: boolean) => void;
}): {
  checkEnableSave: boolean;
  handleOk: () => void;
  beforeUpload: (file: UploadFile) => boolean;
  generateImage: () => void;
  previewIcon: {
    value?: string;
    name?: string;
    code?: string;
  };
  previewColor: string;
  activeTab: string | undefined;
  hoverTab: string | undefined;
  uploadImageObject: {
    downloadLink: string;
    s3Key: string;
  };
  generateImageDescription: string;
  generateImageObject: {
    downloadLink: string;
    s3Key: string;
  };
  loading: boolean;
  uploadProps: UploadProps;
  setActiveTab: React.Dispatch<React.SetStateAction<string | undefined>>;
  setHoverTab: React.Dispatch<React.SetStateAction<string | undefined>>;
  setGenerateImageDescription: React.Dispatch<React.SetStateAction<string>>;
  setUploadImageObject: (object: {
    downloadLink: string;
    s3Key: string;
  }) => void;
  setGenerateImageObject: React.Dispatch<
    React.SetStateAction<{
      downloadLink: string;
      s3Key: string;
    }>
  >;
  setLoading: (loading: boolean) => void;
  setPreviewIcon: React.Dispatch<
    React.SetStateAction<{
      value?: string;
      name?: string;
      code?: string;
    }>
  >;
  setPreviewColor: React.Dispatch<React.SetStateAction<string>>;
} => {
  const [previewIcon, setPreviewIcon] = useState<{
    value?: string;
    name?: string;
    code?: string;
  }>({});
  const [previewColor, setPreviewColor] = useState('');
  const [activeTab, setActiveTab] = useState<string | undefined>('gallery');
  const [hoverTab, setHoverTab] = useState<string | undefined>('');
  const [uploadImageObject, setUploadImageObject] = useState({
    downloadLink: '',
    s3Key: '',
  });
  const [generateImageDescription, setGenerateImageDescription] = useState('');
  const [generateImageObject, setGenerateImageObject] = useState({
    downloadLink: '',
    s3Key: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (botColor) {
      setPreviewIcon({ ...botIcon });
      setPreviewColor(botColor);
    } else {
      setPreviewIcon(icons[0] || {});
      setPreviewColor(colors[0]?.name || '');
    }
  }, []);

  function generateImage(): void {
    if (loading) return;
    if (!generateImageDescription?.trim()) {
      message.error('描述不能为空！');
      return;
    }
    setLoading(true);
    avatarImageGenerate(generateImageDescription)
      .then(data => {
        setGenerateImageObject(data as { downloadLink: string; s3Key: string });
      })
      .finally(() => setLoading(false));
  }

  function handleOk(): void {
    if (activeTab === 'gallery') {
      setBotIcon(previewIcon as { value: string; name: string; code: string });
      setBotColor(previewColor);
    } else if (activeTab === 'upload') {
      setBotIcon({ ...botIcon, value: uploadImageObject.downloadLink });
      setBotColor('');
    } else {
      setBotIcon({ ...botIcon, value: generateImageObject.downloadLink });
      setBotColor('');
    }

    setShowModal(false);
  }

  function beforeUpload(file: UploadFile): boolean {
    const maxSize = 2 * 1024 * 1024;
    if ((file?.size || 0) > maxSize) {
      message.error('上传文件大小不能超出2M！');
      return false;
    }
    const isJpgOrPng = [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'bmp',
      'tiff',
    ].includes(file.type?.split('/').pop() || '');
    if (!isJpgOrPng) {
      message.error('请上传JPG和PNG等格式的图片文件');
      return false;
    } else {
      return true;
    }
  }

  const uploadProps = {
    name: 'file',
    action: '/image/upload',
    showUploadList: false,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
    accept: '.png,.jpg,.jpeg,.gif,.webp,.bmp,.tiff',
    beforeUpload,
    onChange: (info: UploadChangeParam<UploadFile>): void => {
      if (info.file.status === 'done') {
        if (
          info.file.response &&
          info.file.response.data &&
          info.file.response.code === 0
        ) {
          const data = info.file.response.data;
          setUploadImageObject(data as { downloadLink: string; s3Key: string });
        } else {
          message.error(info.file.response?.message || '');
        }
      }
    },
  };

  const checkEnableSave = useMemo(() => {
    return (
      (activeTab === 'upload' && !uploadImageObject.downloadLink) ||
      (activeTab === 'chat' && !generateImageObject.downloadLink)
    );
  }, [activeTab, uploadImageObject, generateImageObject]);
  return {
    checkEnableSave,
    handleOk,
    beforeUpload,
    generateImage,
    previewIcon,
    previewColor,
    activeTab,
    hoverTab,
    uploadImageObject,
    generateImageDescription,
    generateImageObject,
    loading,
    uploadProps,
    setActiveTab,
    setHoverTab,
    setGenerateImageDescription,
    setUploadImageObject,
    setGenerateImageObject,
    setLoading,
    setPreviewIcon,
    setPreviewColor,
  };
};
