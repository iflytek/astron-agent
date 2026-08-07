import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Table, Pagination } from 'antd';
import {
  AddFolder,
  DeleteFile,
  TagsManage,
} from './components/modal-components';
import { typeList } from '@/constants';

import { useTranslation } from 'react-i18next';

import add from '@/assets/imgs/knowledge/icon_zhishi_add_white.png';
// import more from "@/assets/imgs/common/icon_bot_setting_table_more.png";

import eptfolder from '@/assets/imgs/knowledge/icon_zhishi_eptfolder.png';
import upload from '@/assets/imgs/knowledge/pic_zhishi_bg.png';
import addfolder from '@/assets/imgs/knowledge/icon_zhishi_addfolder.png';

import search from '@/assets/imgs/file/icon_zhishi_search.png';

import { useDocumentPage } from './hooks/use-document-page';
import { useColumns } from './hooks/use-columns';
import { FileDirectoryTreeResponse, FileItem } from '@/types/resource';
import { ColumnType } from 'antd/es/table';

const statusMap = {
  '-1': 'error',
  '0': 'processing',
  '1': 'error',
  '2': 'processing',
  '3': 'processing',
  '4': 'error',
  '5': 'success',
};

const DocumentPage: FC<{
  tag: string;
  repoId: number | string;
  pid: number;
}> = ({ tag, repoId, pid }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    addFolderModal,
    modalType,
    currentFile,

    setAddFolderModal,
    deleteModal,
    setDeleteModal,
    tagsModal,
    setTagsModal,
    run,
    retrySegmentation,
    setCurrentFile,
    setModalType,
    loading,
    dataResource,
    directoryTree,
    allowUploadFileContent,

    rowProps,
    handleTableChange,
    parentId,
    setParentId,
    pagination,
    setPagination,
    searchValue,
    handleInputChange,
    searchData,
    getFiles,
  } = useDocumentPage({ tag, repoId, pid });
  const { columns } = useColumns({
    run,
    tag,
    repoId,
    pid,
    setAddFolderModal,
    setCurrentFile,
    setModalType,
    retrySegmentation,
    statusMap,
    setDeleteModal,
  });
  return (
    <div
      className="w-full h-full flex flex-col p-6 pb-2 bg-[#fff] border border-[#E2E8FF] overflow-hidden"
      style={{ borderRadius: 24 }}
    >
      {addFolderModal && (
        <AddFolder
          modalType={modalType}
          currentFile={currentFile}
          repoId={repoId as number}
          parentId={parentId as number}
          getFiles={getFiles}
          setAddFolderModal={setAddFolderModal}
        />
      )}
      {deleteModal && (
        <DeleteFile
          repoId={repoId as number}
          tag={tag}
          currentFile={currentFile}
          setDeleteModal={setDeleteModal}
          getFiles={() => {
            if (pagination.current === 1) {
              getFiles();
            } else {
              setPagination({
                ...pagination,
                current: 1,
              });
            }
          }}
        />
      )}
      {tagsModal && (
        <TagsManage
          currentFile={currentFile}
          repoId={repoId as number}
          pid={pid}
          setTagsModal={setTagsModal}
          getFiles={getFiles}
        />
      )}
      <div className="w-full flex pb-5 border-b border-[#E2E8FF]">
        <h2 className="text-2xl font-semibold text-second">
          {t('knowledge.documents')}
        </h2>
        <p className="mt-2 ml-2 font-medium desc-color">
          {t('knowledge.documentsDescription')}
        </p>
      </div>
      {!loading && parentId === -1 && dataResource.length === 0 ? (
        <div className="flex justify-center items-center mt-[72px]">
          <div
            className="flex flex-col items-center py-8 w-[766px] min-h-[238px] rounded-3xl"
            style={{
              background: `url(${upload}) no-repeat center`,
              backgroundSize: 'cover',
              border: '1px solid #E2E8FF',
            }}
          >
            <img src={eptfolder} className="w-8 h-8" alt="" />
            <div className="mt-6 text-xl font-medium text-second">
              {t('knowledge.noDocumentsInKnowledge')}
            </div>
            <p className="mt-4 text-desc max-w-[500px] text-center">
              {allowUploadFileContent}
            </p>
            <Button
              type="primary"
              className="primary-btn w-[151px] h-10 flex items-center justify-center mt-6"
              onClick={() => {
                navigate(
                  `/resource/knowledge/upload?parentId=${parentId}&repoId=${repoId}&tag=${tag}`
                );
              }}
            >
              <img src={add} className="w-4 h-4" alt="" />
              <span className="ml-2">{t('knowledge.addDocument')}</span>
            </Button>
          </div>
        </div>
      ) : (
        <DocumentPageContent
          directoryTree={directoryTree}
          setParentId={setParentId}
          pagination={pagination}
          searchValue={searchValue}
          handleInputChange={handleInputChange}
          tag={tag}
          setAddFolderModal={setAddFolderModal}
          setModalType={setModalType}
          parentId={parentId}
          repoId={repoId}
          loading={loading}
          dataResource={dataResource}
          searchData={searchData}
          rowProps={rowProps}
          handleTableChange={handleTableChange}
          columns={columns}
        />
      )}
    </div>
  );
};

