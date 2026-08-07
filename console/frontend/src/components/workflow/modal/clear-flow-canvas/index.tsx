import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from 'antd';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useTranslation } from 'react-i18next';
import { Icons } from '@/components/workflow/icons';
import { useMemoizedFn } from 'ahooks';
import { getNodeId } from '@/components/workflow/utils/reactflowUtils';
import { v4 as uuid } from 'uuid';
import { cloneDeep } from 'lodash';

function useDeleteCanvas(): () => void {
  const setNodeInfoEditDrawerlInfo = useFlowsManager(
    state => state.setNodeInfoEditDrawerlInfo
  );
  const nodeList = useFlowsManager(state => state.nodeList);
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const setClearFlowCanvasModalInfo = useFlowsManager(
    state => state.setClearFlowCanvasModalInfo
  );
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const setNodes = currentStore(state => state.setNodes);
  const setEdges = currentStore(state => state.setEdges);
  const takeSnapshot = currentStore(state => state.takeSnapshot);

  return useMemoizedFn(() => {
    takeSnapshot();
    const initialNodes = nodeList?.find(
      node => node?.name === '固定节点'
    )?.nodes;
    initialNodes.forEach(node => {
      node.id = getNodeId(node?.idType);
      node.type = 'custom';
      node.nodeType = node.id.split('::')[0];
      node.data.inputs = node.data.inputs.map(input => ({
        ...input,
        id: uuid(),
      }));
      node.data.outputs = node.data.outputs.map(output => ({
        ...output,
        id: uuid(),
      }));
    });
    setNodes(cloneDeep(initialNodes));
    setEdges([]);
    canPublishSetNot();
    setNodeInfoEditDrawerlInfo({
      open: false,
      nodeId: '',
    });
    setClearFlowCanvasModalInfo({
      open: false,
    });
    autoSaveCurrentFlow();
  });
}

export default function DeleteModal(): React.ReactElement {
  const deleteCanvas = useDeleteCanvas();
  const { t } = useTranslation();
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const clearFlowCanvasModalInfo = useFlowsManager(
    state => state.clearFlowCanvasModalInfo
  );
  const setClearFlowCanvasModalInfo = useFlowsManager(
    state => state.setClearFlowCanvasModalInfo
  );

  return (
    <>
      {clearFlowCanvasModalInfo.open
        ? createPortal(
            <div
              className="mask"
              style={{
                zIndex: 1002,
              }}
            >
              <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md min-w-[310px]">
                <div className="flex items-center">
                  <div className="bg-[#fff5f4] w-10 h-10 flex justify-center items-center rounded-lg">
                    <img
                      src={Icons.clearFlowCanvas.flowClear}
                      className="w-4 h-4"
                      alt=""
                    />
                  </div>
                  <p className="ml-2.5">
                    {t('workflow.promptDebugger.confirmClearCanvas')}
                  </p>
                </div>
                <div className="w-full h-10 bg-[#F9FAFB] text-center mt-7 py-2">
                  {currentFlow?.name}
                </div>
                <p className="mt-6 text-desc max-w-[310px]">
                  {t('workflow.promptDebugger.canvasClearDescription')}
                </p>
                <div className="flex flex-row-reverse gap-3 mt-7">
                  <Button
                    type="text"
                    onClick={deleteCanvas}
                    className="delete-btn"
                    style={{ paddingLeft: 24, paddingRight: 24 }}
                  >
                    {t('workflow.nodes.toolNode.delete')}
                  </Button>
                  <Button
                    type="text"
                    className="origin-btn"
                    onClick={() =>
                      setClearFlowCanvasModalInfo({
                        open: false,
                      })
                    }
                    style={{ paddingLeft: 24, paddingRight: 24 }}
                  >
                    {t('workflow.promptDebugger.cancel')}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
