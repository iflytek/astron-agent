import { ChangeEvent, useCallback } from 'react';
import { CroppedAreaPixels } from './use-image-crop-upload';
import {
  validateImageFile,
  compressImageFile,
  logPerformance,
  readFileAsDataURL,
} from './use-image-crop-upload-helpers';

interface FileChangeHandlerOptions {
  maxSizeMB: number;
  compressQuality: number;
  compressConvertSize: number;
  logPerf: boolean;
  t?: (key: string, params?: Record<string, unknown>) => string;
  tKeyOnlyImage: string;
  tKeyFileTooLarge: string;
  setCompressedSrc: (src: string) => void;
  setFormData: (data: FormData | undefined) => void;
  setUploadedSrc: (src: string) => void;
  setVisible: (visible: boolean) => void;
}

export const createFileChangeHandler = (
  options: FileChangeHandlerOptions
): ((e: ChangeEvent<HTMLInputElement>) => Promise<void>) => {
  const {
    maxSizeMB,
    compressQuality,
    compressConvertSize,
    logPerf,
    t,
    tKeyOnlyImage,
    tKeyFileTooLarge,
    setCompressedSrc,
    setFormData,
    setUploadedSrc,
    setVisible,
  } = options;

  return useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const startTimeMs = window.performance.now();
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file) return; // Add null check for file

      // Reset state
      setCompressedSrc('');
      setFormData(undefined);

      // Validate file
      if (
        !validateImageFile(file, maxSizeMB, t, tKeyOnlyImage, tKeyFileTooLarge)
      ) {
        return;
      }

      try {
        // 1) Read and display original image
        const readStartMs = window.performance.now();
        const uploadedDataURL = await readFileAsDataURL(file);
        const loadEndMs = window.performance.now();

        logPerformance(
          '原图读取耗时(ms)',
          {
            总耗时: Number((loadEndMs - startTimeMs).toFixed(2)),
            读取: Number((loadEndMs - readStartMs).toFixed(2)),
          },
          logPerf
        );

        setUploadedSrc(uploadedDataURL);
        setVisible(true);

        // 2) Compress image in background
        const compressStartMs = window.performance.now();
        const compressedFile = await compressImageFile(
          file,
          compressQuality,
          compressConvertSize
        );
        const compressEndMs = window.performance.now();

        logPerformance(
          '压缩耗时(ms)',
          { 耗时: Number((compressEndMs - compressStartMs).toFixed(2)) },
          logPerf
        );

        const compressedDataURL = await readFileAsDataURL(compressedFile);
        setCompressedSrc(compressedDataURL);
      } catch (err: unknown) {
        // eslint-disable-next-line no-console
        console.warn(
          '[useImageCropUpload] 压缩失败，使用原图作为兜底：',
          err instanceof Error ? err.message : err
        );
      }
    },
    [
      compressConvertSize,
      compressQuality,
      logPerf,
      maxSizeMB,
      t,
      tKeyFileTooLarge,
      tKeyOnlyImage,
      setCompressedSrc,
      setFormData,
      setUploadedSrc,
      setVisible,
    ]
  );
};

export const createCropCompleteHandler = (
  compressedSrc: string,
  generateCroppedFormData: (src: string, pixels: CroppedAreaPixels) => void,
  lastCroppedAreaPixelsRef: { current: CroppedAreaPixels | null }
): ((_: unknown, croppedAreaPixels: CroppedAreaPixels) => void) => {
  return useCallback(
    (_: unknown, croppedAreaPixels: CroppedAreaPixels) => {
      lastCroppedAreaPixelsRef.current = croppedAreaPixels;
      if (compressedSrc) {
        generateCroppedFormData(compressedSrc, croppedAreaPixels);
      }
    },
    [compressedSrc, generateCroppedFormData]
  );
};
