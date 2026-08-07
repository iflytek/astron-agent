import React, { useEffect, useState, useMemo } from 'react';
import { Button, Upload, Slider, Input, message, Spin } from 'antd';
import { avatarImageGenerate } from '@/services/common';
import { getFixedUrl, getAuthorization } from '@/components/workflow/utils';

import { avatarGenerationMethods } from '@/constants';
import uploadAct from '@/assets/imgs/knowledge/icon_zhishi_upload_act.png';
import zoomIn from '@/assets/imgs/main/icon_zoomin.png';
import zoomOut from '@/assets/imgs/main/icon_zoomout.png';
import placeholderImage from '@/assets/imgs/common/ai_chat_placeholder.png';
import close from '@/assets/imgs/workflow/modal-close.png';

const { Dragger } = Upload;

function Image(props): React.ReactElement {
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

const TabHeader = ({
  setShowModal,
  avatarFilterGenerationMethods,
  activeTab,
  hoverTab,
  setHoverTab,
  setActiveTab,
}): React.ReactElement => {
  return (
    <>
      <div className="text-second text-base font-semibold mb-4 flex items-center justify-between">
        <span>选择图标</span>
        <img
          src={close}
          className="w-3 h-3 cursor-pointer"
          alt=""
          onClick={() => setShowModal(false)}
        />
      </div>
      <div className="flex items-center gap-4">
        {avatarFilterGenerationMethods.map((item, index) => (
          <div
            key={index}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg cursor-pointer ${[activeTab, hoverTab].includes(item.activeTab) ? 'text-[#6356EA] bg-[#F6F9FF]' : ''}`}
            onMouseEnter={() => setHoverTab(item.activeTab)}
            onMouseLeave={() => setHoverTab('')}
            onClick={() => setActiveTab(item.activeTab)}
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
    </>
  );
};

const AvatarGallery = ({
  activeTab,
  icons,
  previewIcon,
  previewColor,
  setPreviewIcon,
  setPreviewColor,
  colors,
}): React.ReactElement | null => {
  if (activeTab !== 'gallery') return null;
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
                onClick={() => setPreviewIcon(item)}
              >
                <img src={item.name + item.value} className="w-8 h-8" alt="" />
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
                onClick={() => setPreviewIcon(item)}
              >
                <img src={item.name + item.value} className="w-8 h-8" alt="" />
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
                onClick={() => setPreviewIcon(item)}
              >
                <img src={item.name + item.value} className="w-8 h-8" alt="" />
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
                onClick={() => setPreviewIcon(item)}
              >
                <img src={item.name + item.value} className="w-8 h-8" alt="" />
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
            onClick={() => setPreviewColor(item.name)}
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

const AvatarUpload = ({
  activeTab,
  uploadImageObject,
  uploadProps,
}): React.ReactElement | null => {
  if (activeTab !== 'upload') return null;
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

const AvatarAIChat = ({
  activeTab,
  generateImageObject,
  loading,
  setGenerateImageDescription,
  generateImage,
  generateImageDescription,
}): React.ReactElement | null => {
  if (activeTab !== 'chat') return null;
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
          <span onClick={() => generateImage()} className="ai-chat-img"></span>
        </div>
      </div>
    </div>
  );
};

function index(props): React.ReactElement {
  const {
    icons,
    colors,
    botIcon,
    setBotIcon,
    botColor,
    setBotColor,
    setShowModal,
  } = props;

  const [previewIcon, setPreviewIcon] = useState<unknown>({});
  const [previewColor, setPreviewColor] = useState('');
  const [activeTab, setActiveTab] = useState<string | undefined>('upload');
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
      setPreviewIcon(icons[0]);
      setPreviewColor(colors[0].name);
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
        setGenerateImageObject(data);
      })
      .finally(() => setLoading(false));
  }

  function handleOk(): void {
    if (activeTab === 'upload') {
      setBotIcon({ ...botIcon, value: uploadImageObject.downloadLink });
      setBotColor('');
    } else {
      setBotIcon({ ...botIcon, value: generateImageObject.downloadLink });
      setBotColor('');
    }
    setShowModal(false);
  }

  function beforeUpload(file): boolean {
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
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
    ].includes(file.type.split('/').pop());
    if (!isJpgOrPng) {
      message.error('请上传JPG和PNG等格式的图片文件');
      return false;
    } else {
      return true;
    }
  }

  const uploadProps = {
    name: 'file',
    action: getFixedUrl('/image/upload'),
    headers: {
      Authorization: getAuthorization(),
    },
    showUploadList: false,
    accept: '.png,.jpg,.jpeg,.gif,.webp,.bmp,.tiff',
    beforeUpload,
    onChange: (info): void => {
      if (info.file.status === 'done') {
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
      }
    },
  };

  const checkEnableSave = useMemo(() => {
    return (
      (activeTab === 'upload' && !uploadImageObject.downloadLink) ||
      (activeTab === 'chat' && !generateImageObject.downloadLink)
    );
  }, [activeTab, uploadImageObject, generateImageObject]);

  const avatarFilterGenerationMethods = useMemo(() => {
    return avatarGenerationMethods.filter(item => item.activeTab !== 'gallery');
  }, [avatarGenerationMethods]);

  return (
    <div className="mask text-second text-sm font-medium">
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md w-[720px]">
        <TabHeader
          setShowModal={setShowModal}
          avatarFilterGenerationMethods={avatarFilterGenerationMethods}
          activeTab={activeTab}
          hoverTab={hoverTab}
          setHoverTab={setHoverTab}
          setActiveTab={setActiveTab}
        />
        <AvatarGallery
          activeTab={activeTab}
          icons={icons}
          previewIcon={previewIcon}
          previewColor={previewColor}
          setPreviewIcon={setPreviewIcon}
          setPreviewColor={setPreviewColor}
          colors={colors}
        />
        <AvatarUpload
          activeTab={activeTab}
          uploadImageObject={uploadImageObject}
          uploadProps={uploadProps}
        />
        <AvatarAIChat
          activeTab={activeTab}
          generateImageObject={generateImageObject}
          loading={loading}
          setGenerateImageDescription={setGenerateImageDescription}
          generateImage={generateImage}
          generateImageDescription={generateImageDescription}
        />
        <div className="flex flex-row-reverse gap-3 mt-7">
          <Button
            type="primary"
            disabled={checkEnableSave}
            className="px-[24px]"
            onClick={handleOk}
          >
            保存
          </Button>
          <Button
            type="text"
            className="origin-btn px-[24px]"
            onClick={() => setShowModal(false)}
          >
            取消
          </Button>
        </div>
      </div>
    </div>
  );
}

export default index;
