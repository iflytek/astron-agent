import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'antd';
import { FLowCollapse } from '@/components/workflow/ui';
import ChatHistory from '@/components/workflow/nodes/components/chat-history';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import {
  TypeSelector,
  ValueField,
  ErrorMessages,
} from '@/components/workflow/nodes/components/inputs';
import { EnabledChatHistory } from '../single-input';
import { renderType } from '@/components/workflow/utils/reactflowUtils';

import desciptionIcon from '@/assets/imgs/workflow/desciption-icon.png';

function InputName({ item }: { item: unknown }): React.ReactElement {
  return (
    <span className="relative flex items-center gap-1.5 max-w-[80px]">
      <span className="flex-1 text-overflow" title={item?.name}>
        {item.name}
      </span>
      {item?.required && (
        <span className="text-[#F74E43] flex-shrink-0">*</span>
      )}
      {(item?.description || item?.default) && (
        <Tooltip
          title={item?.description || item?.default}
          overlayClassName="white-tooltip"
        >
          <img src={desciptionIcon} className="w-[10px] h-[10px]" alt="" />
        </Tooltip>
      )}
    </span>
  );
}

function InputTypeTag({ item }: { item: unknown }): React.ReactElement {
  return (
    <div className="bg-[#F0F0F0] py-1 px-2.5 rounded text-xs ml-1 flex-shrink-0">
      {renderType(item)}
    </div>
  );
}

function index({ id, data }): React.ReactElement {
  const { t } = useTranslation();
  const { inputs } = useNodeCommon({ id, data });
  return (
    <FLowCollapse
      label={
        <div className="flex-1 flex items-center justify-between text-base font-medium">
          <div>{t('common.input')}</div>
          <EnabledChatHistory id={id} data={data} />
        </div>
      }
      content={
        <div className="flex flex-col gap-3 mt-3 mx-[18px]">
          {data?.nodeParam?.enableChatHistoryV2?.isEnabled && (
            <ChatHistory id={id} data={data} />
          )}
          {inputs.map((item, index) => (
            <div key={index} className="flex flex-col gap-1">
              <div className="w-full flex items-center gap-3">
                <div className="flex items-center w-1/3 relative gap-2.5 overflow-hidden">
                  <InputName item={item} />
                  <InputTypeTag item={item} />
                </div>
                <div className="flex flex-col w-1/4">
                  <TypeSelector id={id} data={data} item={item} />
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                  <ValueField id={id} data={data} item={item} />
                </div>
              </div>
              <ErrorMessages item={item} />
            </div>
          ))}
        </div>
      }
    />
  );
}

export default index;
