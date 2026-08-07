import React, {
  useRef,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Select, Space, Spin } from 'antd';
import { getRpaDetail, getRpaList } from '@/services/rpa';
import { useMemoizedFn, useRequest } from 'ahooks';
import { throttle } from 'lodash';
import dayjs from 'dayjs';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useTranslation } from 'react-i18next';
import { useFlowCommon } from '@/components/workflow/hooks/use-flow-common';

import { Icons } from '@/components/workflow/icons';

import resourceEmpty from '@/assets/svgs/resource-empty.svg';
import { RpaInfo, RpaNode, RpaRobot } from '@/types/rpa';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { ModalDetail } from '../modal-detail';
import { useNavigate } from 'react-router-dom';
import { ModalRpaRun } from '../modal-rpa-run';

export default function index(): React.ReactElement {
  const { handleAddRpaNode, resetBeforeAndWillNode } = useFlowCommon();
  const { t } = useTranslation();
  const modalRpaRunRef = useRef<{ showModal: (values?: RpaRobot) => void }>(
    null
  );
  const navigate = useNavigate();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const willAddNode = useFlowsManager(state => state.willAddNode);
  const nodes = currentStore(state => state.nodes);
  const rpaModal = useFlowsManager(state => state.rpaModalInfo.open);
  const setRpaModal = useFlowsManager(state => state.setRpaModalInfo);
  const rpaRef = useRef<HTMLDivElement | null>(null);
  const [searchValue, setSearchValue] = useState<string>('');

  const [currentRpa, setCurrentRpa] = useState<RpaInfo | null>(null);
  const modalDetailRef = useRef<{ showModal: (values?: RpaRobot) => void }>(
    null
  );
  const rpaToolList = useMemo((): Array<{ projectId?: string | undefined }> => {
    return (nodes as RpaNode[])
      ?.filter(node => node?.nodeType === 'rpa')
      ?.map(node => ({ projectId: node?.data?.nodeParam?.projectId }));
  }, [nodes]);

  const checkedIds = useMemo(() => {
    return rpaToolList?.map(item => item?.projectId) || [];
  }, [rpaToolList]);
  const { data: rpaList = [], loading: rpaListLoading } = useRequest(
    () => getRpaList({ name: '' }),
    {
      refreshDeps: [currentFlow?.flowId],
      onSuccess: data => {
        setCurrentRpa(data?.[0] || null);
      },
    }
  );

  const { data: rpaDetail, loading: rpaDetailLoading } = useRequest(
    () =>
      currentRpa?.id
        ? getRpaDetail(currentRpa?.id, { name: searchValue })
        : Promise.resolve(null),
    {
      refreshDeps: [currentRpa?.id, searchValue],
      debounceWait: 500,
    }
  );

  useEffect(() => {
    if (rpaRef.current) {
      rpaRef.current.scrollTop = 0;
    }
  }, [currentFlow?.flowId]);

  const handleRpaChangeThrottle = useCallback(
    throttle(data => {
      handleAddRpaNode(data);
    }, 1000),
    [nodes, willAddNode]
  );

  const handleCloseModal = useMemoizedFn(() => {
    setRpaModal({
      open: false,
    });
    resetBeforeAndWillNode();
  });

  return (
    <>
      {rpaModal
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
                    {t('workflow.nodes.rpaNode.selectRpa')}
                  </span>
                  <img
                    src={Icons.advancedConfig.close}
                    className="w-[14px] h-[14px] cursor-pointer"
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
                  {rpaListLoading ? (
                    <Spin />
                  ) : rpaList?.length > 0 ? (
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <Select
                          className="w-[160px]"
                          options={rpaList?.map(item => ({
                            label: item?.assistantName,
                            value: item?.id,
                          }))}
                          value={currentRpa?.id}
                          onChange={value => {
                            setCurrentRpa(
                              rpaList?.find(item => item?.id === value) || null
                            );
                          }}
                        ></Select>

                        <Input
                          className="w-[240px]"
                          placeholder={t('workflow.nodes.rpaNode.searchRobot')}
                          prefix={
                            <SearchOutlined
                              style={{ color: 'rgba(0,0,0,.25)' }}
                            />
                          }
                          onChange={e => {
                            setSearchValue(e.target.value);
                          }}
                        />
                      </div>
                      <div className="flex flex-col pt-6">
                        {rpaDetailLoading ? (
                          <Spin />
                        ) : rpaDetail?.robots?.length || 0 < 0 ? (
                          <div className="flex flex-col">
                            {rpaDetail?.robots?.map(item => (
                              <div
                                key={item?.project_id}
                                className="bg-[#F7F7FA] p-4 rounded-lg flex mb-[10px] "
                              >
                                <img
                                  className="w-[28px] h-[28px] rounded-lg"
                                  src={item?.icon}
                                  alt=""
                                />
                                <div className="flex-1 pl-[14px]">
                                  <div className="flex  flex-col">
                                    <p className="text-sm font-medium pb-[8px]">
                                      {item?.name}
                                    </p>
                                    <p className="max-w-[400px] text-[#7F7F7F] font-normal text-xs text-ellipsis overflow-hidden whitespace-nowrap">
                                      {item?.description}
                                    </p>
                                  </div>
                                </div>
                                <Space size={24}>
                                  <Button
                                    type="link"
                                    className="p-0 !text-[#6356EA]"
                                    onClick={() => {
                                      modalDetailRef.current?.showModal(item);
                                    }}
                                  >
                                    {t('workflow.nodes.rpaNode.parameters')}
                                  </Button>
                                  <button
                                    onClick={() => {
                                      modalRpaRunRef.current?.showModal({
                                        ...(item || {}),
                                        apiKey: rpaDetail?.fields?.apiKey,
                                      });
                                    }}
                                    className="w-[100px] text-center px-[16px] py-[4px] bg-white rounded-lg box-border border border-gray-200 shadow-sm font-normal text-[14px] text-[#275EFF]"
                                  >
                                    {t('rpa.run')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleRpaChangeThrottle({
                                        ...(item || {}),
                                        fields: rpaDetail?.fields,
                                        rpaId: rpaDetail?.id,
                                      });
                                    }}
                                    className="w-[100px] text-center px-[16px] py-[4px] bg-white rounded-lg box-border border border-gray-200 shadow-sm font-normal text-[14px] text-[#6356EA]"
                                  >
                                    {t('workflow.nodes.rpaNode.add')}
                                    <span>
                                      {checkedIds.filter(
                                        projectId =>
                                          projectId === item.project_id
                                      )?.length > 0 ? (
                                        <span className="pl-[6px]">
                                          {
                                            checkedIds.filter(
                                              projectId =>
                                                projectId === item.project_id
                                            )?.length
                                          }
                                        </span>
                                      ) : (
                                        ''
                                      )}
                                    </span>
                                  </button>
                                </Space>
                              </div>
                            ))}
                            <div className="text-[12px] text-[#7F7F7F] pt-[12px] text-center font-normal">
                              {t('workflow.nodes.rpaNode.noMore')}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-col justify-center items-center gap-[30px] text-desc h-full">
                            <img
                              src={resourceEmpty}
                              className="w-[124px] h-[122px]"
                              alt=""
                            />
                            <p>{t('workflow.nodes.rpaNode.noRobot')}</p>
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={() => {
                                navigate('/resource/rpa');
                              }}
                            >
                              {t('workflow.nodes.rpaNode.createRpa')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-col justify-center items-center gap-[30px] text-desc h-full">
                      <img
                        src={resourceEmpty}
                        className="w-[124px] h-[122px]"
                        alt=""
                      />
                      <p>{t('workflow.nodes.rpaNode.noRpaTool')}</p>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          navigate('/resource/rpa');
                        }}
                      >
                        {t('workflow.nodes.rpaNode.createRpa')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
      <ModalDetail ref={modalDetailRef} />
      <ModalRpaRun ref={modalRpaRunRef} />
    </>
  );
}
