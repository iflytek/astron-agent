import React, { useState, useRef } from 'react';
import { message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PulseLoader from 'react-spinners/PulseLoader';
import styles from './index.module.scss';
import classNames from 'classnames';
import Compressor from 'compressorjs';
import { useTranslation } from 'react-i18next';
import { aiGenerateCover } from '@/services/spark-common';

interface UploadDisplayProps {
  name?: string;
  botDesc?: string;
  coverUrl: string;
  setCoverUrl?: (url: string) => void;
  flag?: boolean;
  onImageSelected: (imageUrl: string) => void;
}

const UploadDisplay: React.FC<UploadDisplayProps> = ({
  name,
  botDesc,
  coverUrl,
  setCoverUrl,
  flag,
  onImageSelected,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const [reUploadImg, setReUploadImg] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);

  // 触发上传
  const triggerFileSelectPopup = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  const compressImage = (
    imageFile: File,
    quality: number,
    convertSize: number
  ) => {
    return new Promise<File>((resolve, reject) => {
      new Compressor(imageFile, {
        quality,
        convertSize,
        success(result: Blob) {
          const newFile = new File([result], imageFile.name, {
            type: result.type,
            lastModified: imageFile.lastModified,
          });
          resolve(newFile);
        },
        error(err) {
          console.log(err.message);
          reject(err);
        },
      });
    });
  };

  // 上传图片
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || files.length === 0) return;

    const file = files.item(0);
    if (!file) return;

    if (file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        message.error(t('configBase.fileSizeCannotExceed5MB'));
        return;
      }
      const newFile = await compressImage(file, 0.2, 1000000);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        onImageSelected(reader.result as string);
      });
      reader.readAsDataURL(newFile);
    } else {
      message.error(t('configBase.onlyUploadImage'));
    }
  };

  // ai生成图片
  const aiGenerateCoverFn = async () => {
    if (!botDesc || !name) {
      message.error(t('configBase.aiGenerateDesc'));
      return;
    }
    try {
      setLoading(true);
      const avatarRes = await aiGenerateCover({ botDesc, name });
      if (setCoverUrl) {
        setCoverUrl(avatarRes);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <div className={styles.upload_bot_cropper_image}>
      <input
        type="file"
        accept="image/*"
        ref={inputRef}
        onChange={onFileChange}
        style={{ display: 'none' }}
      />
      <div
        className={classNames(
          styles.box,
          coverUrl && styles.noBorder,
          flag && styles.flag
        )}
        onClick={loading ? () => null : triggerFileSelectPopup}
      >
        {loading && <PulseLoader color="#425CFF" size={14} />}
        {!loading &&
          (coverUrl ? (
            <img
              src={coverUrl}
              onMouseEnter={() => setReUploadImg(true)}
              alt=""
            />
          ) : (
            <div className={styles.up_btn}>
              <PlusOutlined style={{ fontSize: '26px', marginBottom: '4px' }} />
              <span>{t('configBase.clickUpload')}</span>
            </div>
          ))}
        {reUploadImg && (
          <div
            className={styles.fake_box}
            onMouseLeave={() => setReUploadImg(false)}
          >
            <div className={styles.up_btn}>
              <PlusOutlined style={{ fontSize: '26px', marginBottom: '4px' }} />
              <span>{t('configBase.reUpload')}</span>
            </div>
          </div>
        )}
      </div>
      {!flag && (
        <div
          onClick={loading ? () => null : aiGenerateCoverFn}
          className={classNames(styles.generate_btn, loading && styles.loading)}
        >
          <img
            src="https://aixfyun-cn-bj.xfyun.cn/bbs/28921.014458559814/%E7%A7%91%E6%8A%80.svg"
            alt=""
          />
          <span>{t('configBase.aiGenerate')}</span>
        </div>
      )}
    </div>
  );
};

export default UploadDisplay;
