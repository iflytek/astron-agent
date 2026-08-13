import React, { useEffect, useMemo, useRef, useState, memo } from 'react';
import { cloneDeep } from 'lodash';
import { message, Dropdown, Space, Tooltip } from 'antd';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import SingleNodeDebugging from '@/components/workflow/drawer/single-node-debugging';
import { generateDefaultInput } from '@/components/workflow/utils/reactflowUtils';
import { useTranslation } from 'react-i18next';
import { useMemoizedFn } from 'ahooks';
import { useLocation } from 'react-router-dom';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { UseNodeDebuggerReturn } from '@/components/workflow/types/nodes';
import { Icons } from '@/components/workflow/icons';
import { debugWorkflowNode } from '@/services/flow';
import { getActiveImportDependencyIssues } from '@/components/workflow/utils/workflow-import-dependencies';
import useFlowStore from '@/components/workflow/store/use-flow-store';
import {
  createWorkflowIdentity,
  executeNodeDebugRequest,
  isNodeDebugCancellation,
  mergeNodeDebugRequest,
  mergeNodeDebugState,
  nodeDebugRequestCoordinator,
} from './node-debug-request';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;

const errorDetails = (error: unknown): { code?: number; message?: string } => {
  const record = asRecord(error);
  return {
    code: typeof record?.code === 'number' ? record.code : undefined,
    message:
      typeof record?.message === 'string' && record.message.trim()
        ? record.message.trim()
        : undefined,
  };
};

