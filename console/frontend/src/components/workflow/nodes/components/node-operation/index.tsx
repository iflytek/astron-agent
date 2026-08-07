import React, { useState, useMemo, memo } from 'react';
import { cloneDeep } from 'lodash';
import { message, Dropdown, Space, Tooltip } from 'antd';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import SingleNodeDebugging from '@/components/workflow/drawer/single-node-debugging';
import { generateDefaultInput } from '@/components/workflow/utils/reactflowUtils';
import { useTranslation } from 'react-i18next';
import { useMemoizedFn } from 'ahooks';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { UseNodeDebuggerReturn } from '@/components/workflow/types/nodes';
import { Icons } from '@/components/workflow/icons';
import { getFixedUrl, getAuthorization } from '@/components/workflow/utils';

const useNodeDebugger = (id, data, labelInput): UseNodeDebuggerReturn => {
  const { currentNode } = useNodeCommon({ id, data });
  const { t } = useTranslation();
  const setShowNodeList = useFlowsManager(state => state.setShowNodeList);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const setSingleNodeDebuggingInfo = useFlowsManager(
    state => state.setSingleNodeDebuggingInfo
  );
  const nodes = currentStore(state => state.nodes);
  const checkNode = currentStore(state => state.checkNode);
  const setNode = currentStore(state => state.setNode);
  const [open, setOpen] = useState(false);
  const [refInputs, setRefInputs] = useState([]);

  const nodeDebugExect = useMemoizedFn((currentNode, debuggerNode) => {
    currentNode.data.status = 'running';
    setShowNodeList(false);
    setNode(id, cloneDeep(currentNode));
    const params = {
      flowId: currentFlow?.flowId,
      name: currentFlow?.name,
      description: currentFlow?.description,
      data: {
        nodes: [debuggerNode],
        edges: [],
      },
    };
    const controller = new AbortController();
    const { signal } = controller;
    setSingleNodeDebuggingInfo({ nodeId: id, controller });
    //@ts-ignore
    fetch(getFixedUrl(`/workflow/node/debug/${id}`), {
      method: 'POST',
      body: JSON.stringify(params),
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthorization(),
      },
      signal,
    })
      .then(async response => {
        const res = await response.json();
        if (res.code === 0) {
          currentNode.data.debuggerResult = {
            timeCost: res.data['node_exec_cost'],
            tokenCost: res?.data?.['token_cost']?.['total_tokens'] || undefined,
            input: res.data.input && JSON.parse(res.data.input),
            rawOutput: res.data['raw_output'],
            output: res.data.output && JSON.parse(res.data.output),
          };
          currentNode.data.status = 'success';
        } else {
          currentNode.data.debuggerResult = {
            failedReason: res.message,
          };
          currentNode.data.status = 'failed';
        }
        setNode(id, cloneDeep(currentNode));
      })
      .finally(() => {
        setShowNodeList(true);
        setSingleNodeDebuggingInfo({ nodeId: '', controller: null });
      });
  });

  const handleNodeDebug = useMemoizedFn(() => {
    if (!checkNode(id)) {
      message.warning(t('workflow.promptDebugger.nodeValidationWarning'));
      return;
    }
    const currentNode = nodes.find(node => node.id === id);
    const refInputs = currentNode.data.inputs
      .filter(input => input.schema.value.type === 'ref')
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
