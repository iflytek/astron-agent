import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getS3PresignUrl,
  uploadFileBindChat,
  unBindChatFile,
} from '@/services/chat';
import type {
  BotInfoType,
  UploadFileInfo,
  SupportUploadConfig,
} from '@/types/chat';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import useChatStore from '@/store/chat-store';

type UseChatFileUploadReturn = {
  fileList: UploadFileInfo[];
  setFileList: React.Dispatch<React.SetStateAction<UploadFileInfo[]>>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: (
    event: React.ChangeEvent<HTMLInputElement>,
    config?: SupportUploadConfig,
    uploadMaxMB?: number
  ) => void;
  triggerFileSelect: () => void;
  removeFile: (file: UploadFileInfo) => void;
  hasErrorFiles: () => boolean;
};

export default function useChatFileUpload(
  _botInfo: BotInfoType
): UseChatFileUploadReturn {
  const [fileList, setFileList] = useState<UploadFileInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploads = useRef<Map<string, XMLHttpRequest>>(new Map());
  const activeBindings = useRef<Map<string, AbortController>>(new Map());
  const currentChatId = useChatStore(state => state.currentChatId);
  // 追踪每种类型正在处理的文件数量，用于即时限制检查
  const processingCountRef = useRef<Map<string, number>>(new Map());
  const { t } = useTranslation();
  const generateFileBusinessKey = (): string => {
    const randomBytes = new Uint8Array(10);
    window.crypto.getRandomValues(randomBytes);
    const randomStr = Array.from(randomBytes, byte => byte.toString(36))
      .join('')
      .substring(2, 15);

    return `${Date.now()}-${randomStr}`;
  };

  const updateFileStatus = useCallback(
    (
      uid: string,
      fileId: string,
      status: 'pending' | 'uploading' | 'completed' | 'error',
      progress: number,
      fileUrl = '',
      error = '',
      paramName?: string,
      inputName?: string
    ) => {
      setFileList(prev =>
        prev.map(file =>
          file.uid === uid
            ? {
                ...file,
                fileId,
                status,
                progress,
                fileUrl,
                error,
                ...(paramName !== undefined && { paramName }),
                ...(inputName !== undefined && { inputName }),
              }
            : file
        )
      );
    },
    []
  );

  const validateFile = (
    file: File,
    config?: SupportUploadConfig
  ): string | null => {
    if (!config) return null;
    const acceptTypes = (config.accept || '')
      .toLowerCase()
      .split(',')
      .map(type => type.trim())
      .filter(Boolean);

    const fileName = file.name.toLowerCase();
    const isValidType = acceptTypes.some(type => {
      if (type.startsWith('.')) {
        return fileName.endsWith(type);
      }
      return (file.type || '').includes(type);
    });
    if (!isValidType)
      return t('chatPage.chatWindow.unsupportedFileType', {
        name: file.name,
      });
    return null;
  };

  // 处理选择的文件
  const processSelectedFiles = (
    files: File[],
    configOverride?: SupportUploadConfig,
    uploadMaxMB?: number
  ) => {
    // 如果传入了特定配置，使用该配置，否则使用第一个配置（兼容旧逻辑）
    const config = configOverride;

    if (!config) {
      return;
    }

    // 获取该文件类型的限制
    const limit = config.limit || 0;
    const inputName = config.name || config.type;

    // 统计当前该 inputName 的有效文件数量（排除失败状态）
    // status: 'pending' | 'uploading' | 'completed' | 'error'
    const currentTypeCount = fileList.filter(f => {
      const status = f.status || 'completed';
      // 排除失败状态
      if (status === 'error') {
        return false;
      }
      // 根据 paramName (inputName) 进行匹配
      return f.paramName === inputName;
    }).length;

    // 加上正在处理中的文件数量（防止快速连续上传时状态更新不及时）
    const processingCount = processingCountRef.current.get(inputName) || 0;
    const totalCount = currentTypeCount + processingCount;

    // 第一步：过滤文件大小
    let validFiles: File[] = files;
    if (uploadMaxMB) {
      const maxSize = uploadMaxMB * 1024 * 1024; // 转换为字节
      const oversizedFiles = files.filter(file => file.size > maxSize);

      if (oversizedFiles.length > 0) {
        const oversizedFileNames = oversizedFiles.map(f => f.name).join('、');
        message.error(
          t('chatPage.chatWindow.fileSizeExceeded', {
            name: oversizedFileNames,
            size: uploadMaxMB,
          })
        );
      }
      // 只保留符合大小要求的文件
      validFiles = files.filter(file => file.size <= maxSize);
    }

    // 第二步：根据数量限制过滤
    if (limit > 0 && totalCount + validFiles.length > limit) {
      const allowedCount = Math.max(0, limit - totalCount);
      if (allowedCount === 0) {
        message.warning(
          t('chatPage.chatWindow.fileLimitTip', {
            name: config.name,
            limit,
          })
        );
        return;
      }
      // 只保留允许的数量
      const exceededFiles = validFiles.slice(allowedCount);
      if (exceededFiles.length > 0) {
        message.warning(
          t('chatPage.chatWindow.fileLimitTip', {
            name: config.name,
            limit,
          }) + `，已忽略 ${exceededFiles.length} 个文件`
        );
      }
      validFiles = validFiles.slice(0, allowedCount);
    }

    // 第三步：验证文件类型
    const finalValidFiles: File[] = [];
    const invalidFiles: { file: File; error: string }[] = [];

    validFiles.forEach(file => {
      const validationError = validateFile(file, config);
      if (!validationError) {
        finalValidFiles.push(file);
      } else {
        invalidFiles.push({ file, error: validationError });
      }
    });

    // 显示不符合要求的文件提示
    if (invalidFiles.length > 0) {
      invalidFiles.forEach(({ file, error }) => {
        message.error(error);
      });
    }

    // 如果没有任何有效文件，直接返回
    if (finalValidFiles.length === 0) {
      return;
    }

    // 标记符合要求的文件正在处理中
    processingCountRef.current.set(
      inputName,
      processingCount + finalValidFiles.length
    );

    // 验证文件后，无论成功与否，都清除该类型的处理中计数
    // 使用 setTimeout 确保在下一个事件循环中清除，给 setFileList 时间执行
    setTimeout(() => {
      processingCountRef.current.set(inputName, 0);
    }, 0);

    if (finalValidFiles.length > 0) {
      const newFiles: UploadFileInfo[] = finalValidFiles.map(file => ({
        uid: generateFileBusinessKey(),
        file,
        fileName: file.name,
        fileSize: file.size,
        type: file.type,
        status: 'pending',
        fileUrl: '',
        fileBusinessKey: generateFileBusinessKey(),
        progress: 0,
        error: '',
        paramName: config.name, // 添加 paramName
        inputName: config.name, // 添加 inputName（对应 config.name）
      }));
      setFileList(prev => [...prev, ...newFiles]);
    }
  };

  const uploadFileToS3 = async (fileObj: UploadFileInfo) => {
    try {
      updateFileStatus(fileObj.uid, '', 'pending', 0, '', '');
      const signedRes = await getS3PresignUrl(fileObj.fileName, fileObj.type);
      const realFileUrl = (signedRes.url.split('?')[0] || '') as string;
      const arrayBuffer = await fileObj.file.arrayBuffer();
      updateFileStatus(fileObj.uid, '', 'uploading', 0, realFileUrl);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        activeUploads.current.set(fileObj.uid, xhr);

        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 95);
            updateFileStatus(
              fileObj.uid,
              '',
              'uploading',
              progress,
              realFileUrl
            );
          }
        });

        xhr.addEventListener('load', async () => {
          activeUploads.current.delete(fileObj.uid);
          if (xhr.status >= 200 && xhr.status < 300) {
            const bindController = new AbortController();
            activeBindings.current.set(fileObj.uid, bindController);
            try {
              const bindResult = await uploadFileBindChat(
                {
                  chatId: currentChatId,
                  fileName: fileObj.fileName,
                  fileSize: fileObj.fileSize,
                  fileUrl: realFileUrl,
                  fileBusinessKey: fileObj.fileBusinessKey,
                  paramName: fileObj.paramName, // 添加 paramName 参数
                },
                bindController.signal
              );
              activeBindings.current.delete(fileObj.uid);
              updateFileStatus(
                fileObj.uid,
                bindResult,
                'completed',
                100,
                realFileUrl,
                '',
                fileObj.paramName,
                fileObj.inputName
              );
              resolve(true);
            } catch (error: any) {
              activeBindings.current.delete(fileObj.uid);
              if (error?.name === 'AbortError') {
                updateFileStatus(
                  fileObj.uid,
                  '',
                  'error',
                  0,
                  realFileUrl,
                  t('chatPage.chatWindow.bindingCancelled')
                );
              } else {
                updateFileStatus(
                  fileObj.uid,
                  '',
                  'error',
                  0,
                  realFileUrl,
                  t('chatPage.chatWindow.bindingFailed')
                );
              }
              reject(error);
            }
          } else {
            updateFileStatus(
              fileObj.uid,
              '',
              'error',
              0,
              realFileUrl,
              t('chatPage.chatWindow.uploadFailed')
            );
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => {
          activeUploads.current.delete(fileObj.uid);
          updateFileStatus(
            fileObj.uid,
            '',
            'error',
            0,
            realFileUrl,
            t('chatPage.chatWindow.networkError')
          );
          reject(new Error('Network error'));
        });

        xhr.addEventListener('abort', () => {
          activeUploads.current.delete(fileObj.uid);
        });

        xhr.open('PUT', signedRes.url);
        xhr.setRequestHeader(
          'Content-Type',
          fileObj.type || 'application/octet-stream'
        );
        xhr.send(arrayBuffer);
      });
    } catch (error) {
      activeUploads.current.delete(fileObj.uid);
      updateFileStatus(
        fileObj.uid,
        '',
        'error',
        0,
        '',
        t('chatPage.chatWindow.getSignedUrlFailed')
      );
      throw error;
    }
  };

  const handleStartUpload = async (files: UploadFileInfo[]) => {
    const pendingFiles = files.filter(file => file.status === 'pending');
    if (pendingFiles.length === 0) return;
    const uploadPromises = pendingFiles.map(file => uploadFileToS3(file));
    await Promise.allSettled(uploadPromises);
  };

  useEffect(() => {
    void handleStartUpload(fileList);
  }, [fileList.length]);

  const cancelUpload = (uid: string) => {
    const xhr = activeUploads.current.get(uid);
    if (xhr) {
      xhr.abort();
      activeUploads.current.delete(uid);
      setFileList(prev =>
        prev.map(file =>
          file.uid === uid
            ? {
                ...file,
                status: 'pending',
                progress: 0,
                error: t('chatPage.chatWindow.uploadCancelled'),
              }
            : file
        )
      );
    }
  };

  const cancelBinding = (uid: string) => {
    const bindController = activeBindings.current.get(uid);
    if (bindController) {
      bindController.abort();
      activeBindings.current.delete(uid);
    }
  };

  const removeFile = (file: UploadFileInfo) => {
    if (file.fileId) {
      // 已绑定，调用解绑
      unBindChatFile({ chatId: currentChatId, fileId: file.fileId });
      setFileList(prev => prev.filter(f => f.fileId !== file.fileId));
    } else {
      // 未绑定：取消上传与绑定
      cancelUpload(file.uid);
      cancelBinding(file.uid);
      setFileList(prev => prev.filter(f => f.uid !== file.uid));
    }
  };

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    config?: SupportUploadConfig,
    uploadMaxMB?: number
  ) => {
    const selectedFiles = Array.from(event.target.files || []);
    processSelectedFiles(selectedFiles, config, uploadMaxMB);
    if (event.target) event.target.value = '';
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const hasErrorFiles = (): boolean =>
    fileList.some(file => file.status === 'error');

  return {
    fileList,
    setFileList,
    fileInputRef,
    handleFileSelect,
    triggerFileSelect,
    removeFile,
    hasErrorFiles,
  };
}
