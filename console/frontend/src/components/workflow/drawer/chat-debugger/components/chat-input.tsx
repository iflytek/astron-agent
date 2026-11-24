import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Ajv from 'ajv';
import { renderType } from '@/components/workflow/utils/reactflowUtils';
import { cloneDeep } from 'lodash';
import { renderParamInput } from '@/components/workflow/nodes/node-common';
import { useMemoizedFn } from 'ahooks';
import { FlowTextArea } from '@/components/workflow/ui';
import type { ChatStoreType } from '@/components/workflow/types/zustand/chat';
import {
  finishFileUpload,
  isStartInputValue,
  isUploadFile,
} from '../chat-state';

// 类型导入
import { StartNodeType, FileUploadItem } from '@/components/workflow/types';

type ChatInputProps = Pick<
  ChatStoreType,
  | 'startNodeParams'
  | 'setStartNodeParams'
  | 'userInput'
  | 'setUserInput'
  | 'handleEnterKey'
> & {
  interruptChat?: ChatStoreType['interruptChat'];
  disabled?: boolean;
  singleText?: boolean;
  inputLabel?: string;
  uploadFile?: (file: File, field: string) => Promise<string>;
};

const useChatInput = (
  setStartNodeParams: ChatStoreType['setStartNodeParams'],
  uploadFile?: ChatInputProps['uploadFile']
): Parameters<typeof renderParamInput>[2] => {
  const { t } = useTranslation();
  const uploadComplete = useMemoizedFn(
    (
      event: ProgressEvent<EventTarget>,
      index: number,
      fileId: string
    ): void => {
      if (!(event.currentTarget instanceof XMLHttpRequest)) return;
      const response: unknown = JSON.parse(event.currentTarget.responseText);
      setStartNodeParams(params =>
        finishFileUpload(params, index, fileId, response)
      );
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

      setStartNodeParams(params =>
        params.map((param, paramIndex) =>
          paramIndex === index
            ? {
                ...param,
                default:
                  Array.isArray(param.default) && multiple
                    ? [...param.default.filter(isUploadFile), fileUploadItem]
                    : [fileUploadItem],
              }
            : param
        )
      );
    }
  );

  const handleDeleteFile = useMemoizedFn(
    (index: number, fileId: string): void => {
      setStartNodeParams(oldStartNodeParams => {
        const input = oldStartNodeParams[index];
        const defaultValue = input?.default;
        if (input && Array.isArray(defaultValue)) {
          input.default = defaultValue
            .filter(isUploadFile)
            .filter(file => fileId !== file.id);
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
          const errors = validate.errors;
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

  const handleChangeParam = useCallback(
    <Value,>(
      index: number,
      fn: (data: { default?: unknown }, value: Value) => void,
      value: Value
    ): void => {
      setStartNodeParams(startNodeParams => {
        const currentInput: StartNodeType | undefined = startNodeParams.find(
          (_, i) => index === i
        );
        if (currentInput) {
          const draft: { default?: unknown } = {
            default: currentInput.default,
          };
          fn(draft, value);
          if (isStartInputValue(draft.default))
            currentInput.default = draft.default;
          else if (draft.default == null) currentInput.default = '';
          if (
            currentInput?.type === 'object' ||
            currentInput.type.includes('array')
          ) {
            if (currentInput?.validationSchema) {
              currentInput.errorMsg = validateInputJSON(
                typeof value === 'string' ? value : JSON.stringify(value),
                currentInput.validationSchema
              );
            }
          }
        }
        return cloneDeep(startNodeParams);
      });
    },
    [setStartNodeParams, validateInputJSON]
  );
  return {
    uploadComplete,
    handleFileUpload,
    handleDeleteFile,
    handleChangeParam,
    uploadFile: uploadFile
      ? async (file, field, index, fileId): Promise<void> => {
          try {
            const reference = await uploadFile(file, field);
            setStartNodeParams(params =>
              finishFileUpload(params, index, fileId, {
                code: 0,
                data: [reference],
              })
            );
          } catch (reason) {
            handleDeleteFile(index, fileId);
            throw reason;
          }
        }
      : undefined,
  };
};

function ChatInput({
  interruptChat,
  startNodeParams,
  setStartNodeParams,
  userInput,
  setUserInput,
  handleEnterKey,
  disabled = false,
  singleText = startNodeParams?.length === 1,
  inputLabel = '测试运行输入',
  uploadFile,
}: ChatInputProps): React.ReactElement {
  const { t } = useTranslation();
  const inputActions = useChatInput(setStartNodeParams, uploadFile);

  return (
    <div
      className="workflow-debugger-composer flex flex-col gap-1"
      style={{
        maxHeight: '40vh',
        overflow: 'auto',
      }}
    >
      {singleText || interruptChat?.interrupt ? (
        <div className="relative mx-5">
          <FlowTextArea
            disabled={disabled || interruptChat?.type === 'option'}
            className="user-chat-input pr-3.5 w-full py-3"
            aria-label={inputLabel}
            value={userInput}
            style={{
              resize: 'none',
              minHeight: 64,
              lineHeight: '22px',
              maxHeight: 160,
            }}
            adaptiveHeight={true}
            onChange={e => {
              e.stopPropagation();
              const value = e.target.value;
              if (!interruptChat?.interrupt && startNodeParams[0]) {
                setStartNodeParams(params =>
                  params.map((param, index) =>
                    index === 0 ? { ...param, default: value } : param
                  )
                );
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
              {renderParamInput(params, index, { ...inputActions, disabled })}
            </div>
          );
        })
      )}
    </div>
  );
}

export default ChatInput;
