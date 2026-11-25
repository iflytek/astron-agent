import type { WorkflowNodeData } from '../types/domain';
import {
  handleModifyToolUrlParams,
  findFromTwoItems,
  transformTree,
} from '../utils/reactflowUtils';
import React, { useMemo, useCallback } from 'react';
import { getToolLatestVersion, getToolVersionList } from '@/services/plugin';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { Popconfirm } from 'antd';
import { cloneDeep } from 'lodash';
import { useTranslation } from 'react-i18next';
import { isJSON } from '@/utils';
import { getLatestWorkflow } from '@/services/flow';
import { getRpaDetail } from '@/services/rpa';
import { transRpaParameters } from '@/utils/rpa';

import oneClickUpdate from '@/assets/imgs/plugin/one-click-update.svg';

export const ToolNodeOneClickUpdate = ({
  id,
  data,
}: {
  id: string;
  data: WorkflowNodeData;
}): React.ReactElement => {
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const setNode = currentStore(state => state.setNode);
  const updateNodeRef = currentStore(state => state.updateNodeRef);

  const shouldUpdateNode = useMemo(() => {
    return data?.isLatest === false;
  }, [data?.isLatest]);

  const handleOneClickUpdate = useCallback(() => {
    const pluginId = data.nodeParam.pluginId;
    if (!pluginId) return;
    getToolVersionList(pluginId).then(data => {
      const tool = data[0];
      if (!tool) return;
      setNode(id, old => {
        old.data.nodeParam.pluginId = tool.toolId;
        old.data.nodeParam.operationId = tool.operationId;
        old.data.nodeParam.toolDescription = tool.description;
        old.data.nodeParam.version = tool.version || 'V1.0';
        old.data.isLatest = true;
        const toolRequestInput =
          (isJSON(tool?.webSchema) &&
            JSON.parse(tool.webSchema)?.toolRequestInput) ||
          [];
        old.data.inputs = handleModifyToolUrlParams(toolRequestInput);
        old.data.nodeParam.businessInput = findFromTwoItems(toolRequestInput);
        old.data.outputs = transformTree(
          (isJSON(tool?.webSchema) &&
            JSON.parse(tool.webSchema)?.toolRequestOutput) ||
            []
        );
        return cloneDeep(old);
      });
      updateNodeRef(id);
      autoSaveCurrentFlow();
      canPublishSetNot();
    });
  }, [setNode, id, data, autoSaveCurrentFlow, canPublishSetNot]);

  return (
    <>
      {shouldUpdateNode ? (
        <Popconfirm
          icon={null}
          title={null}
          description={t('workflow.nodes.common.confirmUpdate')}
          okButtonProps={{
            autoInsertSpace: false,
            className: 'popver-footer-button',
          }}
          cancelButtonProps={{
            autoInsertSpace: false,
            className: 'popver-footer-button',
          }}
          onConfirm={handleOneClickUpdate}
          onPopupClick={e => e.stopPropagation()}
        >
          <div
            className="bg-[#1FC92D] flex items-center gap-1 cursor-pointer"
            onClick={e => e.stopPropagation()}
            style={{
              padding: '2px 15px 2px 2px',
              borderRadius: '10px',
            }}
          >
            <img src={oneClickUpdate} className="w-[16px] h-[16px]" alt="" />
            <span className="text-xs text-white">
              {t('workflow.nodes.agentNode.oneClickUpdate')}
            </span>
          </div>
        </Popconfirm>
      ) : null}
    </>
  );
};

