import React from 'react';
import { Upload, message } from 'antd';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { v4 as uuid } from 'uuid';
import { getFixedUrl, getAuthorization } from '@/components/workflow/utils';

const { Dragger } = Upload;
import uploadAct from '@/assets/imgs/knowledge/icon_zhishi_upload_act.png';

interface FlowUploadProps {
  multiple?: boolean;
  uploadType?: string[];
  uploadComplete?: (event: ProgressEvent<EventTarget>, fileId: string) => void;
  handleFileUpload: (file: File, fileId: string) => void;
  maxSize: number;
}

const FlowUpload: React.FC<FlowUploadProps> = ({
  multiple = false,
  uploadType = [],
  uploadComplete = (): void => {},
  handleFileUpload,
  maxSize,
}): React.ReactElement => {
  const currentFlow = useFlowsManager(state => state.currentFlow);

  const beforeUpload = (file: File): boolean => {
    if (!file.size) {
      message.error('上传文件不能为空！');
      return false;
    } else if (file.size > maxSize * 1024 * 1024) {
      message.error(`上传文件大小不能超出${maxSize}M！`);
      return false;
    }
    const infoArr = file.name.split('.');
    const type = infoArr?.pop()?.toLowerCase();
    const isValid = uploadType.includes(type || '');
    if (!isValid) message.error('文件格式不正确');
    return isValid;
  };

  const fileUpload = (event: unknown): void => {
    const file = event.file as File;
    const fileId = uuid();
    const url = getFixedUrl('/workflow/upload-file');
    const form = new FormData();
    form.append('files', file);
    form.append('flowId', currentFlow?.flowId || '');
    const xhr = new XMLHttpRequest();
    xhr.open('post', url);
    xhr.setRequestHeader('Authorization', getAuthorization());
    xhr.onload = (event: ProgressEvent<EventTarget>): void => {
      uploadComplete(event, fileId);
    };
    xhr.send(form);
    handleFileUpload(file, fileId);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): boolean => {
    const file = event?.dataTransfer?.files?.[0];
    const infoArr = file?.name?.split('.');
    const type = infoArr?.pop();
    const isValid = uploadType?.includes(type || '');
    if (!isValid) message.error('文件格式不正确');
    return isValid;
  };

  const fileProps = {
    name: 'file',
    showUploadList: false,
    accept: uploadType.map(item => `.${item}`).join(','),
    beforeUpload,
    customRequest: fileUpload,
    multiple,
    onDrop: handleDrop,
  };

  return (
    <Dragger {...fileProps} className="icon-upload">
      <div className="flex flex-col justify-center items-center gap-2">
        <img src={uploadAct} className="w-8 h-8" alt="" />
        <div className="font-medium mt-6">
          拖拽文件至此，或者<span className="text-[#6356EA]">选择文件</span>
        </div>
        <span className="text-desc mt-2">
          文件支持{uploadType?.join('、')}格式，大小不超过{maxSize}MB
        </span>
      </div>
    </Dragger>
  );
};

export default FlowUpload;
