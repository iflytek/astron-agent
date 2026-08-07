import React, { useMemo, useCallback } from 'react';
import { getToolLatestVersion, getToolVersionList } from '@/services/plugin';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { Popconfirm } from 'antd';
import { cloneDeep } from 'lodash';
import { useTranslation } from 'react-i18next';
import { isJSON } from '@/utils';
import { v4 as uuid } from 'uuid';
import { getLatestWorkflow } from '@/services/flow';
import { getRpaDetail } from '@/services/rpa';
import { transRpaParameters } from '@/utils/rpa';

import oneClickUpdate from '@/assets/imgs/plugin/one-click-update.svg';

export const AgentNodeOneClickUpdate = ({ id, data }): React.ReactElement => {
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const setNode = currentStore(state => state.setNode);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const toolsList = useMemo(() => {
    return data?.nodeParam?.plugin?.toolsList || [];
  }, [data]);

  const shouldUpdateNode = useMemo(() => {
    return toolsList?.some(item => item?.isLatest === false);
  }, [toolsList]);

  const handleOneClickUpdate = useCallback(() => {
    const pluginIds = data?.nodeParam?.plugin?.toolsList
      ?.filter(item => item?.type === 'tool')
      ?.map(item => item?.toolId);
    getToolLatestVersion(pluginIds?.join(',')).then(data => {
      setNode(id, old => {
        const newTools = old?.data?.nodeParam?.plugin?.tools?.filter(
          item =>
            !pluginIds?.includes(item?.tool_id) && !pluginIds?.includes(item)
        );
        Object.keys(data).forEach(key => {
          newTools.push({
            tool_id: key,
            version: data[key] || 'V1.0',
          });
        });
        old.data.nodeParam.plugin.tools = newTools;
        old.data.nodeParam.plugin.toolsList.forEach(item => {
          item.isLatest = true;
          if (item?.pluginName) {
            item.name = item?.pluginName;
          }
        });
        return cloneDeep(old);
      });
      autoSaveCurrentFlow();
      canPublishSetNot();
    });
  }, [setNode, id, data, autoSaveCurrentFlow, canPublishSetNot]);

  return (
    <>
      {shouldUpdateNode && (
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
            style={{
              padding: '2px 15px 2px 2px',
              borderRadius: '10px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <img src={oneClickUpdate} className="w-[16px] h-[16px]" alt="" />
            <span className="text-white text-xs">
              {t('workflow.nodes.agentNode.oneClickUpdate')}
            </span>
          </div>
        </Popconfirm>
      )}
    </>
  );
};

export const ToolNodeOneClickUpdate = ({ id, data }): React.ReactElement => {
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

  const handleModifyToolUrlParams = (toolUrlParams): unknown[] => {
    return toolUrlParams
      ?.filter(item => item?.open !== false)
      ?.map(item => ({
        id: uuid(),
        name: item.name,
        type: item.type,
        disabled: false,
        required: item?.required,
        description: item?.description,
        schema: {
          type: item?.type,
          value: {
            type: 'ref',
            content: {},
          },
        },
      }));
  };

  const findFromTwoItems = useCallback((tree): string[] => {
    const result: string[] = [];

    function traverse(node): void {
      if (node.from === 1 && node?.fatherType !== 'array') {
        result.push(node?.name);
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => traverse(child));
      }
    }

    tree.forEach(node => traverse(node));

    return result;
  }, []);

  const transformTree = useCallback((inputArray): unknown[] => {
    function transformItem(item, isFirstLevel = false): unknown {
      // 如果节点 open === false，直接返回 null
      if (item.open === false) return null;

      const transformedItem = {
        id: item.id || uuid(),
        name: item.name,
      };

      if (isFirstLevel) {
        transformedItem.schema = {
          type: item.type,
        };
      } else {
        transformedItem.type = item.type;
      }

      if (item.type === 'array') {
        if (isFirstLevel) {
          if (item?.children?.[0]?.type !== 'object') {
            transformedItem.schema.type = `array-${item?.children?.[0]?.type}`;
            transformedItem.schema.properties = [];
          } else {
            transformedItem.schema.type = 'array-object';
            const children = item?.children?.[0]?.children || item.children;
            transformedItem.schema.properties = children
              ?.map(child => transformItem(child))
              .filter(Boolean); // 过滤掉 null 的子节点
          }
        } else {
          if (item?.children?.[0]?.type !== 'object') {
            transformedItem.type = `array-${item?.children?.[0]?.type}`;
            transformedItem.properties = [];
          } else {
            transformedItem.type = 'array-object';
            const children = item?.children?.[0]?.children || item.children;
            transformedItem.properties = children
              ?.map(child => transformItem(child))
              .filter(Boolean); // 过滤掉 null 的子节点
          }
        }
      } else if (item.children) {
        if (isFirstLevel) {
          transformedItem.schema.type = 'object';
          transformedItem.schema.properties = item.children
            .map(child => transformItem(child))
            .filter(Boolean); // 过滤掉 null 的子节点
        } else {
          transformedItem.type = 'object';
          transformedItem.properties = item.children
            .map(child => transformItem(child))
            .filter(Boolean); // 过滤掉 null 的子节点
        }
      }

      return transformedItem;
    }

    return inputArray.map(item => transformItem(item, true)).filter(Boolean); // 过滤掉 null 的顶层节点
  }, []);

  const handleOneClickUpdate = useCallback(() => {
    getToolVersionList(data?.nodeParam?.pluginId).then(data => {
      const tool = data?.[0];
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

export const FlowNodeOneClickUpdate = ({ id, data }): React.ReactElement => {
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
    getLatestWorkflow({ flowId: data?.nodeParam?.flowId }).then(res => {
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

export const RpaNodeOneClickUpdate = ({ id, data }): React.ReactElement => {
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
