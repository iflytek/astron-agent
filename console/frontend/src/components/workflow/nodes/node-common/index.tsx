import { NodeDebuggingStatus } from '@/components/workflow/nodes/components/node-debugger';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  memo,
} from 'react';
import {
  FlowTextArea,
  FlowSelect,
  FlowNodeInput,
  FLowCollapse,
  FlowUpload,
  FlowInputNumber,
} from '@/components/workflow/ui';
import { useFlowTypeRender } from '@/components/workflow/hooks/use-flow-type-render';
import {
  SourceHandle,
  TargetHandle,
} from '@/components/workflow/nodes/components/handle';
import { v4 as uuid } from 'uuid';
import { cloneDeep } from 'lodash';
import { Dropdown } from 'antd';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useTranslation } from 'react-i18next';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { Iterator } from '@/components/workflow/nodes/iterator';
import { IfElse } from '@/components/workflow/nodes/if-else';
import { DecisionMaking } from '@/components/workflow/nodes/decision-making';
import { Knowledge } from '@/components/workflow/nodes/knowledge';
import { QuestionAnswer } from '@/components/workflow/nodes/question-answer';
import { Agent } from '@/components/workflow/nodes/agent';
import Remark from '@/components/workflow/nodes/components/remark';
import NodeOperation from '@/components/workflow/nodes/components/node-operation';
import ModelSelect from '@/components/workflow/nodes/components/model-select';
import { Icons } from '@/components/workflow/icons';
import { typeList } from '@/constants';
import { convertToKBMB } from '@/components/workflow/utils/reactflowUtils';
import JsonMonacoEditor from '@/components/monaco-editor/JsonMonacoEditor';
import { generateUploadType } from '@/components/workflow/utils/reactflowUtils';

import dotSvg from '@/assets/imgs/workflow/dot.svg';

