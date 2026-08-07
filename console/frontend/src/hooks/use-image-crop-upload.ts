import {
  ChangeEvent,
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createCroppedCanvas } from './use-image-crop-upload-helpers';
import {
  createFileChangeHandler,
  createCropCompleteHandler,
} from './use-image-crop-upload-core';

export interface UseImageCropUploadOptions {
  maxSizeMB?: number;
  compressQuality?: number;
  compressConvertSize?: number;
  logPerf?: boolean;
  buildFormData?: (blob: Blob) => FormData;
  formFieldName?: string;
  t?: (key: string, params?: Record<string, any>) => string;
  i18nKeys?: {
    onlyImage?: string;
    fileTooLarge?: string;
  };
}

export interface CroppedAreaPixels {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface UseImageCropUploadResult {
  inputRef: MutableRefObject<any>;
  triggerFileSelectPopup: () => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  visible: boolean;
  openModal: () => void;
  closeModal: () => void;
  crop: { x: number; y: number };
  setCrop: Dispatch<SetStateAction<{ x: number; y: number }>>;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  onCropComplete: (
    _croppedArea: unknown,
    croppedAreaPixels: CroppedAreaPixels
  ) => void;
  uploadedSrc: string;
  compressedSrc: string;
  formData?: FormData;
  isFormReady: boolean;
  reset: () => void;
}

export function useImageCropUpload(
  options?: UseImageCropUploadOptions
): UseImageCropUploadResult {
  const {
    maxSizeMB = 5,
    compressQuality = 0.2,
    compressConvertSize = 1000000,
    logPerf = false,
    buildFormData,
    formFieldName = 'file',
    t,
    i18nKeys,
  } = options || {};

  const inputRef = useRef<any>(null);
  const [visible, setVisible] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [uploadedSrc, setUploadedSrc] = useState('');
  const [compressedSrc, setCompressedSrc] = useState('');
  const [formData, setFormData] = useState<FormData>();
  const lastCroppedAreaPixelsRef = useRef<CroppedAreaPixels | null>(null);

  const tKeyOnlyImage = i18nKeys?.onlyImage || 'configBase.onlyUploadImage';
  const tKeyFileTooLarge =
    i18nKeys?.fileTooLarge || 'configBase.fileSizeCannotExceed5MB';

  const reset = useCallback(() => {
    setVisible(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setUploadedSrc('');
    setCompressedSrc('');
    setFormData(undefined);
    lastCroppedAreaPixelsRef.current = null;
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const triggerFileSelectPopup = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  }, []);

  const generateCroppedFormData = useCallback(
    (imageSrc: string, croppedAreaPixels: CroppedAreaPixels) => {
      if (!imageSrc || !croppedAreaPixels) return;

      createCroppedCanvas(imageSrc, croppedAreaPixels, (blob: Blob) => {
        if (buildFormData) {
          setFormData(buildFormData(blob));
        } else {
          const res = new FormData();
          res.append(formFieldName, blob, 'cropped-image.jpeg');
          setFormData(res);
        }
      });
    },
    [buildFormData, formFieldName]
  );

  useEffect(() => {
    if (compressedSrc && lastCroppedAreaPixelsRef.current) {
      generateCroppedFormData(compressedSrc, lastCroppedAreaPixelsRef.current);
    }
  }, [compressedSrc, generateCroppedFormData]);

  const onFileChange = createFileChangeHandler({
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
  });

  const onCropComplete = createCropCompleteHandler(
    compressedSrc,
    generateCroppedFormData,
    lastCroppedAreaPixelsRef
  );

  const openModal = useCallback(() => setVisible(true), []);
  const closeModal = useCallback(() => {
    setVisible(false);
    setUploadedSrc('');
    setZoom(1);
  }, []);

  return {
    inputRef,
    triggerFileSelectPopup,
    onFileChange,
    visible,
    openModal,
    closeModal,
    crop,
    setCrop,
    zoom,
    setZoom,
    onCropComplete,
    uploadedSrc,
    compressedSrc,
    formData,
    isFormReady: Boolean(formData),
    reset,
  };
}
