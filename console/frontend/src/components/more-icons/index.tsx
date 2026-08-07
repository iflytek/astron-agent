import React, { useEffect, useState, useMemo } from 'react';
import {
  Button,
  Upload,
  Slider,
  Input,
  message,
  UploadProps,
  Spin,
} from 'antd';
import { UploadChangeParam, UploadFile } from 'antd/es/upload/interface';
import { useTranslation } from 'react-i18next';
import { avatarImageGenerate } from '@/services/common';

import { avatarGenerationMethods } from '@/constants';
import uploadAct from '@/assets/imgs/common/upload-file.png';
import zoomIn from '@/assets/imgs/common/zoom-in.png';
import zoomOut from '@/assets/imgs/common/zoom-out.png';
import close from '@/assets/imgs/common/close.png';
import placeholderImage from '@/assets/imgs/common/ai-chat-placeholder.png';

const { Dragger } = Upload;

// 定义组件属性类型
interface IconItem {
  name?: string;
  value?: string;
  code?: string;
}

interface ColorItem {
  name?: string;
}

interface BotIcon {
  name?: string;
  value?: string;
  code?: string;
}

interface ImageGenerateResponse {
  downloadLink: string;
  s3Key: string;
}

interface ImageProps {
  imageUrl: string;
  uploadProps: UploadProps;
}

interface IndexProps {
  icons: IconItem[];
  colors: ColorItem[];
  botIcon: BotIcon;
  setBotIcon: (icon: BotIcon) => void;
  botColor: string;
  setBotColor: (color: string) => void;
  setShowModal: (show: boolean) => void;
}

// 标签导航组件
interface TabNavigationProps {
  activeTab: string | undefined;
  hoverTab: string | undefined;
  setActiveTab: (tab: string | undefined) => void;
  setHoverTab: (tab: string | undefined) => void;
}