const parseDebugValue = (value: unknown): unknown => {
  if (typeof value !== 'string' || !value.trim()) return value || undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const useInvalidateNodeDebugOnWorkflowChange = (
  workflowIdentity: string,
  setShowNodeList: (show: boolean) => void,
  setSingleNodeDebuggingInfo: (info: {
    nodeId: string;
    controller: unknown;
  }) => void
): React.MutableRefObject<number | null> => {
  const activeRequestIdRef = useRef<number | null>(null);

  useEffect(() => {
    return (): void => {
      const requestId = activeRequestIdRef.current;
      if (
        requestId === null ||
        !nodeDebugRequestCoordinator.invalidate(requestId)
      ) {
        return;
      }
      activeRequestIdRef.current = null;
      setShowNodeList(true);
      setSingleNodeDebuggingInfo({ nodeId: '', controller: null });
    };
  }, [workflowIdentity, setShowNodeList, setSingleNodeDebuggingInfo]);

  return activeRequestIdRef;
};

const useNodeDebugger = (id, data, labelInput): UseNodeDebuggerReturn => {
  const { currentNode } = useNodeCommon({ id, data });
  const { t } = useTranslation();
  const location = useLocation();
  const setShowNodeList = useFlowsManager(state => state.setShowNodeList);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const flushCurrentFlow = useFlowsManager(state => state.flushCurrentFlow);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const setSingleNodeDebuggingInfo = useFlowsManager(
    state => state.setSingleNodeDebuggingInfo
  );
  const checkFlow = useFlowsManager(state => state.checkFlow);
  const setOpenOperationResult = useFlowsManager(
    state => state.setOpenOperationResult
  );
  const nodes = currentStore(state => state.nodes);
  const checkNode = currentStore(state => state.checkNode);
  const setNode = currentStore(state => state.setNode);
  const [open, setOpen] = useState(false);
  const [refInputs, setRefInputs] = useState([]);
  const routeIdentity = `${location.pathname}${location.search}`;
  const workflowIdentity = createWorkflowIdentity({
    ...currentFlow,
    routeIdentity,
  });
  const currentWorkflowIdentityRef = useRef(workflowIdentity);
  currentWorkflowIdentityRef.current = workflowIdentity;
  const activeRequestIdRef = useInvalidateNodeDebugOnWorkflowChange(
    workflowIdentity,
    setShowNodeList,
    setSingleNodeDebuggingInfo
  );

  const blockForImportDependencies = useMemoizedFn((): boolean => {
    const workflowNodes = useFlowStore.getState().nodes;
    if (getActiveImportDependencyIssues(workflowNodes).length === 0)
      return false;
    checkFlow();
    setOpenOperationResult(true);
    message.error(
      t('workflow.promptDebugger.importDependencyExecutionBlocked')
    );
    return true;
  });

  const nodeDebugExect = useMemoizedFn((currentNode, debuggerNode) => {
    if (blockForImportDependencies()) return;
    const setDebugState = (
      status: string,
      debuggerResult?: UnknownRecord
    ): void => {
      setNode(id, latestNode => {
        if (!latestNode) return latestNode;
        return mergeNodeDebugState(latestNode, { status, debuggerResult });
      });
    };

    const execution = executeNodeDebugRequest({
      workflowIdentity,
      flushCurrentFlow,
      isWorkflowCurrent: identity => {
        const latestFlow = useFlowsManager.getState().currentFlow;
        return (
          currentWorkflowIdentityRef.current === identity &&
          createWorkflowIdentity({ ...latestFlow, routeIdentity }) === identity
        );
      },
      request: signal => {
        const manager = useFlowsManager.getState();
        const latestFlow = manager.currentFlow;
        const latestNode = manager
          .getCurrentStore()
          .getState()
          .nodes.find(node => node.id === id);
        if (!latestNode) {
          throw new Error(t('workflow.promptDebugger.nodeDebugRequestFailed'));
        }
        const requestNode = cloneDeep(
          mergeNodeDebugRequest(latestNode, currentNode, debuggerNode)
        );
        return debugWorkflowNode(
          id,
          {
            flowId: latestFlow?.flowId,
            name: latestFlow?.name,
            description: latestFlow?.description,
            data: {
              nodes: [requestNode],
              edges: [],
            },
          },
          signal
        );
      },
      onRunning: ({ controller }) => {
        setDebugState('running');
        setShowNodeList(false);
        setSingleNodeDebuggingInfo({ nodeId: id, controller });
      },
      onSuccess: (res: unknown) => {
        const result = asRecord(res) ?? {};
        const tokenCost = asRecord(result.token_cost);
        setDebugState('success', {
          timeCost: result.node_exec_cost,
          tokenCost: tokenCost?.total_tokens || undefined,
          input: parseDebugValue(result.input),
          rawOutput: result.raw_output,
          output: parseDebugValue(result.output),
        });
      },
      onFailure: (error: unknown, { controller }) => {
        if (isNodeDebugCancellation(error, controller.signal)) {
          setDebugState('cancel', {
            cancelReason: t('workflow.promptDebugger.nodeDebugCancelled'),
          });
        } else {
          const details = errorDetails(error);
          const isDependencyGuard = details.code === 8129;
          setDebugState('failed', {
            failedReason: isDependencyGuard
              ? t('workflow.promptDebugger.importDependencyExecutionBlocked')
              : details.message ||
                t('workflow.promptDebugger.nodeDebugRequestFailed'),
          });
        }
      },
      onFlushFailure: (error: unknown) => {
        const details = errorDetails(error);
        const failedReason =
          details.message ||
          t('workflow.promptDebugger.nodeDebugRequestFailed');
        setDebugState('failed', { failedReason });
        message.error(failedReason);
      },
      onSuperseded: () => {
        setDebugState('cancel', {
          cancelReason: t('workflow.promptDebugger.nodeDebugCancelled'),
        });
      },
      onSettled: ({ requestId }) => {
        if (activeRequestIdRef.current === requestId) {
          activeRequestIdRef.current = null;
        }
        setShowNodeList(true);
        setSingleNodeDebuggingInfo({ nodeId: '', controller: null });
      },
    });
    activeRequestIdRef.current = execution.request.requestId;
    void execution.completion;
  });

  const handleNodeDebug = useMemoizedFn(() => {
    if (blockForImportDependencies()) return;
    if (!checkNode(id)) {
      message.warning(t('workflow.promptDebugger.nodeValidationWarning'));
      return;
    }
    const currentNode = nodes.find(node => node.id === id);
    if (!currentNode) {
      message.error(t('workflow.promptDebugger.nodeDebugRequestFailed'));
      return;
    }
    const refInputs = (currentNode.data.inputs || [])
      .filter(input => input?.schema?.value?.type === 'ref')
      ?.map(input => {
        return {
          id: input.id,
          name: input.name,
          required: input?.required,
          type: input?.schema?.type,
          default: input?.fileType
            ? []
            : input?.schema?.type === 'object'
              ? '{}'
              : input?.schema?.type.includes('array')
                ? '[]'
                : generateDefaultInput(input?.schema?.type),
          fileType: input.fileType,
        };
      });
    if (refInputs.length === 0) {
      const debuggerNode = cloneDeep(currentNode);
      debuggerNode.data.inputs = debuggerNode.data.inputs?.filter(
        input => input?.schema?.value?.content
      );
      nodeDebugExect(currentNode, debuggerNode);
    } else {
      setRefInputs(refInputs);
      setOpen(true);
    }
  });

  const remarkStatus = useMemo(() => {
    const data = currentNode?.data;
    if (data && Object.hasOwn(data.nodeParam, 'remark')) {
      return data.nodeParam.remarkVisible ? 'show' : 'hide';
    }
    return null;
  }, [currentNode]);

  const remarkClick = (): void => {
    setNode(id, {
      ...currentNode,
      data: {
        ...currentNode.data,
        nodeParam: {
          ...currentNode.data.nodeParam,
          remarkVisible: remarkStatus === 'show' ? false : true,
          remark: remarkStatus ? currentNode.data.nodeParam.remark : '',
        },
      },
    });
    autoSaveCurrentFlow();
  };

  const labelInputId = useMemo(() => {
    return id + labelInput;
  }, [id, labelInput]);

  return {
    open,
    setOpen,
    refInputs,
    setRefInputs,
    handleNodeDebug,
    nodeDebugExect,
    remarkStatus,
    remarkClick,
    labelInputId,
  };
};

const NodeMenu = ({ id, remarkStatus, remarkClick }): React.ReactElement => {
  const { t } = useTranslation();
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const deleteNode = currentStore(state => state.deleteNode);
  const copyNode = currentStore(state => state.copyNode);
  const setNodeInfoEditDrawerlInfo = useFlowsManager(
    state => state.setNodeInfoEditDrawerlInfo
  );
  const items = [
    {
      key: '1',
      label: (
        <Space size={4}>
          <img width={15} src={Icons.nodeOperation.remark} alt="" />
          <span className="text-[#99A1B6]">
            {remarkStatus
              ? remarkStatus === 'show'
                ? t('workflow.nodes.common.hideNote')
                : t('workflow.nodes.common.showNote')
              : t('workflow.nodes.common.addNote')}
          </span>
        </Space>
      ),
      onClick: (e): void => {
        e.domEvent.stopPropagation();
        remarkClick();
      },
    },
    {
      key: '2',
      label: (
        <Space size={4}>
          <img width={15} src={Icons.nodeOperation.copy} alt="" />
          <span className="text-[#99A1B6]">
            {t('workflow.nodes.common.createCopy')}
          </span>
        </Space>
      ),
      onClick: (e): void => {
        e.domEvent.stopPropagation();
        copyNode(id);
      },
    },
    {
      key: '3',
      label: (
        <Space size={4}>
          <div className="w-[15px] h-[15px] flex justify-center items-center delete-icon"></div>
          <span className="delete-text">
            {t('workflow.nodes.common.deleteNode')}
          </span>
        </Space>
      ),
      'data-type': 'delete',
      onClick: (e): void => {
        e.domEvent.stopPropagation();
        deleteNode(id);
        setNodeInfoEditDrawerlInfo({
          open: false,
          nodeId: '',
        });
      },
    },
  ];
  return (
    <Dropdown
      menu={{ items }}
      placement="bottomLeft"
      overlayClassName="dropdown"
    >
      <img
        src={Icons.nodeOperation.dot}
        className="w-4 h-4 cursor-pointer hover:bg-[#DDE3F1] rounded-[2px]"
        alt=""
      />
    </Dropdown>
  );
};

function index({ data, id, labelInput = 'labelInput' }): React.ReactElement {
  const {
    open,
    setOpen,
    refInputs,
    setRefInputs,
    nodeDebugExect,
    handleNodeDebug,
    remarkStatus,
    remarkClick,
    labelInputId,
  } = useNodeDebugger(id, data, labelInput);
  const { nodeType } = useNodeCommon({ id, data });
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const updateNodeNameStatus = currentStore(
    state => state.updateNodeNameStatus
  );
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);

  return (
    <>
      {!canvasesDisabled ? (
        <div className="flex items-center gap-3">
          <SingleNodeDebugging
            id={id}
            open={open}
            setOpen={setOpen}
            refInputs={refInputs}
            setRefInputs={setRefInputs}
            nodeDebugExect={nodeDebugExect}
          />
          {!['if-else', 'message', 'iteration', 'question-answer'].includes(
            nodeType as string
          ) && (
            <Tooltip title="测试该节点" overlayClassName="black-tooltip">
              <img
                src={Icons.nodeOperation.nodeDebugger}
                className="w-4 h-4 cursor-pointer"
                alt=""
                onClick={() => {
                  handleNodeDebug();
                }}
                style={{
                  pointerEvents: 'auto',
                }}
              />
            </Tooltip>
          )}
          {!data?.labelEdit && (
            <Tooltip title="重命名" overlayClassName="black-tooltip">
              <img
                src={Icons.nodeOperation.nodeEdit}
                className="w-4 h-4 cursor-pointer"
                alt=""
                onClick={(e): void => {
                  e.stopPropagation();
                  updateNodeNameStatus(id, labelInputId);
                }}
              />
            </Tooltip>
          )}
          <div onClick={(e): void => e?.stopPropagation()}>
            <NodeMenu
              id={id}
              remarkStatus={remarkStatus}
              remarkClick={remarkClick}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

export default memo(index);
