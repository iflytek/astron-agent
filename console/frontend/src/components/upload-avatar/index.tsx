import React, { useState } from 'react';
import UploadDisplay from './upload-display';
import CropModal from './crop-modal';

const ImageCropUpload = ({
  name,
  botDesc,
  setCoverUrl,
  coverUrl,
  flag,
}: {
  name?: string;
  botDesc?: string;
  coverUrl: string;
  setCoverUrl?: (url: string) => void;
  flag?: boolean;
}) => {
  const [visible, setVisible] = useState(false);
  const [uploadedSrc, setUploadedSrc] = useState('');

  const handleImageSelected = (imageUrl: string) => {
    setUploadedSrc(imageUrl);
    setVisible(true);
  };

  const handleCancel = () => {
    setVisible(false);
    setUploadedSrc('');
  };

  return (
    <>
      <UploadDisplay
        name={name}
        botDesc={botDesc}
        coverUrl={coverUrl}
        setCoverUrl={setCoverUrl}
        flag={flag}
        onImageSelected={handleImageSelected}
      />
      <CropModal
        visible={visible}
        uploadedSrc={uploadedSrc}
        flag={flag}
        setCoverUrl={setCoverUrl}
        onCancel={handleCancel}
      />
    </>
  );
};

export default ImageCropUpload;