export const FlowNodeOneClickUpdate = ({
  id,
  data,
}: {
  id: string;
  data: WorkflowNodeData;
}): React.ReactElement => {
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const setNode = currentStore(state => state.setNode);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const updateNodeRef = currentStore(state => state.updateNodeRef);

  const shouldUpdateNode = useMemo(() => {
    return data?.isLatest === false;
  }, [data?.isLatest]);

  const handleOneClickUpdate = useCallback(() => {
    const flowId = data.nodeParam.flowId;
    if (!flowId) return;
    getLatestWorkflow({ flowId }).then(res => {
      setNode(id, old => {
        old.data.nodeParam.version = res.version;
        old.data.inputs = res?.ioInversion?.inputs || [];
        old.data.outputs = res?.ioInversion?.outputs || [];
        old.data.isLatest = true;
        return cloneDeep(old);
      });
      updateNodeRef(id);
      autoSaveCurrentFlow();
      canPublishSetNot();
    });
  }, [setNode, id, data, autoSaveCurrentFlow, canPublishSetNot]);

  return (
    <>
      {shouldUpdateNode ? (
        <Popconfirm
          icon={null}
          title={null}
          description={t('workflow.nodes.common.confirmUpdate')}
          okButtonProps={{
            autoInsertSpace: false,
            className: 'popver-footer-button',
          }}
          cancelButtonProps={{
            autoInsertSpace: false,
            className: 'popver-footer-button',
          }}
          onConfirm={handleOneClickUpdate}
        >
          <div
            className="bg-[#1FC92D] flex items-center gap-1 cursor-pointer"
            style={{
              padding: '2px 15px 2px 2px',
              borderRadius: '10px',
            }}
          >
            <img src={oneClickUpdate} className="w-[16px] h-[16px]" alt="" />
            <span className="text-xs text-white">
              {t('workflow.nodes.agentNode.oneClickUpdate')}
            </span>
          </div>
        </Popconfirm>
      ) : null}
    </>
  );
};

export const RpaNodeOneClickUpdate = ({
  id,
  data,
}: {
  id: string;
  data: WorkflowNodeData;
}): React.ReactElement => {
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const setNode = currentStore(state => state.setNode);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const updateNodeRef = currentStore(state => state.updateNodeRef);

  const shouldUpdateNode = useMemo(() => {
    return data?.isLatest === false;
  }, [data?.isLatest]);

  const handleOneClickUpdate = useCallback(() => {
    const rpaId = data?.nodeParam?.assistantId;
    const robotName = data?.nodeParam?.projectId;
    if (rpaId === undefined) return;
    getRpaDetail(rpaId).then(res => {
      const robot = res?.robots?.find(r => r.project_id === robotName);
      if (!robot) return;

      setNode(id, old => {
        old.data.nodeParam.version = robot.version;
        old.data.inputs = transRpaParameters(
          robot.parameters?.filter(item => item.varDirection === 0) || []
        );
        old.data.outputs = transRpaParameters(
          robot.parameters?.filter(item => item.varDirection === 1) || []
        );
        old.data.isLatest = true;
        return cloneDeep(old);
      });
      updateNodeRef(id);
      autoSaveCurrentFlow();
      canPublishSetNot();
    });
  }, [setNode, id, data, autoSaveCurrentFlow, canPublishSetNot, updateNodeRef]);

  return (
    <>
      {shouldUpdateNode ? (
        <Popconfirm
          icon={null}
          title={null}
          description={t('workflow.nodes.common.confirmUpdate')}
          okButtonProps={{
            autoInsertSpace: false,
            className: 'popver-footer-button',
          }}
          cancelButtonProps={{
            autoInsertSpace: false,
            className: 'popver-footer-button',
          }}
          onConfirm={handleOneClickUpdate}
          onPopupClick={e => e.stopPropagation()}
        >
          <div
            className="bg-[#1FC92D] flex items-center gap-1 cursor-pointer"
            onClick={e => e.stopPropagation()}
            style={{
              padding: '2px 15px 2px 2px',
              borderRadius: '10px',
            }}
          >
            <img src={oneClickUpdate} className="w-[16px] h-[16px]" alt="" />
            <span className="text-xs text-white">
              {t('workflow.nodes.agentNode.oneClickUpdate')}
            </span>
          </div>
        </Popconfirm>
      ) : null}
    </>
  );
};
