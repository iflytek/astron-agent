import React, { useState } from 'react';
import { message, Upload, Button, UploadFile } from 'antd';
import { v4 as uuid } from 'uuid';
import { createPortal } from 'react-dom';
import { workflowImport } from '@/services/flow';
import { typeList } from '@/constants';
import { useNavigate } from 'react-router-dom';
import i18next from 'i18next';

import close from '@/assets/imgs/workflow/modal-close.png';
import uploadAct from '@/assets/imgs/knowledge/icon_zhishi_upload_act.png';

const { Dragger } = Upload;

// 定义上传事件类型
interface FileUploadEvent {
  file: File;
  onSuccess?: (response: any, file: File) => void;
  onError?: (error: any, response: any) => void;
  onProgress?: (event: { percent: number }, file: File) => void;
}

// 定义workflowImport响应类型
interface WorkflowImportResponse {
  flowId: string;
}

// 定义自定义上传文件类型，扩展UploadFile
interface CustomUploadFile extends UploadFile {
  id: string;
  type?: string;
  total?: string;
  progress?: number;
  loaded?: number;
  file?: File;
}

function WorkflowImportModal({
  setWorkflowImportModalVisible,
}: {
  setWorkflowImportModalVisible: (visible: boolean) => void;
}) {
  const navigate = useNavigate();
  // 使用自定义类型替代原始UploadFile类型
  const [uploadList, setUploadList] = useState<CustomUploadFile[]>([]);
  const [loading, setLoading] = useState(false);

  function beforeUpload(file: UploadFile) {
    const maxSize = 20 * 1024 * 1024;
    if (file.size && file.size > maxSize) {
      message.error(
        i18next.t('workflow.promptDebugger.uploadFileSizeExceeded')
      );
      return false;
    }
    const isYml = ['yml', 'yaml'].includes(
      (file?.name?.split('.')?.pop() || '').toLowerCase()
    );
    if (!isYml) {
      message.error(
        i18next.t('workflow.promptDebugger.pleaseUploadYmlYamlFormat')
      );
      return false;
    } else {
      return true;
    }
  }

  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(sizeInBytes) / Math.log(k));

    return (
      parseFloat((sizeInBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    );
  };

  const fileUpload = (event: unknown) => {
    const file = (event as FileUploadEvent).file;
    const id = uuid();
    // 使用自定义类型创建文件对象
    const customFile: CustomUploadFile = {
      uid: id,
      id,
      name: file.name,
      type: file.name?.split('.')?.pop()?.toLowerCase(),
      progress: 0,
      status: 'uploading',
      loaded: 0,
      total: formatFileSize(file.size),
      file,
    };

    setUploadList([customFile]);
  };

  const uploadProps = {
    name: 'file',
    action: '/xingchen-api/image/upload',
    showUploadList: false,
    accept: '.yml,.yaml',
    beforeUpload,
    customRequest: fileUpload,
  };

  const handleOk = () => {
    setLoading(true);
    workflowImport({
      file: uploadList[0]?.file,
    })
      .then((value: unknown) => {
        const res = value as WorkflowImportResponse;
        setWorkflowImportModalVisible(false);
        navigate(`/work_flow/${res.flowId}/arrange`);
      })
      .catch((err: { message?: string }) => {
        message.error(err?.message ?? '导入失败');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <>
      {createPortal(
        <div
          className="mask"
          style={{
            zIndex: 1201,
          }}
        >
          <div className="modal-container w-[480px]">
            <div className="w-full flex items-center justify-between">
              <div className="text-base font-semibold">
                {i18next.t('workflow.promptDebugger.importWorkflow')}
              </div>
              <img
                src={close}
                className="w-3 h-3 cursor-pointer"
                alt=""
                onClick={() => setWorkflowImportModalVisible(false)}
              />
            </div>
            <div className="mt-6">
              <Dragger {...uploadProps} className="icon-upload">
                <img src={uploadAct} className="w-8 h-8" alt="" />
                <div className="font-medium mt-6">
                  {i18next.t('workflow.promptDebugger.dragFileHereOr')}
                  <span className="text-[#6356EA]">
                    {i18next.t('workflow.promptDebugger.selectFile')}
                  </span>
                </div>
                <p className="text-desc mt-2">
                  {i18next.t('workflow.promptDebugger.fileFormatYmlYaml')}
                </p>
              </Dragger>
            </div>
            {uploadList?.length > 0 && (
              <div className="mt-3">
                {uploadList?.map(item => (
                  <div
                    key={item?.id}
                    className="bg-[#F6F6F6] rounded-lg px-[5px] py-0.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-[22px] overflow-hidden">
                      <div
                        className="w-[32px] h-[32px] bg-[#fff] rounded-lg flex items-center justify-center"
                        style={{
                          boxShadow: '0px 2px 4px 0px rgba(46,51,68,0.04)',
                        }}
                      >
                        <img
                          src={typeList.get(item?.type || '')}
                          className="w-[18px] h-[18px]"
                          alt=""
                        />
                      </div>
                      <div className="flex-1 text-overflow" title={item?.name}>
                        {item?.name}
                      </div>
                      <div>{item?.total}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-4 mt-10">
              <Button
                type="text"
                className="origin-btn px-[24px]"
                onClick={() => setWorkflowImportModalVisible(false)}
              >
                {i18next.t('workflow.promptDebugger.cancel')}
              </Button>
              <Button
                loading={loading}
                type="primary"
                disabled={uploadList.length === 0}
                className="px-[24px]"
                onClick={handleOk}
              >
                {i18next.t('common.save')}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default WorkflowImportModal;
