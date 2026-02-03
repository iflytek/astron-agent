import React, { useState, useEffect, JSX } from 'react';
import { Tooltip, Popover } from 'antd';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { BotInfoType, SupportUploadConfig, UploadFileInfo } from '@/types/chat';

interface MultiUploadButtonsProps {
  botInfo: BotInfoType;
  handleFileSelect: (
    event: React.ChangeEvent<HTMLInputElement>,
    config?: SupportUploadConfig,
    uploadMaxMB?: number
  ) => void;
  fileList: UploadFileInfo[];
}

const MultiUploadButtons: React.FC<MultiUploadButtonsProps> = ({
  botInfo,
  handleFileSelect,
  fileList,
}) => {
  const { t } = useTranslation();
  const [fileTypeCounts, setFileTypeCounts] = useState<Record<string, number>>(
    {}
  );
  // 统计各文件类型的数量
  useEffect(() => {
    const uploadConfigs: SupportUploadConfig[] =
      botInfo?.supportUploadConfig || [];
    const counts: Record<string, number> = {};

    // 初始化所有文件类型的计数
    uploadConfigs.forEach(config => {
      if (config.name) {
        counts[config.name] = 0;
      }
    });

    // 统计 fileList 中的有效文件
    if (fileList && Array.isArray(fileList) && fileList.length > 0) {
      fileList.forEach((file: UploadFileInfo) => {
        // 排除失败状态的文件
        const status = file.status || 'success';
        if (status === 'error') {
          return; // 跳过失败的文件
        }

        // 根据 inputName (config.name) 进行计数
        // 只计算有效文件：uploading、processing、success、pending、completed
        const inputName = file.inputName || file.type || 'unknown';
        if (
          inputName &&
          Object.prototype.hasOwnProperty.call(counts, inputName)
        ) {
          counts[inputName] = (counts[inputName] || 0) + 1;
        }
      });
    }

    setFileTypeCounts(counts);
  }, [fileList, botInfo]);

  /**
   * 获取文件类型对应的图标
   */
  const getIconUrl = (icon?: string): string => {
    if (icon === 'image') {
      return 'https://openres.xfyun.cn/xfyundoc/2024-10-23/d260123d-aa1d-4d1e-a575-22fa427deae0/1729648164577/fvadsdfgb.svg';
    }
    return 'https://openres.xfyun.cn/xfyundoc/2024-10-23/eb1e209f-e13f-4722-8561-8c564658e46d/1729648162929/adfsa.svg';
  };

  /**
   * 渲染单个上传按钮
   */
  const renderUploadButton = (
    config: SupportUploadConfig,
    index: number,
    isPopover?: boolean
  ): JSX.Element => {
    const { accept, limit, type, icon, name } = config;
    const currentCount = fileTypeCounts[name || type] || 0;
    const uploadMaxMB = icon === 'image' ? 20 : icon === 'video' ? 500 : 50;
    const isDisabled = currentCount >= (limit || 1);

    return (
      <Tooltip
        key={`upload-${index}`}
        title={t('chatPage.chatWindow.uploadTooltip', {
          accept,
          size: uploadMaxMB,
          count: limit || 1,
        })}
        placement="top"
        mouseEnterDelay={1}
        overlayClassName="black-tooltip"
      >
        <label
          className={clsx(
            'relative flex items-center justify-center gap-1.5 px-2 py-1 cursor-pointer transition-all rounded hover:bg-[#f5f5f5]',
            isDisabled && 'opacity-50 !cursor-not-allowed'
          )}
        >
          <input
            type="file"
            accept={accept}
            multiple={(limit || 0) > 1}
            onChange={e => handleFileSelect(e, config, uploadMaxMB)}
            style={{ display: 'none' }}
            disabled={isDisabled}
          />
          <img
            src={getIconUrl(icon)}
            alt={type}
            className="w-4 h-4 flex-shrink-0"
          />
          <div className="flex flex-col">
            <div className="text-xs whitespace-nowrap">
              {type} ({name})
            </div>
            {isPopover && (
              <div className="text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                {t('chatPage.chatWindow.uploadTooltip', {
                  accept,
                  size: uploadMaxMB,
                  count: limit || 1,
                })}
              </div>
            )}
          </div>
        </label>
      </Tooltip>
    );
  };

  /**
   * 渲染 Popover 内容
   */
  const renderPopoverContent = (
    uploadConfigs: SupportUploadConfig[]
  ): JSX.Element => {
    return (
      <div className="max-h-[240px] overflow-y-auto rounded-lg [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-[#f1f1f1] [&::-webkit-scrollbar-track]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-[#c1c1c1] [&::-webkit-scrollbar-thumb]:rounded-sm">
        {uploadConfigs.map((config: SupportUploadConfig, index: number) => (
          <div
            key={`popover-upload-${index}`}
            className={clsx(
              'p-2 border-b border-[#f0f0f0] rounded hover:bg-[#f5f5f5]',
              index === uploadConfigs.length - 1 && 'border-b-0'
            )}
          >
            {renderUploadButton(config, index, true)}
          </div>
        ))}
      </div>
    );
  };

  /**
   * 渲染合并的上传按钮（当配置项超过3个时使用）
   */
  const renderMergedUploadButton = (
    uploadConfigs: SupportUploadConfig[]
  ): JSX.Element => {
    return (
      <Popover
        content={renderPopoverContent(uploadConfigs)}
        placement="bottom"
        overlayInnerStyle={{
          maxWidth: '300px',
          padding: '8px',
          marginBottom: '5px',
        }}
        arrow={false}
      >
        <img
          src="https://openres.xfyun.cn/xfyundoc/2024-12-04/28cc8ea7-e679-47ba-b3e1-810870f79e38/1733276919310/afsddfsadfs.svg"
          alt="Upload"
          className="w-5 h-5 cursor-pointer ml-1"
        />
      </Popover>
    );
  };

  /**
   * 渲染所有上传按钮
   */
  const renderUploadButtons = (): JSX.Element => {
    const uploadConfigs: SupportUploadConfig[] =
      botInfo?.supportUploadConfig || [];

    if (!uploadConfigs || uploadConfigs.length === 0) {
      return <div />;
    }

    // 当配置项超过3个时，使用合并的 Popover 按钮
    if (uploadConfigs.length > 3) {
      return (
        <div className="flex items-center">
          {renderMergedUploadButton(uploadConfigs)}
        </div>
      );
    }

    // 配置项不超过3个时，并排显示
    return (
      <div className="flex items-center">
        {uploadConfigs.map((config: SupportUploadConfig, index: number) =>
          renderUploadButton(config, index)
        )}
      </div>
    );
  };

  return renderUploadButtons();
};

export default MultiUploadButtons;
