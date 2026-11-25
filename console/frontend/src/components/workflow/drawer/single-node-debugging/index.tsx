import { WorkflowNodeIcon } from '@/components/workflow/nodes/node-icon';
import React, { useMemo, useCallback, memo } from 'react';
import { Drawer, Form, Button } from 'antd';
import { cloneDeep } from 'lodash';
import { isJSON } from '@/utils';
import { useMemoizedFn } from 'ahooks';
import { renderType } from '@/components/workflow/utils/reactflowUtils';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { renderParamInput } from '@/components/workflow/nodes/node-common';

// 类型导入
import {
  SingleNodeDebuggingProps,
  RefInput,
  UploadFileItem,
} from '@/components/workflow/types';
import type { UploadResponse } from '@/components/workflow/types/drawer/chat-debugger';

// 从统一的图标管理中导入
import { Icons } from '@/components/workflow/icons';

// 获取 Single Node Debugging 模块的图标
const icons = Icons.singleNodeDebugging;

const useSingleNodeDebugging = (
  id: string,
  refInputs: RefInput[],
  setRefInputs: SingleNodeDebuggingProps['setRefInputs'],
  nodeDebugExect: SingleNodeDebuggingProps['nodeDebugExect'],
  clearData: () => void
) => {
  const { currentNode } = useNodeCommon({ id });

  const handleRun = useMemoizedFn((): void => {
    if (!currentNode) return;
    const sourceNode = cloneDeep(currentNode);
    const runtimeInputs = sourceNode.data.inputs
      ?.map(input => {
        const currentRefInput = refInputs?.find(
          (refInput: RefInput) => refInput.id === input.id
        );
        if (currentRefInput) {
          let content: unknown = currentRefInput.default;
          const fileUrls = Array.isArray(currentRefInput.default)
            ? currentRefInput.default.flatMap(item =>
                typeof item === 'object' &&
                item !== null &&
                'url' in item &&
                typeof item.url === 'string'
                  ? [item.url]
                  : []
              )
            : [];
          if (currentRefInput.fileType && currentRefInput.type === 'string') {
            content = fileUrls[0];
          } else if (
            currentRefInput.fileType &&
            currentRefInput.type === 'array-string'
          ) {
            content = fileUrls;
          } else if (
            currentRefInput.type === 'object' ||
            currentRefInput.type.includes('array')
          ) {
            content =
              typeof currentRefInput.default === 'string' &&
              isJSON(currentRefInput.default)
                ? JSON.parse(currentRefInput.default)
                : currentRefInput.default;
          }
          return {
            ...input,
            schema: {
              ...input.schema,
              type: currentRefInput.type,
              value: { type: 'literal' as const, content },
            },
          };
        }
        return input;
      })
      .filter(
        input =>
          (typeof input?.schema?.value?.content === 'string' &&
            input?.schema?.value?.content) ||
          typeof input?.schema?.value?.content !== 'string'
      );
    const debuggerNode = {
      ...sourceNode,
      data: { ...sourceNode.data, inputs: runtimeInputs },
    };
    nodeDebugExect(currentNode, debuggerNode);
    clearData();
  });

  const handleChangeParam = useCallback(
    <Value,>(
      index: number,
      fn: (data: RefInput, value: Value) => void,
      value: Value
    ): void => {
      setRefInputs((old: RefInput[]) => {
        const currentInput = old.find((_: RefInput, i: number) => i === index);
        if (currentInput) {
          fn(currentInput, value);
        }
        return cloneDeep(old);
      });
    },
    [setRefInputs]
  );

  const validateParam = useMemoizedFn(
    (params: RefInput, nodeType?: string): boolean => {
      if (
        ['plugin', 'flow'].includes(String(nodeType || '')) &&
        !params?.required
      ) {
        return true;
      }

      if (params.errorMsg) return false;

      if (params.fileType) {
        return (
          Array.isArray(params.default) &&
          params.default.length > 0 &&
          params.default.every(
            item =>
              typeof item === 'object' &&
              item !== null &&
              'url' in item &&
              typeof item.url === 'string' &&
              item.url.length > 0 &&
              (!('loading' in item) || !item.loading)
          )
        );
      }

      if (params.type === 'object' || params.type?.includes('array')) {
        return typeof params.default === 'string'
          ? isJSON(params.default)
          : typeof params.default === 'object' && params.default !== null;
      }

      if (params.type === 'string') {
        return (
          typeof params.default === 'string' && params.default.trim().length > 0
        );
      }

      return true;
    }
  );

  const canRunDebugger = useMemo((): boolean => {
    return (
      Boolean(currentNode) &&
      refInputs.every((params: RefInput) =>
        validateParam(params, currentNode?.nodeType)
      )
    );
  }, [refInputs, currentNode]);

  const uploadComplete = useMemoizedFn(
    (
      event: ProgressEvent<EventTarget>,
      index: number,
      fileId: string
    ): void => {
      if (!(event.currentTarget instanceof XMLHttpRequest)) return;
      const res: UploadResponse = JSON.parse(event.currentTarget.responseText);
      const uploadedUrl = res.data?.[0];
      if (res.code === 0 && uploadedUrl) {
        setRefInputs((oldNodeParams: RefInput[]) => {
          const file = (
            oldNodeParams?.[index]?.default as UploadFileItem[]
          )?.find((item: UploadFileItem) => item.id === fileId);
          if (file) {
            file.loading = false;
            file.url = uploadedUrl;
          }
          return cloneDeep(oldNodeParams);
        });
      }
    }
  );

  const handleFileUpload = useMemoizedFn(
    (file: File, index: number, multiple: boolean, fileId: string): void => {
      const input = refInputs[index];
      if (!input) return;
      if (Array.isArray(input.default) && multiple) {
        input.default.push({
          id: fileId,
          name: file.name,
          size: file.size,
          loading: true,
        });
      } else {
        input.default = [
          {
            id: fileId,
            name: file.name,
            size: file.size,
            loading: true,
          },
        ];
      }
      setRefInputs([...refInputs]);
    }
  );

  const handleDeleteFile = useMemoizedFn(
    (index: number, fileId: string): void => {
      setRefInputs((oldStartNodeParams: RefInput[]) => {
        const newParams = cloneDeep(oldStartNodeParams);
        const input = newParams[index];
        if (input && Array.isArray(input.default)) {
          input.default = (input.default as UploadFileItem[])?.filter(
            (file: UploadFileItem) => fileId !== file?.id
          );
        }
        return newParams;
      });
    }
  );
  return {
    handleRun,
    handleChangeParam,
    uploadComplete,
    handleFileUpload,
    handleDeleteFile,
    canRunDebugger,
  };
};

