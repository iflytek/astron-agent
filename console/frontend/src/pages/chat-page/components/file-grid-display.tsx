import React, { useState, JSX } from 'react';
import clsx from 'clsx';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { getFileIcon, getStatusText } from '@/utils';
import deleteIcon from '@/assets/imgs/chat/plugin/delete-file.png';
import type { UploadFileInfo } from '@/types/chat';
import FilePreview from './file-preview';
import { useTranslation } from 'react-i18next';

export interface FileGridDisplayProps {
  /** 文件数据数组 */
  files: UploadFileInfo[];
  /** 删除文件回调 */
  onRemoveFile?: (file: UploadFileInfo) => void;
  /** 最大可见文件数，默认为4 */
  maxVisibleFiles?: number;
  /** 是否自动调整列数（根据文件数量动态调整，默认为false使用固定4列） */
  autoAdjustCols?: boolean;
}

/**
 * 通用的文件网格展示组件，支持展开收起功能
 * 包含文件预览和删除功能
 */
const FileGridDisplay: React.FC<FileGridDisplayProps> = ({
  files,
  onRemoveFile,
  maxVisibleFiles = 4,
  autoAdjustCols = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadFileInfo | undefined>();
  const { t } = useTranslation();
  /**
   * 渲染单个文件项
   */
  const renderFileItem = (file: UploadFileInfo, index: number): JSX.Element => {
    const loading = !file.fileId && file.status !== 'error';

    return (
      <div
        key={file.fileId || file.uid || index}
        className="flex items-start gap-2 bg-[#fafafa] border border-[#e8e8e8] rounded-lg cursor-pointer p-2 hover:border-[#d3dbf8] hover:bg-[#f5f5f5] transition-all relative min-w-0"
        onClick={() => setPreviewFile(file)}
      >
        {/* 文件图标 */}
        <div className="flex-shrink-0">
          <Spin
            spinning={loading}
            indicator={<LoadingOutlined spin />}
            size="small"
          >
            <img
              src={getFileIcon(file, loading)}
              alt=""
              className="w-8 h-10 object-contain"
            />
          </Spin>
        </div>

        {/* 文件信息 */}
        <div className="flex flex-col gap-1 min-w-[100px] flex-1">
          <div
            className="text-xs text-[#333] overflow-hidden text-ellipsis whitespace-nowrap leading-[1.4]"
            title={file.fileName}
          >
            {file.fileName}
          </div>

          {/* 状态信息 */}
          <div
            className="text-[11px] overflow-hidden text-ellipsis whitespace-nowrap leading-[1.4]"
            style={{ color: file.status === 'error' ? '#ff4d4f' : '#939393' }}
          >
            {getStatusText(file)}
          </div>
        </div>

        {/* 删除按钮 */}
        {onRemoveFile && (
          <img
            src={deleteIcon}
            alt=""
            className="w-4 h-4 flex-shrink-0 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
            onClick={e => {
              e.stopPropagation();
              onRemoveFile(file);
            }}
            title={
              file.fileId
                ? t('chatPage.chatWindow.deleteFile')
                : t('chatPage.chatWindow.cancelUpload')
            }
          />
        )}
      </div>
    );
  };

  /**
   * 渲染文件网格
   */
  const renderFileGrid = (): JSX.Element[] => {
    if (!files || files.length === 0) {
      return [];
    }

    const filesToShow = isExpanded ? files : files.slice(0, maxVisibleFiles);
    return filesToShow.map((file, index) => renderFileItem(file, index));
  };

  /**
   * 渲染展开/收起按钮
   */
  const renderToggleButton = (): JSX.Element | null => {
    if (files.length <= maxVisibleFiles) {
      return null;
    }

    return (
      <div
        className="flex items-center gap-1 px-3 py-1 h-14 cursor-pointer transition-all text-xs text-[#666] bg-[#f5f5f5] rounded hover:bg-[#e8e8e8] hover:text-[#333] active:scale-95 select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <img
          src="https://openres.xfyun.cn/xfyundoc/2024-03-27/2111528e-44a4-493e-baf2-1c3f7dd20812/1711540006742/%E7%BC%96%E7%BB%84%202%402x.png"
          className={clsx(
            'w-3 h-3 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
        <span className="font-medium">
          {isExpanded
            ? t('chatPage.chatWindow.fold')
            : t('chatPage.chatWindow.expand')}
        </span>
      </div>
    );
  };

  // 如果没有文件，不渲染组件
  if (!files || files.length === 0) {
    return null;
  }

  // 计算实际显示的文件数量
  const displayCount = isExpanded
    ? files.length
    : Math.min(files.length, maxVisibleFiles);

  // 根据 autoAdjustCols 决定列数
  const gridCols = autoAdjustCols ? Math.min(displayCount, 4) : 4;

  return (
    <>
      <div className="flex gap-2 mb-2 items-start w-full">
        {/* 文件网格容器 - 动态或固定列数 */}
        <div
          className={clsx(
            'grid gap-2 flex-1 min-w-0 w-full',
            gridCols === 1 && 'grid-cols-1',
            gridCols === 2 && 'grid-cols-2',
            gridCols === 3 && 'grid-cols-3',
            gridCols >= 4 && 'grid-cols-4'
          )}
        >
          {renderFileGrid()}
        </div>

        {/* 展开/收起按钮 - 固定在右侧 */}
        {renderToggleButton()}
      </div>

      {/* 文件预览组件 */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(undefined)}
        />
      )}
    </>
  );
};

export default FileGridDisplay;
