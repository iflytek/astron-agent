import Compressor from 'compressorjs';
import { message } from 'antd';
import { CroppedAreaPixels } from './use-image-crop-upload';

// File validation helpers
export const validateImageFile = (
  file: File,
  maxSizeMB: number,
  t?: (key: string, params?: Record<string, any>) => string,
  tKeyOnlyImage?: string,
  tKeyFileTooLarge?: string
): boolean => {
  if (!file.type.startsWith('image/')) {
    if (t && tKeyOnlyImage) {
      message.error(t(tKeyOnlyImage));
    } else {
      message.error('只能上传图片');
    }
    return false;
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    if (t && tKeyFileTooLarge) {
      message.error(t(tKeyFileTooLarge, { size: maxSizeMB }));
    } else {
      message.error(`文件大小不能超过${maxSizeMB}MB`);
    }
    return false;
  }

  return true;
};

// Image compression helper
export const compressImageFile = (
  imageFile: File,
  quality: number,
  convertSize: number
): Promise<File> => {
  return new Promise<File>((resolve, reject) => {
    new Compressor(imageFile, {
      quality,
      convertSize,
      success(result: any) {
        const newFile: any = new File(
          [result],
          result.name || 'compressed-image.jpeg',
          {
            type: result.type,
            lastModified: result.lastModified,
          }
        );
        resolve(newFile);
      },
      error(err: any) {
        reject(err);
      },
    });
  });
};

// Canvas cropping helper
export const createCroppedCanvas = (
  imageSrc: string,
  croppedAreaPixels: CroppedAreaPixels,
  onComplete: (blob: Blob) => void
): void => {
  const image = new window.Image();
  image.src = imageSrc;
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const scaleX = image.width / (image as any).naturalWidth;
      const scaleY = image.height / (image as any).naturalHeight;

      ctx.drawImage(
        image,
        croppedAreaPixels.x * scaleX,
        croppedAreaPixels.y * scaleY,
        croppedAreaPixels.width * scaleX,
        croppedAreaPixels.height * scaleY,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );
    }

    canvas.toBlob(
      blob => {
        if (blob) {
          onComplete(blob);
        }
      },
      'image/jpeg',
      1
    );
  };
};

// Performance logging helper
export const logPerformance = (
  label: string,
  times: Record<string, number>,
  logPerf: boolean
): void => {
  if (logPerf) {
    // eslint-disable-next-line no-console
    console.log(`[useImageCropUpload] ${label}:`, times);
  }
};

// File reader helper
export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
