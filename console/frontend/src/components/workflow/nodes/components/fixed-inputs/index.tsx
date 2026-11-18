import type { NodeComponentProps } from '@/components/workflow/nodes/types';
import type { WorkflowInput } from '@/components/workflow/types/domain';
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

function InputName({ item }: { item: WorkflowInput }): React.ReactElement {
  return (
    <span className="workflow-parameter-fixed-name relative flex items-center gap-1.5">
      <span className="min-w-0 flex-1 text-overflow" title={item?.name}>
        {item.name}
      </span>
      {item?.required && (
        <span className="text-[#F74E43] flex-shrink-0">*</span>
      )}
      {Boolean(item.description || item.default) && (
        <Tooltip
          title={
            item.description ||
            (typeof item.default === 'string' ? item.default : '')
          }
          overlayClassName="white-tooltip"
        >
          <img src={desciptionIcon} className="w-[10px] h-[10px]" alt="" />
        </Tooltip>
      )}
    </span>
  );
}

function InputTypeTag({ item }: { item: WorkflowInput }): React.ReactElement {
  const type = renderType(item);
  return (
    <div className="workflow-parameter-type" title={type}>
      {type}
    </div>
  );
}

function index({ id, data }: NodeComponentProps): React.ReactElement {
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
        <div className="workflow-parameter-list">
          {data?.nodeParam?.enableChatHistoryV2?.isEnabled && (
            <ChatHistory id={id} data={data} />
          )}
          {inputs.map(item => (
            <div key={item.id} className="workflow-parameter-field">
              <div className="workflow-parameter-row workflow-parameter-row-fixed">
                <div className="workflow-parameter-fixed-identity">
                  <InputName item={item} />
                  <InputTypeTag item={item} />
                </div>
                <div>
                  <TypeSelector id={id} data={data} item={item} />
                </div>
                <div className="min-w-0">
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
