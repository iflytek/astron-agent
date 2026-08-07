import React, { FC } from 'react';
import { Progress } from 'antd';
import GlobalMarkDown from '@/components/global-markdown';

import order from '@/assets/imgs/knowledge/icon_zhishi_order.png';
import text from '@/assets/imgs/knowledge/icon_zhishi_text.png';
import target from '@/assets/imgs/knowledge/icon_zhishi_target_act_1.png';
import { typeList } from '@/constants';
import { generateType } from '@/utils/utils';
import { HitResult } from '@/types/resource';

export const DetailModal: FC<{
  setDetailModal: (value: boolean) => void;
  currentFile: HitResult;
}> = ({ setDetailModal, currentFile }) => {
  return (
    <div className="mask">
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md w-[600px]">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <img src={order} className="w-3 h-3" alt="" />
            <span
              className="ml-1 text-xs text-[#F6B728]"
              style={{
                fontFamily: 'SF Pro Text, SF Pro Text-600',
                fontStyle: 'italic',
              }}
            >
              00{currentFile.index + 1}
            </span>
            <div className="items-center flex">
              <img src={text} className="w-3 h-3 ml-1.5" alt="" />
              <span className="text-desc ml-1">
                {currentFile.fileInfo && currentFile.fileInfo.charCount}
              </span>
              <img src={target} className="w-3 h-3 ml-1.5" alt="" />
              <span className="text-desc ml-1">12</span>
            </div>
          </div>
          <span className="flex items-center">
            <Progress
              className="w-[175px] upload-progress hit-progress"
              percent={currentFile.score * 100}
            />
            <span
              className="text-[#6356EA] font-medium ml-2"
              style={{
                fontFamily: 'SF Pro Text, SF Pro Text-600',
                fontStyle: 'italic',
              }}
            >
              {currentFile.score}
            </span>
          </span>
        </div>
        <div className="mt-5 max-h-[320px] min-h-[120px] overflow-auto text-second text-sm pb-3">
          <GlobalMarkDown content={currentFile.knowledge} isSending={false} />
        </div>
        <div className="pt-2 border-t border-[#e7e7e7] flex items-center w-full">
          <div className="flex items-center flex-1 overflow-hidden">
            <img
              src={typeList.get(
                generateType(
                  currentFile.fileInfo &&
                    currentFile.fileInfo.type?.toLowerCase()
                ) || ''
              )}
              className="w-4 h-4 flex-shrink-0"
              alt=""
            />
            <span className="flex-1 text-overflow ml-1">
              {currentFile.fileInfo && currentFile.fileInfo.name}
            </span>
          </div>
          <span
            className="border border-[#D7DFE9] rounded-md px-4 py-1 text-second text-sm ml-2 cursor-pointer"
            onClick={() => setDetailModal(false)}
          >
            确认
          </span>
        </div>
      </div>
    </div>
  );
};