export const DocumentPageContent: FC<{
  directoryTree: FileDirectoryTreeResponse[];
  setParentId: React.Dispatch<React.SetStateAction<number | string | null>>;
  pagination: { current: number; pageSize: number; total: number };
  searchValue: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  tag: string;
  setAddFolderModal: React.Dispatch<React.SetStateAction<boolean>>;
  setModalType: React.Dispatch<React.SetStateAction<string>>;
  parentId: number | string | null;
  repoId: number | string;
  loading: boolean;
  dataResource: FileItem[];
  searchData: FileItem[];
  rowProps: (record: FileItem) => { onClick?: () => void } | {};
  handleTableChange: (page: number, pageSize: number) => void;
  columns: ColumnType<FileItem>[];
}> = ({
  directoryTree,
  setParentId,
  pagination,
  searchValue,
  handleInputChange,
  tag,
  setAddFolderModal,
  setModalType,

  parentId,
  repoId,
  loading,
  dataResource,
  searchData,
  rowProps,
  handleTableChange,
  columns,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <>
      <div className="flex items-center justify-between my-4">
        <div className="flex items-center">
          {directoryTree.length > 0 && (
            <div className="flex mr-4">
              <img
                src={typeList.get('folder')}
                className="w-[22px] h-[22px] mr-2"
                alt=""
              />
              {directoryTree.map((item, index) => (
                <span key={index} className="flex items-center">
                  <span
                    title={item.name}
                    className="max-w-[100px] text-overflow cursor-pointer"
                    onClick={() => setParentId(item.parentId as number)}
                  >
                    {item.name}
                  </span>
                  {index !== directoryTree.length - 1 && <span>/</span>}
                </span>
              ))}
              <span className="bg-[#F0F3F9] rounded-md py-1 px-2 text-desc ml-2">
                {pagination.total}
                {t('knowledge.items')}
              </span>
            </div>
          )}
          <div className="relative">
            <img
              src={search}
              className="w-4 h-4 absolute left-[14px] top-[13px] z-10"
              alt=""
            />
            <Input
              className="global-input w-[320px] pl-10"
              placeholder={t('knowledge.pleaseEnter')}
              value={searchValue}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="flex items-center">
          {tag !== 'SparkDesk-RAG' && (
            <span
              className="border border-[#D7DFE9] bg-[#fff] flex items-center px-4 py-2 cursor-pointer h-10"
              style={{ borderRadius: 10 }}
              onClick={() => {
                setAddFolderModal(true);
                setModalType('create');
              }}
            >
              <img src={addfolder} className="w-4 h-4" alt="" />
              <span className="ml-2 text-sm text-second">
                {t('knowledge.addFolder')}
              </span>
            </span>
          )}
          <Button
            type="primary"
            className="primary-btn w-[151px] h-10 flex items-center justify-center ml-2"
            onClick={() => {
              navigate(
                `/resource/knowledge/upload?parentId=${parentId}&repoId=${repoId}&tag=${tag}`
              );
            }}
          >
            <img src={add} className="w-4 h-4" alt="" />
            <span className="ml-2 text-sm">{t('knowledge.addDocument')}</span>
          </Button>
        </div>
      </div>
      {loading && dataResource.length === 0 ? (
        <div className="w-full">
          <div className="w-full h-[50px] bg-[#f9fafb] flex items-center">
            <div className="flex w-1/3 pl-5">
              <div className="w-[80px] h-[20px] bg-[#f4f5fa] rounded-2xl"></div>
            </div>
            <div className="flex-1 pl-5">
              <div className="w-[80px] h-[20px] bg-[#f4f5fa] rounded-2xl"></div>
            </div>
          </div>
          <div className="w-full h-[80px] bg-[#ffffff] flex items-center">
            <div className="flex w-1/3 pl-5">
              <div className="w-[240px] h-[20px] bg-[#f7f8fc] rounded-2xl"></div>
            </div>
            <div className="flex-1 pl-5">
              <div className="w-[240px] h-[20px] bg-[#f7f8fc] rounded-2xl"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 mb-4 overflow-hidden file-list">
            <div className="h-full overflow-auto">
              <Table
                dataSource={searchValue ? searchData : dataResource}
                columns={columns}
                className="h-full document-table"
                onRow={rowProps}
                pagination={false}
                rowKey={record => record.id}
                loading={loading}
              />
            </div>
          </div>
          {!searchValue && (
            <div className="flex items-center justify-center h-[80px] px-6 relative">
              <div className="text-[#979797] text-sm pt-4 absolute left-6">
                {t('effectEvaluation.totalDataItems', {
                  count: pagination?.total,
                })}
              </div>
              <Pagination
                className="flow-pagination-tamplate custom-pagination"
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onChange={handleTableChange}
                showSizeChanger
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default DocumentPage;