function TabNavigation({
  activeTab,
  hoverTab,
  setActiveTab,
  setHoverTab,
}: TabNavigationProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-4">
      {avatarGenerationMethods.map((item, index) => (
        <div
          key={index}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg cursor-pointer ${[activeTab, hoverTab].includes(item.activeTab) ? 'text-[#6356EA] bg-[#F6F9FF]' : ''}`}
          onMouseEnter={() => setHoverTab(item.activeTab)}
          onMouseLeave={() => setHoverTab('')}
          onClick={e => {
            e.stopPropagation();
            setActiveTab(item.activeTab);
          }}
        >
          <img
            src={
              [activeTab, hoverTab].includes(item.activeTab)
                ? item.iconAct
                : item.icon
            }
            className="w-[18px] h-[18px]"
            alt=""
          />
          <span className="font-medium">{item.title}</span>
        </div>
      ))}
    </div>
  );
}

// 图标画廊组件
interface GalleryTabProps {
  icons: IconItem[];
  previewIcon: BotIcon;
  previewColor: string;
  setPreviewIcon: (icon: BotIcon) => void;
}

function GalleryTab({
  icons,
  previewIcon,
  previewColor,
  setPreviewIcon,
}: GalleryTabProps): React.JSX.Element {
  const { t } = useTranslation();
  const iconCategories = [
    { code: 'common', title: t('common.moreIcons.categories.common') },
    { code: 'sport', title: t('common.moreIcons.categories.sport') },
    { code: 'plant', title: t('common.moreIcons.categories.plant') },
    { code: 'explore', title: t('common.moreIcons.categories.explore') },
  ];

  const renderIconCategory = (category: {
    code: string;
    title: string;
  }): React.JSX.Element => (
    <div key={category.code} className="first:mt-0 mt-7">
      <div className="text-[#101828] text-xs font-medium mb-1">
        {category.title}
      </div>
      <div className="flex gap-4 flex-wrap">
        {icons
          .filter((item: IconItem) => item.code === category.code)
          .map((item: IconItem, index: number) => (
            <div
              key={index}
              className="icons-item cursor-pointer"
              style={{
                background:
                  previewIcon.value === item.value ? previewColor : '',
              }}
              onClick={e => {
                e.stopPropagation();
                setPreviewIcon(item);
              }}
            >
              <img src={item.value || ''} className="w-8 h-8" alt="" />
            </div>
          ))}
      </div>
    </div>
  );

  return (
    <div className="h-[160px] overflow-auto mt-7">
      {iconCategories.map(renderIconCategory)}
    </div>
  );
}

// AI生成组件
interface GenerateTabProps {
  generateImageDescription: string;
  setGenerateImageDescription: (desc: string) => void;
  generateImage: () => void;
  loading: boolean;
  generateImageObject: ImageGenerateResponse;
}

function GenerateTab({
  generateImageDescription,
  setGenerateImageDescription,
  generateImage,
  loading,
  generateImageObject,
}: GenerateTabProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="mt-6">
      <div
        className="w-full h-[165px] flex items-center justify-center rounded-lg"
        style={{
          background:
            'linear-gradient(90deg, rgba(223, 231, 253, 0.26) 0%, rgba(239, 227, 253, 0.81) 100%)',
          border: '1px solid #E4EAFF',
        }}
      >
        <Spin spinning={loading}>
          <img
            src={
              generateImageObject.downloadLink
                ? generateImageObject.downloadLink
                : placeholderImage
            }
            className="w-[88px] h-[88px] rounded-md"
            alt=""
          />
        </Spin>
      </div>
      <div className="relative mt-4">
        <Input
          className="user-chat-input w-full"
          maxLength={80}
          value={generateImageDescription}
          onChange={e => setGenerateImageDescription(e.target.value)}
          onPressEnter={e => {
            e.stopPropagation();
            e.preventDefault();
            generateImage();
          }}
          placeholder={t('common.moreIcons.aiGeneration.placeholder')}
        />
        <div className="send-btns">
          <span
            onClick={e => {
              e.stopPropagation();
              generateImage();
            }}
            className="ai-chat-img"
          />
        </div>
      </div>
    </div>
  );
}

// 颜色选择组件
interface ColorPickerProps {
  colors: ColorItem[];
  previewColor: string;
  setPreviewColor: (color: string) => void;
  activeTab: string | undefined;
}

function ColorPicker({
  colors,
  previewColor,
  setPreviewColor,
  activeTab,
}: ColorPickerProps): React.JSX.Element {
  const { t } = useTranslation();
  if (activeTab !== 'gallery') {
    return <></>;
  }

  return (
    <div className="mt-7">
      <div className="text-[#101828] text-xs font-medium mb-2">
        {t('common.moreIcons.selectStyle')}
      </div>
      <div className="flex gap-1 flex-wrap">
        {colors.map((item: ColorItem, index: number) => (
          <div
            key={index}
            className={`w-10 h-10 rounded-lg p-[5px] cursor-pointer ${previewColor === item.name ? 'color-item-active' : ''}`}
            onClick={e => {
              e.stopPropagation();
              setPreviewColor(item.name || '');
            }}
          >
            <div
              className="w-[30px] h-[30px] rounded-lg"
              style={{ background: item.name }}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 上传组件
interface UploadTabProps {
  uploadImageObject: ImageGenerateResponse;
  uploadProps: UploadProps;
  uploadLoading: boolean;
}

function UploadTab({
  uploadImageObject,
  uploadProps,
  uploadLoading,
}: UploadTabProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="mt-8">
      {!uploadImageObject?.downloadLink && (
        <Spin spinning={uploadLoading}>
          <Dragger {...uploadProps} className="icon-upload">
            <img src={uploadAct} className="w-8 h-8" alt="" />
            <div className="font-medium mt-6">
              {t('common.moreIcons.upload.dragOrSelect')}
              <span className="text-[#6356EA]">
                {t('common.moreIcons.upload.chooseFiles')}
              </span>
            </div>
            <p className="text-desc mt-2">
              {t('common.moreIcons.upload.supportFormat')}
            </p>
          </Dragger>
        </Spin>
      )}
      {uploadImageObject?.downloadLink && (
        <Image
          imageUrl={uploadImageObject?.downloadLink}
          uploadProps={uploadProps}
        />
      )}
    </div>
  );
}

// 操作按钮组件
interface ActionButtonsProps {
  checkEnableSave: boolean;
  handleOk: () => void;
  setShowModal: (show: boolean) => void;
}

function ActionButtons({
  checkEnableSave,
  handleOk,
  setShowModal,
}: ActionButtonsProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row-reverse gap-3 mt-7">
      <Button
        type="primary"
        disabled={checkEnableSave}
        className="px-[24px]"
        onClick={e => {
          e.stopPropagation();
          handleOk();
        }}
      >
        {t('common.save')}
      </Button>
      <Button
        type="text"
        className="origin-btn px-[24px]"
        onClick={e => {
          e.stopPropagation();
          setShowModal(false);
        }}
      >
        {t('common.cancel')}
      </Button>
    </div>
  );
}

function Image(props: ImageProps): React.JSX.Element {
  const { imageUrl, uploadProps } = props;

  const [scale, setScale] = useState(1);

  return (
    <>
      <div className="w-full flex items-center justify-center">
        <Upload {...uploadProps}>
          <div className="fixed-image-box cursor-pointer">
            <div
              className="icon-image-container"
              style={{
                background: `url(${imageUrl}) no-repeat center`,
                backgroundSize: 'cover',
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
              }}
            >
              <div
                className="icon-image-container-mask"
                style={{
                  transform: `scale(${1 / scale})`,
                  transformOrigin: 'center center',
                }}
              >
                <div className="border-4 border-[#6356EA] rounded-xl w-full h-full overflow-hidden">
                  <div
                    className="icon-image-origin"
                    style={{
                      background: `url(${imageUrl}) no-repeat center`,
                      backgroundSize: 'cover',
                      transform: `scale(${scale})`,
                      transformOrigin: 'center center',
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </Upload>
      </div>
      <div className="flex items-center w-full">
        <div className="flex items-center gap-4 w-full px-10">
          <img
            src={zoomOut}
            className="w-6 h-6 cursor-pointer"
            alt=""
            onClick={() => setScale(scale > 1 ? scale - 0.1 : 1)}
          />
          <div className="pb-0.5 flex-1">
            <Slider
              min={1}
              max={2}
              step={0.1}
              value={scale}
              className="flex-1 config-slider"
              onChange={value => setScale(value)}
            />
          </div>
          <img
            src={zoomIn}
            className="w-6 h-6 cursor-pointer"
            alt=""
            onClick={() => setScale(scale < 2 ? scale + 0.1 : 2)}
          />
        </div>
      </div>
    </>
  );
}

function index(props: IndexProps): React.JSX.Element {
  const {
    icons,
    colors,
    botIcon,
    setBotIcon,
    botColor,
    setBotColor,
    setShowModal,
  } = props;

  const { t } = useTranslation();

  const [previewIcon, setPreviewIcon] = useState<BotIcon>({});
  const [previewColor, setPreviewColor] = useState('');
  const [activeTab, setActiveTab] = useState<string | undefined>('gallery');
  const [hoverTab, setHoverTab] = useState<string | undefined>('');
  const [uploadImageObject, setUploadImageObject] =
    useState<ImageGenerateResponse>({
      downloadLink: '',
      s3Key: '',
    });
  const [generateImageDescription, setGenerateImageDescription] = useState('');
  const [generateImageObject, setGenerateImageObject] =
    useState<ImageGenerateResponse>({
      downloadLink: '',
      s3Key: '',
    });
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    if (botColor) {
      setPreviewIcon({ ...botIcon });
      setPreviewColor(botColor);
    } else if (icons.length > 0 && colors.length > 0) {
      const firstIcon = icons[0];
      const firstColor = colors[0];
      if (firstIcon) {
        setPreviewIcon(firstIcon);
      }
      if (firstColor) {
        setPreviewColor(firstColor.name || '');
      }
    }
  }, [botColor, botIcon, icons, colors]);

  function generateImage(): void {
    if (loading) return;
    if (!generateImageDescription?.trim()) {
      message.error(t('common.moreIcons.validation.descriptionEmpty'));
      return;
    }
    setLoading(true);
    avatarImageGenerate(generateImageDescription)
      .then(data => {
        setGenerateImageObject(data as unknown as ImageGenerateResponse);
      })
      .finally(() => setLoading(false));
  }

  function handleOk(): void {
    if (activeTab === 'gallery') {
      setBotIcon(previewIcon);
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
    if (file.size && file.size > maxSize) {
      message.error(t('common.moreIcons.validation.fileSizeExceed'));
      return false;
    }
    const fileExtension = file.type?.split('/').pop();
    const isJpgOrPng =
      fileExtension &&
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'].includes(
        fileExtension
      );
    if (!isJpgOrPng) {
      message.error(t('common.moreIcons.validation.invalidFormat'));
      return false;
    } else {
      return true;
    }
  }

  const uploadProps: UploadProps = {
    name: 'file',
    action: 'http://172.29.201.92:8080/image/upload',
    showUploadList: false,
    accept: '.png,.jpg,.jpeg,.gif,.webp,.bmp,.tiff',
    beforeUpload,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
    onChange: (info: UploadChangeParam<UploadFile>): void => {
      if (info.file.status === 'uploading') {
        setUploadLoading(true);
      } else if (info.file.status === 'done') {
        setUploadLoading(false);
        if (
          info.file.response &&
          info.file.response.data &&
          info.file.response.code === 0
        ) {
          const data = info.file.response.data;
          setUploadImageObject(data);
        } else {
          message.error(info.file.response.message);
        }
      } else if (info.file.status === 'error') {
        setUploadLoading(false);
        message.error(t('common.moreIcons.upload.uploadFailed'));
      }
    },
  };

  const checkEnableSave = useMemo(() => {
    return (
      (activeTab === 'upload' && !uploadImageObject?.downloadLink) ||
      (activeTab === 'chat' && !generateImageObject?.downloadLink)
    );
  }, [activeTab, uploadImageObject, generateImageObject]);

  return (
    <div
      className="mask text-second text-sm font-medium"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md w-[720px]">
        <div className="text-second text-base font-semibold mb-4 flex items-center justify-between">
          <span>{t('common.moreIcons.selectIcon')}</span>
          <img
            src={close}
            className="w-3 h-3 cursor-pointer"
            alt=""
            onClick={e => {
              e.stopPropagation();
              setShowModal(false);
            }}
          />
        </div>
        <TabNavigation
          activeTab={activeTab}
          hoverTab={hoverTab}
          setActiveTab={setActiveTab}
          setHoverTab={setHoverTab}
        />
        {activeTab === 'gallery' && (
          <GalleryTab
            icons={icons}
            previewIcon={previewIcon}
            previewColor={previewColor}
            setPreviewIcon={setPreviewIcon}
          />
        )}
        <ColorPicker
          colors={colors}
          previewColor={previewColor}
          setPreviewColor={setPreviewColor}
          activeTab={activeTab}
        />
        {activeTab === 'upload' && (
          <UploadTab
            uploadImageObject={uploadImageObject}
            uploadProps={uploadProps}
            uploadLoading={uploadLoading}
          />
        )}
        {activeTab === 'chat' && (
          <GenerateTab
            generateImageDescription={generateImageDescription}
            setGenerateImageDescription={setGenerateImageDescription}
            generateImage={generateImage}
            loading={loading}
            generateImageObject={generateImageObject}
          />
        )}
        <ActionButtons
          checkEnableSave={checkEnableSave}
          handleOk={handleOk}
          setShowModal={setShowModal}
        />
      </div>
    </div>
  );
}

export default index;