function SingleNodeDebugging({
  id,
  open,
  setOpen,
  refInputs,
  setRefInputs,
  nodeDebugExect,
}: SingleNodeDebuggingProps): React.ReactElement {
  const { currentNode } = useNodeCommon({ id });
  const [form] = Form.useForm();

  const clearData = useCallback((): void => {
    form.resetFields();
    setOpen(false);
  }, [setOpen]);

  const {
    handleRun,
    handleChangeParam,
    uploadComplete,
    handleFileUpload,
    handleDeleteFile,
    canRunDebugger,
  } = useSingleNodeDebugging(
    id,
    refInputs,
    setRefInputs,
    nodeDebugExect,
    clearData
  );

  return (
    <Drawer
      rootClassName="operation-result-container"
      placement="right"
      open={open}
      destroyOnClose
      mask={true}
    >
      <div
        className="w-full h-full p-5 pt-8 flex flex-col"
        onKeyDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-lg">
            测试{String(currentNode?.data?.label || '')}节点
          </span>
          <img
            src={icons.close}
            className="w-3 h-3 cursor-pointer"
            alt=""
            onClick={() => clearData()}
          />
        </div>
        <div className="flex-1 mt-4">
          <div className="flex items-center gap-3">
            <WorkflowNodeIcon
              nodeType={id.split('::')[0] || ''}
              src={currentNode?.data?.icon}
              className="w-5 h-5"
            />
            <span className="text-base font-medium">
              {String(currentNode?.data?.label || '')}节点
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {refInputs?.map((params, index) => (
              <div key={index} className="flex flex-col gap-2">
                <div className="text-second font-medium text-sm flex gap-1">
                  <span>{params?.name}</span>
                  {params?.required !== false && (
                    <span className="text-[#F74E43]">*</span>
                  )}
                  <div className="bg-[#F0F0F0] px-2.5 py-1 rounded text-xs">
                    {renderType(params)}
                  </div>
                </div>
                {renderParamInput(params, index, {
                  handleChangeParam,
                  uploadComplete,
                  handleFileUpload,
                  handleDeleteFile,
                }) || null}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2.5 justify-end">
          <Button
            type="text"
            className="origin-btn px-[24px]"
            onClick={() => clearData()}
          >
            取消
          </Button>
          <Button
            type="primary"
            className="px-[24px] flex items-center gap-2"
            onClick={() => handleRun()}
            disabled={!canRunDebugger}
          >
            <img src={icons.trialRun} className="w-3 h-3" alt="" />
            <span>运行</span>
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

export default memo(SingleNodeDebugging);
