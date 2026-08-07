import React from 'react';
import { useTranslation } from 'react-i18next';
import Ajv from 'ajv';
import { renderType } from '@/components/workflow/utils/reactflowUtils';
import { cloneDeep } from 'lodash';
import { renderParamInput } from '@/components/workflow/nodes/node-common';
import { useMemoizedFn } from 'ahooks';
import { FlowTextArea } from '@/components/workflow/ui';

// 类型导入
import {
  ChatInputProps,
  StartNodeType,
  FileUploadResponse,
  FileUploadItem,
  AjvValidationError,
  UseChatInputProps,
} from '@/components/workflow/types';

const useChatInput = (
  startNodeParams: StartNodeType[],
  setStartNodeParams: (params: StartNodeType[]) => void
): UseChatInputProps => {
  const { t } = useTranslation();
  const uploadComplete = useMemoizedFn(
    (
      event: ProgressEvent<EventTarget>,
      index: number,
      fileId: string
    ): void => {
      const target = event.currentTarget as XMLHttpRequest;
      const res: FileUploadResponse = JSON.parse(target.responseText);
      if (res.code === 0) {
        setStartNodeParams(oldNodeParams => {
          const defaultValue = oldNodeParams?.[index]?.default;
          if (Array.isArray(defaultValue)) {
            const file = (defaultValue as FileUploadItem[]).find(
              item => item.id === fileId
            );
            if (file) {
              file.loading = false;
              file.url = res?.data?.[0] || '';
            }
          }
          return cloneDeep(oldNodeParams);
        });
      }
    }
  );

  const handleFileUpload = useMemoizedFn(
    (file: File, index: number, multiple: boolean, fileId: string): void => {
      const fileUploadItem: FileUploadItem = {
        id: fileId,
        name: file.name,
        size: file.size,
        loading: true,
        url: '',
      };

      if (Array.isArray(startNodeParams[index]?.default) && multiple) {
        (startNodeParams[index].default as FileUploadItem[]).push(
          fileUploadItem
        );
      } else {
        startNodeParams[index].default = [fileUploadItem];
      }
      setStartNodeParams([...startNodeParams]);
    }
  );

  const handleDeleteFile = useMemoizedFn(
    (index: number, fileId: string): void => {
      setStartNodeParams(oldStartNodeParams => {
        const defaultValue = oldStartNodeParams[index]?.default;
        if (Array.isArray(defaultValue)) {
          oldStartNodeParams[index].default = (
            defaultValue as FileUploadItem[]
          ).filter(file => fileId !== file?.id);
        }
        return cloneDeep(oldStartNodeParams);
      });
    }
  );
  const validateInputJSON = useMemoizedFn(
    (newValue: string, schema: object): string => {
      try {
        const ajv = new Ajv();
        const jsonData = JSON.parse(newValue);
        const validate = ajv.compile(schema);
        const valid = validate(jsonData);
        if (!valid) {
          const errors = validate?.errors as
            | AjvValidationError[]
            | null
            | undefined;
          return (
            (errors?.[0]?.instancePath?.slice(1) ?? '') +
            ' ' +
            (errors?.[0]?.message ?? '')
          ).trim();
        } else {
          return '';
        }
      } catch {
        return t('workflow.nodes.validation.invalidJSONFormat');
      }
    }
  );

  const handleChangeParam = useMemoizedFn(
    (index: number, fn, value: string | number | boolean): void => {
      setStartNodeParams(startNodeParams => {
        const currentInput: StartNodeType | undefined = startNodeParams.find(
          (_, i) => index === i
        );
        if (currentInput) {
          fn(currentInput, value);
          if (
            currentInput?.type === 'object' ||
            currentInput.type.includes('array')
          ) {
            if (currentInput?.validationSchema) {
              currentInput.errorMsg = validateInputJSON(
                value as string,
                currentInput.validationSchema
              );
            }
          }
        }
        return cloneDeep(startNodeParams);
      });
    }
  );
  return {
    uploadComplete,
    handleFileUpload,
    handleDeleteFile,
    handleChangeParam,
  };
};

function ChatInput({
  interruptChat,
  startNodeParams,
  setStartNodeParams,
  userInput,
  setUserInput,
  handleEnterKey,
}: ChatInputProps): React.ReactElement {
  const { t } = useTranslation();
  const {
    uploadComplete,
    handleFileUpload,
    handleDeleteFile,
    handleChangeParam,
  } = useChatInput(startNodeParams, setStartNodeParams);

  return (
    <div
      className="flex flex-col gap-1 mt-2"
      style={{
        maxHeight: '40vh',
        overflow: 'auto',
      }}
    >
      {startNodeParams?.length === 1 || interruptChat?.interrupt ? (
        <div className="relative mx-5">
          <FlowTextArea
            disabled={interruptChat?.type === 'option'}
            className="user-chat-input pr-3.5 w-full py-3"
            value={userInput}
            style={{
              resize: 'none',
              minHeight: 36,
              lineHeight: '36px',
              maxHeight: 200,
            }}
            adaptiveHeight={true}
            onChange={e => {
              e.stopPropagation();
              const value = e.target.value;
              if (startNodeParams[0]) {
                startNodeParams[0].default = value;
                setStartNodeParams([...startNodeParams]);
              }
              setUserInput(value);
            }}
            onKeyDown={handleEnterKey}
            placeholder={
              startNodeParams[0]?.description ||
              t('workflow.nodes.chatDebugger.tryFlow')
            }
          />
        </div>
      ) : (
        startNodeParams.map((params: StartNodeType, index) => {
          if (!params) return null;
          return (
            <div key={index} className="flex flex-col gap-2 px-5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1 text-sm font-medium text-second">
                  <span>{params.name}</span>
                  {params.required && <span className="text-[#F74E43]">*</span>}
                </div>
                <div className="bg-[#F0F0F0] px-2.5 py-1 rounded text-xs">
                  {renderType(params)}
                </div>
              </div>
              {renderParamInput(params, index, {
                handleChangeParam,
                uploadComplete,
                handleFileUpload,
                handleDeleteFile,
              })}
            </div>
          );
        })
      )}
    </div>
  );
}

export default ChatInput;
