import React, { useState, memo, useMemo } from 'react';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useFlowCommon } from '@/components/workflow/hooks/use-flow-common';
import NodeDetail from '@/components/workflow/modal/node-detail';
import { generateRandomPosition } from '@/components/workflow/utils/reactflowUtils';
import {
  AddNodeType,
  NewNodeType,
  PositionType,
} from '@/components/workflow/types/drawer/chat-debugger';

import nodeListAdd from '@/assets/imgs/workflow/node-list-add.png';
import nodelistCloseIcon from '@/assets/imgs/workflow/nodelist-close-icon.png';
import nodelistOpenIcon from '@/assets/imgs/workflow/nodelist-open-icon.png';
import arrowRightIcon from '@/assets/imgs/common/arrowRight.png';

// ========= 类型 =========
interface NodeItem {
  idType: string;
  aliasName: string;
  description?: string;
  data: {
    icon: string;
  };
}

interface NodeCategory {
  name: string;
  nodes: NodeItem[];
}

interface NodeListProps {
  noIterator?: boolean;
  hiddenIdTypes?: string[];
  hiddenAliasNames?: string[];
  handleAddNode?: (
    addNode: AddNodeType,
    position: PositionType
  ) => NewNodeType[] | null | void;
}

// ========= 组件 =========
const NodeList: React.FC<NodeListProps> = ({
  noIterator = false,
  hiddenIdTypes = [],
  hiddenAliasNames = [],
  handleAddNode: handleAddNodeProp,
}): React.ReactElement => {
  const { handleAddNode: handleAddNodeFromHook } = useFlowCommon();
  const handleAddNode = handleAddNodeProp ?? handleAddNodeFromHook;
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const nodeList = useFlowsManager(state => state.nodeList) as NodeCategory[];
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const showIterativeModal = useFlowsManager(state => state.showIterativeModal);
  const setWillAddNode = useFlowsManager(state => state.setWillAddNode);
  const reactFlowInstance = currentStore(state => state.reactFlowInstance);

  const [openNodeList, setOpenNodeList] = useState<boolean>(true);
  const [openNodeDetail, setOpenNodeDetail] = useState<boolean>(false);
  const [currentNodeId, setCurrentNodeId] = useState<string>('');

  const handleDragStart = (item: NodeItem): void => {
    setWillAddNode({ ...item });
  };

  const handleCloseNodeTemplate = (): void => {
    setOpenNodeDetail(false);
    setCurrentNodeId('');
  };

  const filterNodeList = useMemo<NodeCategory[]>(() => {
    return nodeList?.filter(node => node?.name !== '固定节点') || [];
  }, [nodeList]);

  return (
    <>
      {filterNodeList.length > 0 &&
        (openNodeList ? (
          <div
            className="h-full overflow-hidden"
            style={{
              width: openNodeList ? '16%' : 0,
              minWidth: '240px',
            }}
          >
            <div className="h-full pt-6 pb-12 text-[#333] flex flex-col gap-2 transition-all">
              <div className="flex flex-col w-full h-full gap-2 px-4 py-5 pr-0 rounded-2xl flow-node-list bg-[#e7eefe]">
                <div className="flex items-center justify-between pr-4">
                  <div className="text-lg">
                    {t('workflow.nodeList.selectNode')}
                  </div>
                  <div
                    className="w-[22px] h-[22px] flex items-center justify-center bg-[#fff] shadow-sm rounded-md cursor-pointer"
                    onClick={() => setOpenNodeList(false)}
                  >
                    <img
                      src={nodelistCloseIcon}
                      className="w-[10px] h-[10px]"
                      alt=""
                    />
                  </div>
                </div>
                <div className="flex-1 pr-2 overflow-hidden">
                  <div className="pr-2 h-full flex flex-col gap-1.5 overflow-auto">
                    {filterNodeList.map((nodeCategory, index) => (
                      <div key={index} className="flex flex-col gap-1.5">
                        <p className="text-[#6A7385]">{nodeCategory.name}</p>
                        <div className="flex flex-col gap-3.5">
                          {nodeCategory.nodes.map((item, idx) =>
                            (!noIterator || item?.idType !== 'iteration') &&
                            !(
                              item?.idType === 'loop-exit' &&
                              !showIterativeModal
                            ) &&
                            !hiddenIdTypes?.includes(item?.idType) &&
                            !hiddenAliasNames?.includes(item?.aliasName) ? (
                              <Tooltip
                                key={idx}
                                overlayClassName="white-tooltip"
                                placement="right"
                                title={
                                  <div>
                                    <p>{item.description}</p>
                                    <div
                                      className="flex items-center cursor-pointer justify-end"
                                      onClick={() => {
                                        setOpenNodeDetail(true);
                                        setCurrentNodeId(item?.idType);
                                      }}
                                    >
                                      <span className="text-[#6356EA] text-xs flex-shrink-0 self-center">
                                        {t('workflow.nodeList.details')}
                                      </span>
                                      <img
                                        src={arrowRightIcon}
                                        className="w-5 h-5 mt-1"
                                        alt=""
                                      />
                                    </div>
                                  </div>
                                }
                              >
                                <div
                                  draggable
                                  onDragStart={() => handleDragStart(item)}
                                  className="w-full cursor-pointer bg-[#ffffff] py-3 px-3.5 hover:shadow-md group"
                                  style={{
                                    borderRadius: 10,
                                    cursor: canvasesDisabled
                                      ? 'not-allowed'
                                      : 'pointer',
                                    pointerEvents: canvasesDisabled
                                      ? 'none'
                                      : 'auto',
                                  }}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <img
                                      src={item?.data?.icon}
                                      className="w-[20px] h-[20px]"
                                      alt=""
                                    />
                                    <span className="flex-1 text-base font-medium">
                                      {item.aliasName}
                                    </span>
                                    <div
                                      className="w-5 h-5 rounded-sm items-center justify-center cursor-pointer hover:bg-[#efefef] group-hover:flex hidden"
                                      onClick={() => {
                                        setWillAddNode(item);
                                        handleAddNode(
                                          item as unknown as AddNodeType,
                                          generateRandomPosition(
                                            reactFlowInstance?.getViewport()
                                          )
                                        );
                                      }}
                                    >
                                      <img
                                        src={nodeListAdd}
                                        className="w-3 h-3"
                                        alt=""
                                      />
                                    </div>
                                  </div>
                                </div>
                              </Tooltip>
                            ) : null
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {openNodeDetail && (
              <NodeDetail
                currentNodeId={currentNodeId}
                handleCloseNodeTemplate={handleCloseNodeTemplate}
              />
            )}
          </div>
        ) : (
          <div
            className="fixed left-0 top-[80px] bg-[#EBEFF4] border border-[#DFE4ED] mt-5"
            style={{
              borderRadius: '0 21px 21px 0',
              padding: '10px 17px 10px 28px',
              zIndex: 998,
            }}
          >
            <div
              className="w-[22px] h-[22px] flex items-center justify-center bg-[#fff] shadow-sm rounded-md cursor-pointer"
              onClick={() => setOpenNodeList(true)}
            >
              <img
                src={nodelistOpenIcon}
                className="w-[10px] h-[10px]"
                alt=""
              />
            </div>
          </div>
        ))}
    </>
  );
};

export default memo(NodeList);