export const Inputs = memo(({ label = '输入', inputs }) => {
  const elementRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const ItemBadge = ({
    item,
    size = 'xs',
  }: {
    item: unknown;
    size: 'xs' | 'base';
  }): React.ReactElement => {
    const hasError = item?.nameErrMsg || item?.schema?.value?.contentErrMsg;

    const containerStyle = {
      backgroundColor: hasError ? '#F0AE784D' : '#F2F5FE',
      color: hasError ? '#ff7300' : '',
    };

    const labelStyle = {
      color: hasError ? '#f4c69e' : '#7F7F7F',
    };

    const displayName = item?.name?.trim() ? item?.name : '未定义';

    return (
      <div
        key={item?.id}
        className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-${size} font-medium`}
        style={containerStyle}
      >
        <span style={labelStyle}>{useFlowTypeRender(item)}</span>
        <span>{displayName}</span>
      </div>
    );
  };

  const items = [
    {
      key: '1',
      label: (
        <div className="p-1 w-[300px] flex items-center gap-1 flex-wrap">
          {inputs?.map(item => (
            <ItemBadge item={item} size="base" />
          ))}
        </div>
      ),
    },
  ];

  useEffect(() => {
    if (elementRef.current) {
      const hasOverflow =
        elementRef.current.scrollHeight > elementRef.current.clientHeight ||
        elementRef.current.scrollWidth > elementRef.current.clientWidth;
      setShowDropdown(hasOverflow);
    }
  }, [inputs]);

  return (
    <>
      <div className="text-xs text-[#333] text-right self-center">{label}</div>
      <div
        className="flex items-center gap-1.5 overflow-hidden relative"
        ref={elementRef}
      >
        {inputs?.map(item => (
          <ItemBadge item={item} size="xs" />
        ))}
        {showDropdown && (
          <div className="absolute right-0 top-0 flex items-center">
            <div
              className="w-[93px] h-[20px]"
              style={{
                background:
                  'linear-gradient(90deg, rgba(255, 255, 255, 0) 0px, rgb(252, 252, 255) 78%)',
              }}
            ></div>
            <div className="bg-[#F2F5FE] flex items-center justify-center rounded overflow-hidden absolute right-0 top-[2px]">
              <Dropdown menu={{ items }} placement="bottomRight">
                <img
                  src={dotSvg}
                  className="w-4 h-4 cursor-pointer hover:bg-[#DDE3F1] rounded"
                  alt=""
                />
              </Dropdown>
            </div>
          </div>
        )}
      </div>
    </>
  );
});

export const Outputs = memo(({ data, label = '输出', outputs }) => {
  const { t } = useTranslation();
  const elementRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const ItemBadge = ({ item, size = 'xs' }: unknown): React.ReactElement => {
    return (
      <div
        key={item?.id}
        className={`flex items-center gap-0.5 px-1 py-0.5 rounded font-medium text-${size}`}
        style={{
          backgroundColor: item?.nameErrMsg ? '#F0AE784D' : '#F2F5FE',
          color: item?.nameErrMsg ? '#ff7300' : '',
        }}
      >
        <span
          style={{
            color: item?.nameErrMsg ? '#f4c69e' : '#7F7F7F',
          }}
        >
          {useFlowTypeRender(item)}
        </span>
        <span>{item?.name?.trim() ? item?.name : '未定义'}</span>
      </div>
    );
  };

  const exceptionHandlingOutput = useMemo(() => {
    return (data?.retryConfig?.errorStrategy === 2 ||
      data?.retryConfig?.errorStrategy === 1) &&
      data?.retryConfig?.shouldRetry
      ? [
          {
            id: uuid(),
            name: 'errorCode',
            schema: {
              type: 'string',
              default: t('workflow.exceptionHandling.errorCode'),
            },
            nameErrMsg: '',
          },
          {
            id: uuid(),
            name: 'errorMessage',
            schema: {
              type: 'string',
              default: t('workflow.exceptionHandling.errorMessage'),
            },
            nameErrMsg: '',
          },
        ]
      : [];
  }, [data?.retryConfig?.errorStrategy, data?.retryConfig?.shouldRetry]);

  const finallyOutputs = useMemo(() => {
    return [...outputs, ...exceptionHandlingOutput];
  }, [outputs, exceptionHandlingOutput]);

  const items = [
    {
      key: '1',
      label: (
        <div className="p-1 w-[300px] flex items-center gap-1 flex-wrap">
          {finallyOutputs?.map(item => (
            <ItemBadge item={item} size="base" />
          ))}
        </div>
      ),
    },
  ];

  useEffect(() => {
    if (elementRef.current) {
      const hasOverflow =
        elementRef.current.scrollHeight > elementRef.current.clientHeight ||
        elementRef.current.scrollWidth > elementRef.current.clientWidth;
      setShowDropdown(hasOverflow);
    }
  }, [finallyOutputs]);

  return (
    <>
      <div className="text-xs text-[#333] text-right self-center">{label}</div>
      <div
        className="flex items-center gap-1.5 overflow-hidden relative"
        ref={elementRef}
      >
        {finallyOutputs?.map(item => (
          <ItemBadge item={item} size="xs" />
        ))}
        {showDropdown && (
          <div className="absolute right-0 top-0 flex items-center">
            <div
              className="w-[93px] h-[20px]"
              style={{
                background:
                  'linear-gradient(90deg, rgba(255, 255, 255, 0) 0px, rgb(252, 252, 255) 78%)',
              }}
            ></div>
            <div className="bg-[#F2F5FE] flex items-center justify-center rounded overflow-hidden absolute right-0 top-[2px]">
              <Dropdown menu={{ items }} placement="bottomRight">
                <img
                  src={dotSvg}
                  className="w-4 h-4 cursor-pointer hover:bg-[#DDE3F1] rounded"
                  alt=""
                />
              </Dropdown>
            </div>
          </div>
        )}
      </div>
    </>
  );
});

export const Label = memo(
  ({ data, id, maxWidth = 130, labelInput = 'labelInput' }) => {
    const { isStartOrEndNode } = useNodeCommon({ id, data });
    const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
    const autoSaveCurrentFlow = useFlowsManager(
      state => state.autoSaveCurrentFlow
    );
    const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
    const currentStore = getCurrentStore();
    const setNode = currentStore(state => state.setNode);
    const updateNodeNameStatus = currentStore(
      state => state.updateNodeNameStatus
    );

    const handleChangeNodeParam = useCallback(
      (fn, value) => {
        setNode(id, old => {
          fn(old.data, value);
          return {
            ...cloneDeep(old),
          };
        });
        autoSaveCurrentFlow();
        canPublishSetNot();
      },
      [id, autoSaveCurrentFlow]
    );

    const labelInputId = useMemo(() => {
      return id + labelInput;
    }, [id, labelInput]);

    return (
      <>
        {data?.labelEdit ? (
          <FlowNodeInput
            nodeId={id}
            id={labelInputId}
            value={data?.label}
            onChange={value =>
              handleChangeNodeParam(
                (data, value) => (data.label = value),
                value
              )
            }
            onBlur={() => {
              updateNodeNameStatus(id);
              autoSaveCurrentFlow();
            }}
            style={{
              maxWidth: maxWidth,
            }}
          />
        ) : (
          <h2
            className="text-base font-medium text-overflow"
            style={{
              maxWidth: maxWidth,
            }}
            title={data?.label}
            onDoubleClick={() =>
              !isStartOrEndNode && updateNodeNameStatus(id, labelInputId)
            }
          >
            {data?.label}
          </h2>
        )}
      </>
    );
  }
);

export const ExceptionContent = memo(({ id, data }) => {
  const { isConnectable, exceptionHandleId } = useNodeCommon({ id, data });

  return (
    <>
      {data?.retryConfig?.shouldRetry &&
      data?.retryConfig?.errorStrategy === 2 ? (
        <>
          <div className="text-[333] text-right">异常处理</div>
          <span className="relative exception-handle-edge">
            执行异常流程
            <SourceHandle
              nodeId={id}
              id={exceptionHandleId}
              isConnectable={isConnectable}
            />
          </span>
        </>
      ) : null}
    </>
  );
});

export const Model = memo(({ model }) => {
  return (
    <>
      <div className="text-[#333] text-right">模型</div>
      <div className="flex items-center gap-1">
        <img src={model?.icon} className="w-[14px] h-[14px]" alt="" />
        <span>{model?.name}</span>
      </div>
    </>
  );
});

interface IteratorChildNodeProps {
  label: string;
  isConnectable: boolean;
  hasTargetHandle?: boolean;
  hasSourceHandle?: boolean;
  sourceHandleId?: string;
  nodeId?: string;
}

// 迭代器子节点组件
export const IteratorChildNode = memo<IteratorChildNodeProps>(
  ({ id, data }) => {
    const { isConnectable, isIteratorStart, isIteratorEnd } = useNodeCommon({
      id,
      data,
    });
    const hasTargetHandle = !isIteratorStart;
    const hasSourceHandle = !isIteratorEnd;
    return (
      <div className="px-4 py-2 iterator-child-node">
        <span>{data?.label}</span>
        {hasTargetHandle && <TargetHandle isConnectable={isConnectable} />}
        {hasSourceHandle && (
          <SourceHandle
            nodeId={id}
            isConnectable={isConnectable}
            id={data?.nodeParam?.handlingEdge}
          />
        )}
      </div>
    );
  }
);

interface NodeHeaderProps {
  id: string;
  data: unknown;
}

// 节点头部组件
export const NodeHeader = memo<NodeHeaderProps>(({ id, data }) => {
  const { hasTargetHandle, hasSourceHandle, isConnectable, sourceHandleId } =
    useNodeCommon({
      id,
      data,
    });

  const { renderTypeOneClickUpdate, nodeIcon, showNodeOperation } =
    useNodeCommon({
      id,
      data,
    });

  return (
    <div className="w-full flex items-center justify-between px-[14px] relative pt-[14px]">
      <div className="flex items-center gap-3">
        <img src={nodeIcon} className="w-[18px] h-[18px]" alt="" />
        <Label id={id} data={data} />
        {renderTypeOneClickUpdate()}
      </div>
      {showNodeOperation && (
        <NodeOperation id={id} data={data} labelInput="labelInput" />
      )}
      {hasTargetHandle && <TargetHandle isConnectable={isConnectable} />}
      {hasSourceHandle && (
        <SourceHandle
          id={sourceHandleId}
          nodeId={id}
          isConnectable={isConnectable}
        />
      )}
    </div>
  );
});

interface NodeContentProps {
  id: string;
  data: unknown;
}

// 节点内容组件
export const NodeContent = memo<NodeContentProps>(({ id, data }) => {
  const {
    model,
    isKnowledgeNode,
    isQuestionAnswerNode,
    isDecisionMakingNode,
    isIfElseNode,
    isIteratorNode,
    isAgentNode,
    showInputs,
    showOutputs,
    showExceptionFlow,
    inputLabel,
    outputLabel,
  } = useNodeCommon({
    id,
    data,
  });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr)',
        gap: '6px',
        fontSize: 12,
        marginTop: 8,
        padding: '0 14px',
      }}
    >
      {showInputs && <Inputs inputs={data?.inputs} label={inputLabel} />}
      {showOutputs && (
        <Outputs outputs={data?.outputs} data={data} label={outputLabel} />
      )}
      {model && <Model model={model} />}
      {isKnowledgeNode && (
        <Knowledge data={data} repoList={data?.nodeParam?.repoList} />
      )}
      {isQuestionAnswerNode && <QuestionAnswer id={id} data={data} />}
      {isDecisionMakingNode && <DecisionMaking id={id} data={data} />}
      {isIfElseNode && <IfElse id={id} data={data} />}
      {isIteratorNode && <Iterator id={id} data={data} />}
      {isAgentNode && <Agent id={id} data={data} />}
      {showExceptionFlow && <ExceptionContent id={id} data={data} />}
    </div>
  );
});

interface NodeWrapperProps {
  id: string;
  data: unknown;
  children: React.ReactNode;
  className?: string;
}

// 节点包装器组件
export const NodeWrapper = memo<NodeWrapperProps>(({ id, data, children }) => {
  const { handleNodeClick, isIteratorNode } = useNodeCommon({ id, data });

  return (
    <div
      id={id}
      className="min-w-[360px] pb-[14px]"
      onClick={handleNodeClick}
      style={{
        maxWidth: isIteratorNode ? '' : '360px',
      }}
    >
      {data?.nodeParam?.remarkVisible && <Remark id={id} data={data} />}
      {data.status && (
        <NodeDebuggingStatus
          id={id}
          status={data.status}
          debuggerResult={data.debuggerResult}
        />
      )}
      {children}
    </div>
  );
});

export const ModelSection = memo(({ id, data }): React.ReactElement => {
  return (
    <FLowCollapse
      label={<h2 className="text-base font-medium">模型</h2>}
      content={
        <div className="rounded-md px-[18px] pb-3">
          <ModelSelect id={id} data={data} />
        </div>
      }
    />
  );
});

const UploadedFile = ({
  params,
  file,
  index,
  handleDeleteFile,
}): React.ReactElement => {
  return (
    <div
      key={file?.id}
      className="bg-[#EBF4FD] rounded-lg p-1 pr-4 flex items-center justify-between gap-2"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center w-[28px] h-[28px] bg-[#fff] justify-center">
          {file.loading ? (
            <img
              src={Icons.singleNodeDebugging.chatLoading}
              className="w-3 h-3 flow-rotate-center"
              alt=""
            />
          ) : (
            <img
              src={typeList.get(params?.fileType || '') || ''}
              className="w-[16px] h-[13px]"
              alt=""
            />
          )}
        </div>
        <span>{file?.name}</span>
        <span className="text-desc">{convertToKBMB(file.size)}</span>
      </div>
      <img
        src={Icons.singleNodeDebugging.remove}
        className="w-[16px] h-[17px] mt-1.5 opacity-50 cursor-pointer"
        onClick={() => handleDeleteFile(index, file?.id || '')}
        alt=""
      />
    </div>
  );
};

const getMaxSize = (fileType: string): number => {
  if (fileType === 'image') return 3;
  if (fileType === 'video') return 500;
  return 50;
};

const renderFileUpload = (
  params,
  index,
  uploadComplete,
  handleFileUpload,
  handleDeleteFile
): React.ReactElement => {
  const multiple = params?.schema?.type === 'array-string';
  return (
    <>
      <FlowUpload
        {...({
          multiple,
          uploadType: generateUploadType(params?.fileType),
          uploadComplete: (event, fileId) =>
            uploadComplete(event, index, fileId),
          handleFileUpload: (file, fileId) =>
            handleFileUpload(file, index, multiple, fileId),
          maxSize: getMaxSize(params?.fileType),
        } as unknown)}
      />
      {params?.default?.map(file => (
        <UploadedFile
          params={params}
          file={file}
          index={index}
          handleDeleteFile={handleDeleteFile}
        />
      ))}
    </>
  );
};

const renderString = (params, index, handleChangeParam): React.ReactElement => {
  return (
    <FlowTextArea
      style={{
        height: 30,
        minHeight: 30,
        maxHeight: 200,
      }}
      adaptiveHeight={true}
      placeholder={params?.description || '请输入'}
      value={params?.default}
      onChange={e =>
        handleChangeParam(
          index,
          d => (d.default = e.target.value),
          e.target.value
        )
      }
      onKeyDown={e => {
        if (e.key === 'Tab') {
          e.preventDefault();
          handleChangeParam(
            index,
            d => (d.default = params?.default + '\t'),
            params?.default + '\t'
          );
        }
      }}
    />
  );
};

const renderInteger = (
  params,
  index,
  handleChangeParam
): React.ReactElement => (
  <FlowInputNumber
    step={1}
    precision={0}
    value={params?.default}
    className="pt-0.5 w-full"
    onChange={value =>
      handleChangeParam(index, d => (d.default = value), value)
    }
  />
);

const renderNumber = (params, index, handleChangeParam): React.ReactElement => (
  <FlowInputNumber
    value={params?.default}
    className="pt-0.5 w-full"
    onChange={value =>
      handleChangeParam(index, d => (d.default = value), value)
    }
  />
);

const renderBoolean = (
  params,
  index,
  handleChangeParam
): React.ReactElement => (
  <FlowSelect
    value={params?.default}
    options={[
      { label: 'true', value: true },
      { label: 'false', value: false },
    ]}
    onChange={value =>
      handleChangeParam(index, d => (d.default = value), value)
    }
  />
);

const renderJsonEditor = (
  params,
  index,
  handleChangeParam
): React.ReactElement => (
  <JsonMonacoEditor
    value={params?.default}
    onChange={value =>
      handleChangeParam(index, d => (d.default = value), value)
    }
  />
);

export const renderParamInput = (
  params: unknown,
  index: number,
  fnc
): React.ReactElement | null => {
  const {
    handleChangeParam,
    uploadComplete,
    handleFileUpload,
    handleDeleteFile,
  } = fnc;
  const type = params?.schema?.type || params?.type;
  if (params?.fileType)
    return renderFileUpload(
      params,
      index,
      uploadComplete,
      handleFileUpload,
      handleDeleteFile
    );

  switch (type) {
    case 'string':
      return renderString(params, index, handleChangeParam);
    case 'integer':
      return renderInteger(params, index, handleChangeParam);
    case 'number':
      return renderNumber(params, index, handleChangeParam);
    case 'boolean':
      return renderBoolean(params, index, handleChangeParam);
    case 'object':
    default:
      if (type?.includes('array') || type === 'object')
        return renderJsonEditor(params, index, handleChangeParam);
      return null;
  }
};
