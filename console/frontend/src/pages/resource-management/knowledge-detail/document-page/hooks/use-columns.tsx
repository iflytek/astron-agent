import { typeList } from '@/constants';
import { FileItem } from '@/types/resource';
import { generateType } from '@/utils/utils';
import { useTranslation } from 'react-i18next';

import { Dropdown } from 'antd';
import { ItemType } from 'antd/es/menu/interface';
import React, { FC } from 'react';
import { ColumnType } from 'antd/es/table';

import more from '@/assets/imgs/knowledge/more.png';

import rightarow from '@/assets/imgs/knowledge/btn_zhishi_rightarow.png';

import enableIcon from '@/assets/imgs/knowledge/enable.png';
import disableIcon from '@/assets/imgs/knowledge/disable.png';
import { useNavigate } from 'react-router-dom';

export const useColumns = ({
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
}: {
  run: (record: FileItem) => void;
  tag: string;
  repoId: string | number;
  pid: string | number;
  setAddFolderModal: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentFile: React.Dispatch<React.SetStateAction<FileItem>>;
  setModalType: React.Dispatch<React.SetStateAction<string>>;
  retrySegmentation: (record: FileItem) => void;
  statusMap: Record<string, string>;

  setDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
}): {
  columns: ColumnType<FileItem>[];
} => {
  const { t } = useTranslation();

  const columns: ColumnType<FileItem>[] = [
    {
      title: t('knowledge.fileName'),
      dataIndex: 'name',
      width: '35%',
      key: 'name',
      render: (name: string, record: FileItem): React.ReactNode => {
        return (
          <div className="flex items-center">
            {record.type === 'folder' ? (
              <img src={typeList.get(record.type)} className="w-10 h-10" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#F0F3F9] flex justify-center items-center">
                <img
                  src={typeList.get(
                    generateType((record.type || '')?.toLowerCase()) || ''
                  )}
                  className="w-[22px] h-[22px]"
                  alt=""
                />
              </div>
            )}
            <span
              className="text-second font-medium ml-1.5 text-overflow max-w-[500px]"
              title={name}
              dangerouslySetInnerHTML={{ __html: name }}
            ></span>
            {record.type === 'folder' && (
              <img src={rightarow} className="w-5 h-5 ml-1" alt="" />
            )}
          </div>
        );
      },
    },
    {
      title: t('knowledge.characterCount'),
      dataIndex: 'number',
      key: 'number',
      render: (_: number, record: FileItem): React.ReactNode => {
        return record.isFile ? record.fileInfoV2?.charCount : null;
      },
    },
    {
      title: t('knowledge.hitCount'),
      dataIndex: 'hitCount',
      key: 'hitCount',
      render: (hitCount: number): React.ReactNode => {
        return (
          <div style={{ color: hitCount ? '#2f2f2f' : '#a4a4a4' }}>
            {hitCount}
          </div>
        );
      },
    },
    {
      title: t('knowledge.uploadTime'),
      dataIndex: 'createTime',
      key: 'createTime',
    },
    {
      title: t('knowledge.enabled'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (_: number, record: FileItem): React.ReactNode => {
        const enable = !!record.fileInfoV2?.enabled;
        const status = record.fileInfoV2 && record.fileInfoV2.status;
        const msg = statusMap[status as unknown as keyof typeof statusMap];
        const disabled = msg === 'error' || msg === 'processing';
        return record.isFile && tag !== 'SparkDesk-RAG' ? (
          <div
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              e.stopPropagation();
              if (disabled) return;
              run(record);
            }}
          >
            <img
              src={enable ? enableIcon : disableIcon}
              style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
              className="w-[36px]"
              alt=""
            />
          </div>
        ) : null;
      },
    },
    {
      title: t('knowledge.status'),
      dataIndex: 'status',
      key: 'status',
      render: (_: number, record: FileItem): React.ReactNode => {
        const status = record.fileInfoV2 && record.fileInfoV2.status;
        const msg = statusMap[status as unknown as keyof typeof statusMap];
        return record.isFile ? (
          <div
            className={`flex w-[80px] px-[12px] leading-[28px] justify-center rounded-[4px] ${
              msg === 'error'
                ? 'bg-[#FEEDEC] text-[#F74E43]'
                : msg === 'processing'
                  ? 'bg-[#FFF4E5] text-[#FF9602]'
                  : 'bg-[#DFFFCE] text-[#1FC92D]'
            }`}
          >
            <span className="truncate ">
              {msg === 'error'
                ? t('knowledge.parseFail')
                : msg === 'processing'
                  ? t('knowledge.progress')
                  : t('knowledge.parseSuccess')}
            </span>
          </div>
        ) : null;
      },
    },
    {
      title: t('knowledge.operations'),
      dataIndex: 'address',
      key: 'address',
      render: (_: string, record: FileItem): React.ReactNode => {
        return (
          <Operations
            record={record}
            setAddFolderModal={setAddFolderModal}
            setCurrentFile={setCurrentFile}
            setModalType={setModalType}
            retrySegmentation={retrySegmentation}
            setDeleteModal={setDeleteModal}
            statusMap={statusMap}
            tag={tag}
            repoId={repoId}
            pid={pid}
          />
        );
      },
    },
  ];
  return {
    columns,
  };
};

export const Operations: FC<{
  record: FileItem;
  setAddFolderModal: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentFile: React.Dispatch<React.SetStateAction<FileItem>>;
  setModalType: React.Dispatch<React.SetStateAction<string>>;
  retrySegmentation: (record: FileItem) => void;
  setDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  statusMap: Record<string, string>;
  tag: string;
  repoId: string | number;
  pid: string | number;
}> = ({
  record,
  setAddFolderModal,
  setCurrentFile,
  setModalType,
  retrySegmentation,
  setDeleteModal,
  statusMap,
  tag,
  repoId,
  pid,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const status = record.fileInfoV2 && record.fileInfoV2.status;
  const msg = statusMap[status as unknown as keyof typeof statusMap];

  const actions = new Map([
    [
      '1',
      (): void => {
        setAddFolderModal(true);
        setCurrentFile(record);
        setModalType('edit');
      },
    ],
    [
      '2',
      (): void => {
        navigate(
          `/resource/knowledge/detail/${repoId}/segmentation?parentId=${pid}&fileId=${record.fileId}&tag=${tag}`
        );
      },
    ],
    [
      '3',
      (): void => {
        retrySegmentation(record);
      },
    ],
    [
      '4',
      (): void => {
        setCurrentFile(record);
        setDeleteModal(true);
      },
    ],
  ]);
  const items = [
    {
      key: '1',
      label: t('common.edit'),
      hidden: record.type !== 'folder',
    },
    {
      key: '2',
      label: t('knowledge.segmentSettings'),
      hidden: record.type === 'folder' || tag === 'SparkDesk-RAG',
    },
    {
      key: '3',
      label: t('knowledge.retry'),
      hidden: record.type === 'folder' || msg !== 'error',
    },
    {
      key: '4',
      label: t('common.delete'),
    },
  ];
  return (
    <>
      <Dropdown
        menu={{
          items: items as unknown as ItemType[],
          onClick: ({ key, domEvent }) => {
            domEvent.stopPropagation();
            actions.get(key)?.();
          },
        }}
        overlayClassName="document-more-dropdown"
      >
        <img
          src={more}
          className="w-5 h-5 hover:bg-[#F2F5FE]"
          alt=""
          onClick={e => {
            e.stopPropagation();
          }}
        />
      </Dropdown>
    </>
  );
};
