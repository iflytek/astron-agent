import React from 'react';
import { message } from 'antd';
import { UploadFile } from '@/types/resource';
import {
  UploadRequestOption as RcCustomRequestOptions,
  RcFile,
} from 'rc-upload/lib/interface';
import { v4 as uuid } from 'uuid';
import { generateType } from '@/utils/utils';
import { UploadFileStatus } from 'antd/es/upload/interface';
import useSpaceStore from '@/store/space-store';
import { useTranslation } from 'react-i18next';
import { DraggerProps } from 'antd/es/upload';
import { getFixedUrl } from '@/components/workflow/utils';

export const useImportData = ({
  tag,
  uploadList,
  setUploadList,
  allowUploadFileType,
  limitMessage,
  parentId,
  repoId,
}: {
  tag: string;
  uploadList: UploadFile[];
  setUploadList: React.Dispatch<React.SetStateAction<UploadFile[]>>;
  allowUploadFileType: string[];
  limitMessage: boolean;
  parentId: string;
  repoId: string;
}): {
  fileProps: DraggerProps;
  deleteFile: (id: string) => void;
} => {
  const { t } = useTranslation();
  const beforeUpload = (file: RcFile, fileList: RcFile[]): boolean => {
    const infoArr = file.name.split('.');
    const type = infoArr.pop()?.toLowerCase();
    const maxSize = ['txt', 'md'].includes(type || '')
      ? 10
      : ['jpg', 'jpeg', 'png', 'bmp'].includes(type || '')
        ? 5
        : tag === 'AIUI-RAG2'
          ? 100
          : 20;
    if (!file.size) {
      message.error(t('knowledge.uploadFileEmpty'));
      return false;
    } else if (file.size > maxSize * 1024 * 1024) {
      message.error(t('knowledge.fileSizeExceeded', { size: maxSize }));
      return false;
    }
    if (uploadList.length + fileList.length > 10) {
      if (!limitMessage) {
        limitMessage = true;
        message.error(t('knowledge.uploadFileCountExceeded'));
        window.setTimeout(() => {
          limitMessage = false;
        }, 1000);
      }
      return false;
    }
    const isJpgOrPng = allowUploadFileType.includes(type || '');
    !isJpgOrPng && message.error(t('knowledge.fileFormatIncorrect'));
    return isJpgOrPng;
  };

  const uploadComplete = async (
    event: ProgressEvent,
    id: string
  ): Promise<void> => {
    const res = JSON.parse(
      (event.currentTarget as unknown as { responseText: string })
        ?.responseText || ''
    );

    // 检查特定状态码，跳转到 /space.agent
    if (res.code === 80001 || res.code === 80004 || res.desc == '空间不存在') {
      message.error(res.desc, 3, () => {
        window.location.href = '/space/agent';
      });
      return;
    }

    if (res.code === 0) {
      setUploadList(uploadList => {
        const item = uploadList.find(i => i.id === id);
        if (item) {
          item.progress = 100;
          item.fileId = res.data.id || res?.data?.uuid;
          item.fileName = res.data.name;
          item.charCount = res.data.charCount;
          item.loaded = item.total || 0;
        }
        return [...uploadList];
      });
      window.setTimeout(() => {
        setUploadList(uploadList => {
          const item = uploadList.find(i => i.id === id);
          if (item) {
            item.status = 'done';
          }
          return [...uploadList];
        });
      }, 500);
    } else {
      setUploadList(uploadList => {
        const item = uploadList.find(i => i.id === id) || ({} as UploadFile);
        item.status = 'failed';
        return [...uploadList];
      });
      message.error(res.message);
    }
  };

  const uploadFailed = (): void => {
    console.log('Failed');
  };

  const progressFunction = (event: ProgressEvent, id: string): void => {
    if (event.lengthComputable) {
      const percentComplete = (event.loaded / event.total) * 100;
      if (percentComplete < 100) {
        setUploadList(uploadList => {
          const item = uploadList.find(i => i.id === id) || ({} as UploadFile);
          item.progress = Math.round(percentComplete);
          item.loaded = event.loaded;
          return [...uploadList];
        });
      }
    }
  };

  const fileUpload = (event: RcCustomRequestOptions): void => {
    const file = event.file as RcFile;
    const id = uuid();
    setUploadList(uploadList => {
      const type = generateType(
        file.name?.split('.').pop()?.toLowerCase() || ''
      );
      const item = {
        id,
        name: file.name,
        type,
        progress: 0,
        status: 'loading' as UploadFileStatus,
        loaded: 0,
        total: file.size,
      } as UploadFile;
      return [item, ...uploadList];
    });
    const url = getFixedUrl('/file/upload'); // 接收上传文件的后台地址
    const form = new FormData(); // FormData 对象
    form.append('file', event.file); // 文件对象
    form.append('parentId', parentId);
    form.append('repoId', repoId);
    form.append('tag', tag);
    const xhr = new XMLHttpRequest(); // XMLHttpRequest 对象
    xhr.open('post', url); //post方式，url为服务器请求地址，true 该参数规定请求是否异步处理。
    // 添加 headers
    const spaceId = useSpaceStore.getState().spaceId;
    if (spaceId) {
      xhr.setRequestHeader('space-id', spaceId);
    }

    // 如果是团队空间，添加 enterprise-id
    const spaceType = useSpaceStore.getState().spaceType;
    if (spaceType === 'team') {
      const enterpriseId = useSpaceStore.getState().enterpriseId;
      if (enterpriseId) {
        xhr.setRequestHeader('enterprise-id', enterpriseId);
      }
    }
    const currentAccessToken = localStorage.getItem('accessToken');
    xhr.setRequestHeader('Authorization', `Bearer ${currentAccessToken}`);
    xhr.onload = (event: ProgressEvent): void => {
      uploadComplete(event, id);
    }; //请求完成
    xhr.onerror = uploadFailed; //请求失败
    xhr.upload.onprogress = (event: ProgressEvent): void => {
      progressFunction(event, id);
    };
    xhr.send(form); //开始上传，发送form数据
  };

  const fileProps = {
    name: 'file',
    action: '/kbms/uploadKnowledge',
    showUploadList: false,
    accept: allowUploadFileType.map(item => `.${item}`).join(','),
    beforeUpload,
    customRequest: fileUpload,
    multiple: true,
  };

  function deleteFile(id: string): void {
    const newUploadList = uploadList.filter(item => item.id !== id);
    setUploadList([...newUploadList]);
  }

  return {
    fileProps,
    deleteFile,
  };
};
