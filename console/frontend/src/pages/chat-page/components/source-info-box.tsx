import { memo, useState, useEffect, FC } from 'react';
import { getTraceList } from '@/utils';
import { SourceInfoItem } from '@/types/chat';
import { useTranslation } from 'react-i18next';

const SourceInfoBox: FC<{ traceSource?: string }> = ({ traceSource }) => {
  const [open, setOpen] = useState<boolean>(false);
  const [renderTraceSource, setRenderTraceSource] = useState<SourceInfoItem[]>(
    []
  );
  const { t } = useTranslation();

  const handleSourceClick = (item: SourceInfoItem): void => {
    if (item.url) {
      window.open(item.url);
    }
  };

  // 组件初始化时设置 renderTraceSource
  useEffect(() => {
    if (traceSource) {
      const sourceList = getTraceList(traceSource);
      setRenderTraceSource(sourceList);
    }
  }, [traceSource]);

  // 如果没有溯源数据则不渲染
  if (!traceSource || renderTraceSource.length <= 0) return null;

  const handleTitleClick = (): void => {
    setOpen(!open);
  };

  return (
    <div
      className={`w-[calc(100%-55px)] transition-all duration-300 rounded-md ml-[55px] mb-[15px] overflow-hidden ${
        open ? 'max-h-[230px]' : 'max-h-[38px]'
      }`}
    >
      {/* 标题栏 */}
      <div
        className="flex items-center px-3 h-[38px] w-fit rounded-md leading-[38px] bg-[#f6f7f9] text-[#6985bb] cursor-pointer text-xs"
        onClick={handleTitleClick}
      >
        <span>
          {t('chatPage.sourceInfoBox.sourceReference', {
            count: renderTraceSource.length,
          })}
        </span>
        <img
          src="https://openres.xfyun.cn/xfyundoc/2024-04-11/22f3b4aa-daab-4b0c-a4d7-c42a7aff03d6/1712803618079/aaaaaa.png"
          alt="展开/收起"
          className={`w-[10px] h-[6px] ml-[30px] transition-transform duration-300 ${
            !open ? 'rotate-x-180' : ''
          }`}
          style={{
            transform: !open ? 'rotateX(180deg)' : 'rotateX(0deg)',
          }}
        />
      </div>

      {/* 内容列表 */}
      <ul className="w-full mt-[10px] bg-[#f6f7f9] p-3 rounded-md max-h-[190px] overflow-hidden overflow-y-auto">
        {renderTraceSource.map((item: SourceInfoItem, index: number) => (
          <li
            key={item.index || index}
            className={`my-[5px] text-[#9ea4ae] text-xs cursor-pointer hover:text-[#2a6ee9] hover:underline `}
            onClick={() => {
              handleSourceClick(item);
            }}
          >
            {index + 1}.&nbsp;
            {item.title}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default memo(SourceInfoBox);
