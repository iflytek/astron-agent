import { UploadFile } from '@/types/resource';
import { DraggerProps } from 'antd/es/upload';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Progress, Upload } from 'antd';
import { typeList } from '@/constants';
import { convertToKBMB } from '../utils';
import { UploadFileStatus } from 'antd/es/upload/interface';
const { Dragger } = Upload;

export const ImportUpload: FC<{
  importType: string;
  fileProps: DraggerProps;
  uploadList: UploadFile[];
  allowUploadFileContent: string;
  uploadAct: string;
  deleteFile: (id: string) => void;
  close: string;
  linkValue: string;
  setLinkValue: React.Dispatch<React.SetStateAction<string>>;
}> = ({
  importType,
  fileProps,
  uploadList,
  allowUploadFileContent,
  uploadAct,
  deleteFile,
  close,
  linkValue,
  setLinkValue,
}) => {
  const { t } = useTranslation();
  return (
    <>
      {importType === 'text' && (
        <>
          <div className="pt-3 mt-8 border-t border-[#E2E8FF] text-lg font-medium text-second">
            {t('knowledge.importTextFile')}
          </div>
          <div className="mt-3">
            <Dragger {...fileProps} className="knowledge-upload">
              <img src={uploadAct} className="w-8 h-8" alt="" />
              <div className="mt-6 text-xl font-medium text-second">
                {t('knowledge.dragAndDropFile')}{' '}
                <span className="text-[#6356EA]">
                  {t('knowledge.selectFile')}
                </span>
              </div>
              <p className="mt-4 text-desc max-w-[500px]">
                {allowUploadFileContent}
              </p>
            </Dragger>
          </div>
          <div className="flex flex-col gap-3 pb-10 mt-3">
            {uploadList.map(u => (
              <div
                key={u.id}
                className="bg-[#F6F6FD] rounded-xl p-2.5 flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center">
                  <img
                    src={typeList.get(u.type || '')}
                    className="w-[22px] h-[22px]"
                    alt=""
                  />
                  <div className="text-second text-sm ml-2.5 max-w-[500px] text-overflow">
                    {u.name}
                  </div>
                  <div className="ml-2.5 text-desc">
                    {convertToKBMB(u.total || 0)}
                  </div>
                </div>
                <div className="flex items-center">
                  {u.status === ('loading' as UploadFileStatus) && (
                    <Progress
                      className="w-[60px] upload-progress"
                      percent={u.progress || 0}
                    />
                  )}
                  <img
                    src={close}
                    className="w-4 h-4 ml-2.5 cursor-pointer hidden group-hover:inline-block"
                    onClick={() => deleteFile(u.id as string)}
                    alt=""
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {importType === 'web' && (
        <div>
          <div className="pt-8 text-lg font-medium text-second">
            {t('knowledge.uploadWebsiteLink')}
          </div>
          <div className="mt-3 text-desc">
            <p>{t('knowledge.websiteLinkSupport')}</p>
            <p> {t('knowledge.useNewlineToSeparate')}</p>
          </div>
          <div>
            <Input.TextArea
              placeholder={t('knowledge.inputMultipleLinks')}
              className="mt-3 global-textarea link-textarea"
              style={{ height: 200 }}
              value={linkValue}
              onChange={event => setLinkValue(event.target.value)}
            />
          </div>
        </div>
      )}
    </>
  );
};
