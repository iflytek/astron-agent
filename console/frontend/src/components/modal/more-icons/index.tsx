import React, { useState, FC } from 'react';
import { Button, Upload, Slider, Input, Spin, UploadProps } from 'antd';
import { avatarGenerationMethods } from '@/constants';
import uploadAct from '@/assets/imgs/knowledge/icon_zhishi_upload_act.png';
import zoomIn from '@/assets/imgs/main/icon_zoomin.png';
import zoomOut from '@/assets/imgs/main/icon_zoomout.png';
import placeholderImage from '@/assets/imgs/common/ai_chat_placeholder.png';
import close from '@/assets/imgs/workflow/modal-close.png';
import { AvatarType } from '@/types/resource';
import { useMoreIcons } from './hooks/use-more-icons';

const { Dragger } = Upload;

const Image: FC<{ imageUrl: string; uploadProps: UploadProps }> = props => {
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
};

const MoreIcons: FC<{
  icons: { value?: string; name?: string; code?: string }[];
  colors: AvatarType[];
  botIcon: { value?: string; name?: string; code?: string };
  setBotIcon: (icon: { value?: string; name?: string; code?: string }) => void;
  botColor: string;
  setBotColor: (color: string) => void;
  setShowModal: (show: boolean) => void;
}> = props => {
  const {
    icons,
    colors,
    botIcon,
    setBotIcon,
    botColor,
    setBotColor,
    setShowModal,
  } = props;

  const {
    checkEnableSave,
    handleOk,
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
    setPreviewIcon,
    setGenerateImageDescription,
    setPreviewColor,
  } = useMoreIcons({
    botColor,
    botIcon,
    icons,
    colors,
    setBotIcon,
    setBotColor,
    setShowModal,
  });

  return (
    <div
      className="mask text-second text-sm font-medium"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md w-[720px]">
        <div className="text-second text-base font-semibold mb-4 flex items-center justify-between">
          <span>选择图标</span>
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
        {activeTab === 'gallery' && (
          <GalleryContent
            icons={icons}
            previewIcon={previewIcon}
            previewColor={previewColor}
            setPreviewIcon={setPreviewIcon}
            colors={colors}
            setPreviewColor={setPreviewColor}
            setShowModal={setShowModal}
          />
        )}
        {activeTab === 'upload' && (
          <UploadContent
            uploadImageObject={uploadImageObject}
            uploadProps={uploadProps}
          />
        )}
        {activeTab === 'chat' && (
          <ChatContent
            generateImageObject={generateImageObject}
            generateImageDescription={generateImageDescription}
            setGenerateImageDescription={setGenerateImageDescription}
            generateImage={generateImage}
            loading={loading}
          />
        )}
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
            保存
          </Button>
          <Button
            type="text"
            className="origin-btn px-[24px]"
            onClick={e => {
              e.stopPropagation();
              setShowModal(false);
            }}
          >
            取消
          </Button>
        </div>
      </div>
    </div>
  );
};

export const GalleryContent: FC<{
  icons: { value?: string; name?: string; code?: string }[];
  previewIcon: { value?: string; name?: string; code?: string };
  setShowModal: (show: boolean) => void;
  setPreviewIcon: (icon: {
    value?: string;
    name?: string;
    code?: string;
  }) => void;
  colors: AvatarType[];
  previewColor: string;
  setPreviewColor: (color: string) => void;
}> = props => {
  const {
    icons,
    previewIcon,
    previewColor,
    setPreviewIcon,
    colors,
    setPreviewColor,
  } = props;
  return (
    <>
      <div className="h-[160px] overflow-auto mt-7">
        <div className="text-[#101828] text-xs font-medium mb-1">常用</div>
        <div className="flex gap-4 flex-wrap">
          {icons
            .filter(item => item.code === 'common')
            .map((item, index) => (
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
        <div className="text-[#101828] text-xs font-medium mb-1 mt-7">运动</div>
        <div className="flex gap-4 flex-wrap">
          {icons
            .filter(item => item.code === 'sport')
            .map((item, index) => (
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
        <div className="text-[#101828] text-xs font-medium mb-1 mt-7">植物</div>
        <div className="flex gap-4 flex-wrap">
          {icons
            .filter(item => item.code === 'plant')
            .map((item, index) => (
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
        <div className="text-[#101828] text-xs font-medium mb-1 mt-7">探索</div>
        <div className="flex gap-4 flex-wrap">
          {icons
            .filter(item => item.code === 'explore')
            .map((item, index) => (
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
      <div className="text-[#101828] text-xs font-medium mb-1 mt-7">
        选择风格
      </div>
      <div className="flex mt-2 gap-1">
        {colors.map((item, index) => (
          <div
            key={index}
            className={`w-[40px] h-[40px] flex justify-center items-center ${item.name === previewColor ? 'color-item-active' : ''} cursor-pointer`}
            onClick={e => {
              e.stopPropagation();
              setPreviewColor(item.name || '');
            }}
          >
            <span
              className="w-[30px] h-[30px] rounded-lg"
              style={{ background: item.name }}
            ></span>
          </div>
        ))}
      </div>
    </>
  );
};

export const UploadContent: FC<{
  uploadImageObject: { downloadLink: string; s3Key: string };
  uploadProps: UploadProps;
}> = props => {
  const { uploadImageObject, uploadProps } = props;
  return (
    <div className="mt-8">
      {!uploadImageObject.downloadLink && (
        <Dragger {...uploadProps} className="icon-upload">
          <img src={uploadAct} className="w-8 h-8" alt="" />
          <div className="font-medium mt-6">
            拖拽文件至此，或者
            <span className="text-[#6356EA]">选择文件</span>
          </div>
          <p className="text-desc mt-2">
            支持上传JPG和PNG等格式的文件。单个文件不超过2MB。
          </p>
        </Dragger>
      )}
      {uploadImageObject.downloadLink && (
        <Image
          imageUrl={uploadImageObject.downloadLink}
          uploadProps={uploadProps}
        />
      )}
    </div>
  );
};

export const ChatContent: FC<{
  generateImageObject: { downloadLink: string; s3Key: string };
  generateImageDescription: string;
  setGenerateImageDescription: (description: string) => void;
  generateImage: () => void;
  loading: boolean;
}> = props => {
  const {
    generateImageObject,
    generateImageDescription,
    setGenerateImageDescription,
    generateImage,
    loading,
  } = props;
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
          placeholder="说点什么吧..."
        />
        <div className="send-btns">
          <span
            onClick={e => {
              e.stopPropagation();
              generateImage();
            }}
            className="ai-chat-img"
          ></span>
        </div>
      </div>
    </div>
  );
};

export default MoreIcons;
