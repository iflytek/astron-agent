import React, { useState } from 'react';
import { aiGenerateCover } from '@/services/spark-common';
import { uploadFile } from '@/utils/utils';
import { Modal, message } from 'antd';
import Cropper from 'react-easy-crop';
import PulseLoader from 'react-spinners/PulseLoader';
import styles from './index.module.scss';
import classNames from 'classnames';
import defaultUploadIcon from '@/assets/imgs/space/upload.png';
import { FormattedMessage } from 'react-intl';
import { useImageCropUpload } from '@/hooks/use-image-crop-upload';
import { useTranslation } from 'react-i18next';

interface ImageCropUploadProps {
  name: string;
  botDesc: string;
  coverUrl: string;
  setCoverUrl: any;
  uploadIcon?: string;
}

const ImageCropUpload: React.FC<ImageCropUploadProps> = ({
  name,
  botDesc,
  setCoverUrl,
  coverUrl,
  uploadIcon = defaultUploadIcon,
}) => {
  const [reUploadImg, setReUploadImg] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { t } = useTranslation();
  const {
    inputRef,
    triggerFileSelectPopup,
    onFileChange,
    visible,
    closeModal,
    crop,
    setCrop,
    zoom,
    setZoom,
    onCropComplete,
    uploadedSrc,
    formData,
    isFormReady,
  } = useImageCropUpload({ logPerf: true });

  const onCancel = () => {
    closeModal();
  };

  // Convert FormData to File for S3 upload
  const convertFormDataToFile = (formData: FormData): File | null => {
    const fileEntry = formData.get('file') as File;
    return fileEntry || null;
  };

  // Handle S3 upload with progress
  const handleUploadToS3 = async (file: File): Promise<string> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      const result = await uploadFile(file, 'space');

      return result.url;
    } catch (error: any) {
      message.error(error?.message || 'Upload failed');
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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
        className={classNames(styles.box, coverUrl && styles.noBorder)}
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
              <img className={styles.up_icon} src={uploadIcon} alt="" />
            </div>
          ))}
        {reUploadImg && (
          <div
            className={styles.fake_box}
            onMouseLeave={() => setReUploadImg(false)}
          >
            <div className={styles.up_btn}>
              <img className={styles.up_icon} src={uploadIcon} alt="" />
            </div>
          </div>
        )}
      </div>
      {/* <div onClick={loading ? () => null : aiGenerateCoverFn} className={classNames(styles.generate_btn, loading && styles.loading)} >
        <img src="https://aixfyun-cn-bj.xfyun.cn/bbs/28921.014458559814/%E7%A7%91%E6%8A%80.svg" alt="" />
        <span>AI生成</span>
      </div> */}

      <Modal
        open={visible}
        centered
        onCancel={onCancel}
        closable={false}
        bodyStyle={{ height: '600px' }}
        width={600}
        maskClosable={false}
        okButtonProps={{ disabled: !isFormReady || isUploading }}
        okText={
          isUploading
            ? `${t('space.uploading')} ... ${uploadProgress}%`
            : t('space.confirm')
        }
        onOk={async () => {
          if (!formData) {
            message.info(t('space.imageProcessingNotCompleted'));
            return;
          }

          const file = convertFormDataToFile(formData);
          if (!file) {
            message.error(t('space.cannotGetImageFile'));
            return;
          }

          try {
            const uploadedUrl = await handleUploadToS3(file);
            setCoverUrl(uploadedUrl);
            closeModal();
            message.success(t('space.uploadSuccess'));
          } catch (error) {
            // Error already handled in handleUploadToS3
          }
        }}
      >
        {isUploading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <PulseLoader color="#425CFF" size={14} />
            <div style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
              {t('space.uploading')} ... {uploadProgress}%
            </div>
          </div>
        )}
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
    </div>
  );
};

export default ImageCropUpload;
