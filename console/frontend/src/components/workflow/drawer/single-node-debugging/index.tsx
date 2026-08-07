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
  UploadResponse,
  UseSingleNodeDebuggingReturn,
} from '@/components/workflow/types';

// 从统一的图标管理中导入
import { Icons } from '@/components/workflow/icons';

// 获取 Single Node Debugging 模块的图标
const icons = Icons.singleNodeDebugging;

const useSingleNodeDebugging = (
  id,
  refInputs,
  setRefInputs,
  nodeDebugExect,
  clearData
): UseSingleNodeDebuggingReturn => {
  const { currentNode } = useNodeCommon({ id });

  const handleRun = useMemoizedFn((): void => {
    const debuggerNode = cloneDeep(currentNode);
    if (debuggerNode.data?.inputs) {
      debuggerNode.data.inputs.forEach((input: unknown) => {
        const currentRefInput = refInputs?.find(
          (refInput: RefInput) => refInput.id === input.id
        );
        if (currentRefInput) {
          input.schema.value.type = 'literal';
          input.schema.type = currentRefInput.type;
          if (currentRefInput.fileType && currentRefInput.type === 'string') {
            input.schema.value.content = (
              currentRefInput.default as UploadFileItem[]
            )?.[0]?.url;
          } else if (
            currentRefInput.fileType &&
            currentRefInput.type === 'array-string'
          ) {
            input.schema.value.content = (
              currentRefInput.default as UploadFileItem[]
            )?.map((item: UploadFileItem) => item?.url);
          } else if (
            currentRefInput.type === 'object' ||
            currentRefInput.type.includes('array')
          ) {
            input.schema.value.content =
              isJSON(currentRefInput.default as string) &&
              JSON.parse(currentRefInput.default as string);
          } else {
            input.schema.value.content = currentRefInput.default;
          }
        }
      });
      debuggerNode.data.inputs = debuggerNode.data.inputs?.filter(
        (input: unknown) =>
          (typeof input?.schema?.value?.content === 'string' &&
            input?.schema?.value?.content) ||
          typeof input?.schema?.value?.content !== 'string'
      );
    }
    nodeDebugExect(currentNode, debuggerNode);
    clearData();
  });

  const handleChangeParam = useMemoizedFn(
    (
      index: number,
      fn: (data: RefInput, value: unknown) => void,
      value: unknown
    ): void => {
      setRefInputs((old: RefInput[]) => {
        const currentInput = old.find((_: RefInput, i: number) => i === index);
        if (currentInput) {
          fn(currentInput, value);
        }
        return cloneDeep(old);
      });
    }
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
          (params?.default as UploadFileItem[])?.length > 0 &&
          (params?.default as UploadFileItem[])?.every(
            (item: UploadFileItem) => !item?.loading
          )
        );
      }

      if (params.type === 'object' || params.type?.includes('array')) {
        return isJSON(params?.default as string);
      }

      if (params.type === 'string') {
        return Boolean((params?.default as string)?.trim());
      }

      return true;
    }
  );

  const canRunDebugger = useMemo((): boolean => {
    return (
      refInputs?.every((params: RefInput) =>
        validateParam(params, currentNode?.nodeType)
      ) ?? false
    );
  }, [refInputs, currentNode]);

  const uploadComplete = useMemoizedFn(
    (
      event: ProgressEvent<EventTarget>,
      index: number,
      fileId: string
    ): void => {
      const res: UploadResponse = JSON.parse(
        (event.currentTarget as XMLHttpRequest).responseText
      );
      if (res.code === 0) {
        setRefInputs((oldNodeParams: RefInput[]) => {
          const file = (
            oldNodeParams?.[index]?.default as UploadFileItem[]
          )?.find((item: UploadFileItem) => item.id === fileId);
          if (file) {
            file.loading = false;
            file.url = res?.data?.[0];
          }
          return cloneDeep(oldNodeParams);
        });
      }
    }
  );

  const handleFileUpload = useMemoizedFn(
    (file: File, index: number, multiple: boolean, fileId: string): void => {
      if (refInputs[index]?.default && multiple) {
        (refInputs[index].default as UploadFileItem[]).push({
          id: fileId,
          name: file.name,
          size: file.size,
          loading: true,
        });
      } else {
        refInputs[index].default = [
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
        if (newParams[index]?.default) {
          newParams[index].default = (
            newParams[index].default as UploadFileItem[]
          )?.filter((file: UploadFileItem) => fileId !== file?.id);
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
            <img
              src={String(currentNode?.data?.icon || '')}
              className="w-5 h-5"
              alt=""
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
