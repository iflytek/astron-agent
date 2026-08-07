import React, { FC, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import uploadAct from '@/assets/imgs/knowledge/icon_zhishi_upload_act.png';
import close from '@/assets/imgs/knowledge/bnt_zhishi_close.png';
import check from '@/assets/imgs/knowledge/icon_dialog_check.png';
import { UploadFile } from '@/types/resource';
import { useImportData } from '../hooks/use-import-data';
import { ImportUpload } from './import-upload';

const limitMessage = false;

const ImportData: FC<{
  tag: string;
  parentId: string;
  repoId: string;
  setStep: (step: number) => void;
  uploadList: UploadFile[];
  setUploadList: React.Dispatch<React.SetStateAction<UploadFile[]>>;
  importType: string;
  setImportType: (type: string) => void;
  linkValue: string;
  setLinkValue: React.Dispatch<React.SetStateAction<string>>;
  saveDisabled: boolean;
  setSaveDisabled: (disabled: boolean) => void;
}> = props => {
  const { t } = useTranslation();
  const {
    tag,
    parentId,
    repoId,
    uploadList,
    setUploadList,
    importType,
    setImportType,
    linkValue,
    setLinkValue,

    setSaveDisabled,
  } = props;

  const allowUploadFileType = useMemo(() => {
    return tag === 'AIUI-RAG2'
      ? [
          'pdf',
          'docx',
          'doc',
          'pptx',
          'ppsx',
          'txt',
          'md',
          'jpg',
          'jpeg',
          'png',
          'bmp',
        ]
      : [
          'pdf',
          'doc',
          'docx',
          'txt',
          'md',
          // 'html',
          'xlsx',
          'xls',
          'ppt',
          'pptx',
          'jpg',
          'jpeg',
          'png',
          'bmp',
        ];
  }, [tag]);

  const allowUploadFileContent = useMemo(() => {
    return tag === 'AIUI-RAG2'
      ? t('knowledge.xingchenFormatSupport')
      : t('knowledge.sparkFormatSupport');
  }, [tag, t]);

  useEffect(() => {
    const uploaded = uploadList.filter(
      item => item.status === 'done' || item.status === 'failed'
    ).length;
    const uploadedSuccess = uploadList.filter(
      item => item.status === 'done'
    ).length;
    if (
      importType === 'text' &&
      uploadList.length &&
      uploaded === uploadList.length &&
      uploadedSuccess > 0
    ) {
      setSaveDisabled(false);
    } else if (importType === 'web' && linkValue) {
      setSaveDisabled(false);
    } else {
      setSaveDisabled(true);
    }
  }, [uploadList, linkValue, importType]);

  const { fileProps, deleteFile } = useImportData({
    tag,
    uploadList,
    setUploadList,
    allowUploadFileType,
    limitMessage,
    parentId,
    repoId,
  });

  return (
    <div className="flex justify-center flex-1 w-full py-6 pt-10 overflow-auto">
      <div className="flex flex-col">
        <div className="text-lg font-medium text-second">
          {t('knowledge.chooseDataType')}
        </div>
        <div className="flex items-center w-full gap-6">
          <div
            className={`flex-1 flex justify-between items-center mt-3 border border-${
              importType === 'text' ? '[#009dff]' : '[#e7ecff]'
            } h-full rounded-lg px-6 py-4 cursor-pointer`}
            onClick={() => {
              setImportType('text');
              setLinkValue('');
              setUploadList([]);
            }}
          >
            <div>
              <div className="flex items-center">
                <img src={uploadAct} className="w-6 h-6" alt="" />
                <span className="ml-1 text-xl font-medium text-second">
                  {t('knowledge.importTextFile')}
                </span>
              </div>
              <p className="mt-2 font-medium text-desc">
                {t('knowledge.importTextFileSupport')}
              </p>
            </div>
            <div className="w-5 h-5 bg-[#6356EA] rounded-full flex justify-center items-center">
              {importType === 'text' ? (
                <img src={check} className="w-4 h-4" alt="" />
              ) : (
                <span className="border border-[#d3d3d3] w-5 h-5 rounded-full bg-[#EFF1F9]"></span>
              )}
            </div>
          </div>
          <div
            className={`flex-1 flex gap-2 justify-center items-center h-full mt-3 border border-${
              importType === 'web' ? '[#009dff]' : '[#e7ecff]'
            } rounded-lg px-6 py-4 cursor-pointer`}
            onClick={() => {
              setImportType('web');
              setUploadList([]);
            }}
          >
            <div>
              <div className="flex items-center">
                <img src={uploadAct} className="w-6 h-6" alt="" />
                <span className="ml-1 text-xl text-second">
                  {t('knowledge.importWebsiteLink')}
                </span>
              </div>
              <p className="mt-2 font-medium text-desc">
                {t('knowledge.importWebsiteLinkSupport')}
              </p>
            </div>
            <div className="w-5 h-5 bg-[#6356EA] rounded-full flex justify-center items-center">
              {importType === 'web' ? (
                <img src={check} className="w-4 h-4" alt="" />
              ) : (
                <span className="border border-[#d3d3d3] w-5 h-5 rounded-full bg-[#EFF1F9]"></span>
              )}
            </div>
            {/* <img src={comingSoon} className="w-[77px] h-[13px]" alt="" />
            <div className='flex items-center' >
              <img src={link} className="w-4 h-4" alt="" />
              <p className='ml-1 text-[#C0C4CC] text-xs font-medium'>{t('knowledge.importWebsiteLink')}</p>
            </div> */}
          </div>
        </div>
        <ImportUpload
          importType={importType}
          fileProps={fileProps}
          uploadList={uploadList}
          allowUploadFileContent={allowUploadFileContent}
          uploadAct={uploadAct}
          deleteFile={deleteFile}
          close={close}
          linkValue={linkValue}
          setLinkValue={setLinkValue}
        />
      </div>
    </div>
  );
};

export default ImportData;
