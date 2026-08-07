import React, { useMemo, useCallback, useState, useEffect, memo } from 'react';
import { Drawer } from 'antd';
import { useTranslation } from 'react-i18next';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { ChatDebuggerContent } from '../chat-debugger';

// 类型导入
import {
  OperationResultProps,
  DrawerStyle,
  ErrorNode,
  PositionData,
  ReactFlowNode,
} from '@/components/workflow/types';

// 从统一的图标管理中导入
import { Icons } from '@/components/workflow/icons';
import { useMemoizedFn } from 'ahooks';

// 获取 Debugger Check 模块的图标
const icons = Icons.debuggerCheck;

function OperationResult({
  open,
  setOpen,
}: OperationResultProps): React.ReactElement {
  const { t } = useTranslation();
  const errNodes = useFlowsManager(state => state.errNodes) as ErrorNode[];
  const checkFlow = useFlowsManager(state => state.checkFlow) as () => void;
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const nodeList = useFlowsManager(state => state.nodeList);
  const setNodeInfoEditDrawerlInfo = useFlowsManager(
    state => state.setNodeInfoEditDrawerlInfo
  );
  const nodes = currentStore(state => state.nodes);
  const moveToPosition = currentStore(state => state.moveToPosition);
  const [drawerStyle, setDrawerStyle] = useState<DrawerStyle>({
    height: (window?.innerHeight ?? 0) - 80,
    top: 80,
    right: 0,
    zIndex: 998,
  });

  useEffect(() => {
    const handleAdjustmentDrawerStyle = (): void => {
      setDrawerStyle({
        ...drawerStyle,
        height: (window?.innerHeight ?? 0) - 80,
        top: 80,
      });
    };
    window.addEventListener('resize', handleAdjustmentDrawerStyle);
    return (): void =>
      window.removeEventListener('resize', handleAdjustmentDrawerStyle);
  }, [drawerStyle]);

  const handleMoveToPosition = useMemoizedFn((id: string): void => {
    const currentNode = nodes.find(node => node.id === id);
    const zoom = 0.8;
    const xPos = currentNode?.position?.x ?? 0;
    const yPos = currentNode?.position?.y ?? 0;
    const position: PositionData = {
      x: -xPos * zoom + 200,
      y: -yPos * zoom + 200,
      zoom,
    };
    moveToPosition(position);
    setNodeInfoEditDrawerlInfo({
      open: true,
      nodeId: id,
    });
  });

  const handleClickErrorNode = useMemoizedFn((id: string) => {
    handleMoveToPosition(id);
  });
  const showErrorNodesDrawer = useMemo(() => {
    return errNodes?.length !== 0;
  }, [errNodes]);

  const nodeIcon = useMemoizedFn((nodeType: string) => {
    let nodeFinallyType = '';
    if (['iteration-node-start', 'loop-node-start'].includes(nodeType)) {
      nodeFinallyType = 'node-start';
    } else if (
      ['iteration-node-end', 'loop-node-end', 'loop-exit'].includes(nodeType)
    ) {
      nodeFinallyType = 'node-end';
    } else {
      nodeFinallyType = nodeType;
    }
    const currentNode = nodeList
      ?.flatMap(item => item?.nodes)
      ?.find(item => item?.idType === nodeFinallyType);
    return currentNode?.data?.icon;
  });

  return (
    <Drawer
      rootClassName="operation-result-container"
      placement="right"
      rootStyle={drawerStyle}
      open={open}
      mask={false}
      destroyOnClose
    >
      {showErrorNodesDrawer && (
        <>
          <div className="flex justify-end px-5 mt-2">
            <img
              src={icons.close}
              className="w-3 h-3 cursor-pointer"
              alt=""
              onClick={() => {
                setOpen(false);
              }}
            />
          </div>
          <div className="mt-4 flex items-center justify-between px-5">
            <div className="flex items-center gap-2">
              <img src={icons.operationResult} className="w-4 h-4" alt="" />
              <span className="text-base">
                {t('workflow.nodes.operationResult.errorNodes')}
              </span>
            </div>
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => checkFlow()}
            >
              <img src={icons.restart} className="w-3 h-3" alt="" />
              <span className="text-[#6356EA]">
                {t('workflow.nodes.operationResult.rerun')}
              </span>
            </div>
          </div>
          <div className="px-5">
            {errNodes.map(node => (
              <div
                key={node.id}
                className="border border-[#E0E3E7] p-4 mt-4 rounded-lg cursor-pointer"
                onClick={() => handleClickErrorNode(node.id)}
              >
                <div className="flex items-center  gap-5">
                  <img
                    src={nodeIcon(node.nodeType)}
                    className="w-[30px] h-[30px]"
                    alt=""
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-base font-medium">{node.name}</span>
                    <span className="text-[#F74E43] text-xs">
                      {node.errorMsg}
                    </span>
                  </div>
                </div>
                {(node?.childErrList?.length ?? 0) > 0 && (
                  <div className="my-3">
                    {t('workflow.nodes.operationResult.errorChildNodes')}
                  </div>
                )}
                {node?.childErrList?.map(childNode => (
                  <div key={childNode?.id} className="flex items-center  gap-5">
                    <img
                      src={nodeIcon(childNode.nodeType)}
                      className="w-[30px] h-[30px]"
                      alt=""
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-medium">
                        {childNode.name}
                      </span>
                      <span className="text-[#F74E43] text-xs">
                        {childNode.errorMsg}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
      {!showErrorNodesDrawer && (
        <ChatDebuggerContent open={open} setOpen={setOpen} />
      )}
    </Drawer>
  );
}

export default memo(OperationResult);
