import React, {
  useRef,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { Spin } from 'antd';
import { listFlows } from '@/services/flow';
import { useMemoizedFn } from 'ahooks';
import { throttle } from 'lodash';
import dayjs from 'dayjs';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useTranslation } from 'react-i18next';
import { useFlowCommon } from '@/components/workflow/hooks/use-flow-common';
import { FlowListItem, FlowNode } from '@/components/workflow/types/modal';
import { Icons } from '@/components/workflow/icons';

import flowIcon from '@/assets/imgs/common/icon_flow_item.png';
import publishIcon from '@/assets/imgs/workflow/publish-icon.png';
import knowledgeListEmpty from '@/assets/imgs/workflow/knowledge-list-empty.png';

export default function index(): React.ReactElement {
  const { handleAddFlowNode, resetBeforeAndWillNode } = useFlowCommon();
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const willAddNode = useFlowsManager(state => state.willAddNode);
  const nodes = currentStore(state => state.nodes);
  const flowModal = useFlowsManager(state => state.flowModalInfo.open);
  const setFlowModal = useFlowsManager(state => state.setFlowModalInfo);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const [allData, setAllData] = useState<FlowListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const flowList = useMemo((): Array<{ flowId?: string | undefined }> => {
    return nodes
      ?.filter((node: FlowNode) => node?.nodeType === 'flow')
      ?.map((node: FlowNode) => ({ flowId: node?.data?.nodeParam?.flowId }));
  }, [nodes]);

  const checkedIds = useMemo(() => {
    return flowList?.map(item => item?.flowId) || [];
  }, [flowList]);

  useEffect(() => {
    if (flowRef.current) {
      flowRef.current.scrollTop = 0;
    }
    getFlows('');
  }, [currentFlow?.flowId]);

  function getFlows(value?: string): void {
    setLoading(true);
    const params = {
      current: 1,
      pageSize: 999,
      search: value,
      status: 1,
      flowId: currentFlow?.flowId,
    };
    listFlows(params)
      .then(data => {
        setAllData(data.pageData);
      })
      .finally(() => setLoading(false));
  }

  const handleFlowChangeThrottle = useCallback(
    throttle(flow => {
      handleAddFlowNode(flow);
    }, 1000),
    [nodes, willAddNode]
  );

  const handleCloseModal = useMemoizedFn(() => {
    setFlowModal({
      open: false,
    });
    resetBeforeAndWillNode();
  });

  return (
    <>
      {flowModal
        ? createPortal(
            <div
              className="mask"
              style={{
                zIndex: 1001,
              }}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => e.stopPropagation()}
            >
              <div className="p-6 pr-0 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md w-[820px] h-[570px] flex flex-col">
                <div className="flex items-center justify-between font-medium pr-6">
                  <span className="font-semibold text-base">
                    {t('workflow.nodes.addFlow.selectWorkflow')}
                  </span>
                  <img
                    src={Icons.advancedConfig.close}
                    className="w-7 h-7 cursor-pointer"
                    alt=""
                    onClick={handleCloseModal}
                  />
                </div>
                <div
                  className="flex flex-col gap-2.5 mt-4 flex-1 pr-6"
                  style={{
                    overflow: 'auto',
                  }}
                >
                  {loading ? (
                    <Spin />
                  ) : allData.length > 0 ? (
                    allData.map((item: unknown) => {
                      return (
                        <div
                          key={item?.id}
                          className="flex flex-col bg-[#F7F7FA] p-4 rounded-lg gap-2"
                        >
                          <div className="flex items-center gap-2.5">
                            <img src={flowIcon} className="w-7 h-7" alt="" />
                            <div className="flex items-center flex-1 overflow-hidden">
                              <p
                                className="flex-1 text-overflow text-sm font-medium"
                                title={item.name}
                              >
                                {item.name}
                              </p>
                            </div>
                            <div
                              className="flex items-center gap-1 cursor-pointer border border-[#E5E5E5] py-1 px-6 rounded-lg"
                              onClick={() => {
                                handleFlowChangeThrottle(item);
                              }}
                            >
                              <span>{t('workflow.nodes.addFlow.add')}</span>
                              <span>
                                {checkedIds.filter(
                                  flowId => flowId === item.flowId
                                )?.length > 0
                                  ? checkedIds.filter(
                                      flowId => flowId === item.flowId
                                    )?.length
                                  : ''}
                              </span>
                            </div>
                          </div>
                          <div className="w-full flex items-start pl-[38px] gap-5 overflow-hidden">
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <img
                                src={publishIcon}
                                className="w-3 h-3"
                                alt=""
                              />
                              <p className="text-[#757575] text-xs">
                                {`${t(
                                  'workflow.nodes.addFlow.createTime'
                                )}：${dayjs(item?.createTime)?.format(
                                  'YYYY-MM-DD HH:mm:ss'
                                )}`}
                              </p>
                            </div>
                            <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                              {item?.ioInversion?.inputs?.map(input => (
                                <div
                                  key={input?.id}
                                  className="rounded-sm px-2 py-0.5 bg-[#fff] text-xs font-medium"
                                >
                                  {input?.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="mt-3 flex flex-col justify-center items-center gap-[30px] text-desc h-full">
                      <img
                        src={knowledgeListEmpty}
                        className="w-[124px] h-[122px]"
                        alt=""
                      />
                      <p>{t('workflow.nodes.addFlow.noWorkflow')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
