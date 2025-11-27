import React, { useMemo, useState, useEffect } from 'react';
import { Tooltip, Button, message } from 'antd';
import { useMemoizedFn } from 'ahooks';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useFlowCommon } from '@/components/workflow/hooks/use-flow-common';
import { downloadFileWithHeaders } from '@/utils/http';
import { getFixedUrl } from '@/components/workflow/utils';
import WxModal from '@/components/wx-modal';
import useToggle from '@/hooks/use-toggle';
import { isCanPublish } from '@/services/flow';
import { getAgentDetail } from '@/services/release-management';
import { useBotStateStore } from '@/store/spark-store/bot-state';

import publishModalIcon from '@/assets/imgs/workflow/publish-modal-icon.png';

// Props 类型定义
interface PublishHeaderProps {
  publishModal: boolean;
  setPublishModal: React.Dispatch<React.SetStateAction<boolean>>;
}

// 节点类型定义
interface NodeType {
  id: string;
  type: string;
  data?: {
    outputs?: unknown[];
  };
}

// 流程类型定义
interface FlowType {
  id?: string;
  name?: string;
  status?: number;
}

const usePublishHeader = ({
  setBotMultiFileParam,
  setOpenWxmol,
  setFabuFlag,
  setPublishModal,
}) => {
  // Flow store
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const setVersionManagement = useFlowsManager(
    state => state.setVersionManagement
  );
  const setAdvancedConfiguration = useFlowsManager(
    state => state.setAdvancedConfiguration
  );
  const setOpenOperationResult = useFlowsManager(
    state => state.setOpenOperationResult
  );
  const historyVersion = useFlowsManager(state => state.historyVersion);
  const canPublish = useFlowsManager(state => state.canPublish);
  const setNodeInfoEditDrawerlInfo = useFlowsManager(
    state => state.setNodeInfoEditDrawerlInfo
  );
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const nodes = currentStore(state => state.nodes);
  const setBotDetailInfo = useBotStateStore(state => state.setBotDetailInfo);
  const handleVersionSettings = useMemoizedFn(() => {
    setVersionManagement((prev: boolean) => !prev);
    setAdvancedConfiguration(false);
    setOpenOperationResult(false);
  });

  const showComparativeDebugging = useMemo(() => {
    const startNode = nodes?.find(node => node.type === 'node-start');
    const outputs = startNode?.data?.outputs;
    let multiParams = true;
    if (
      outputs?.length === 1 ||
      outputs
        ?.slice(1)
        .every((item: { fileType: string }) => item.fileType === 'file')
    ) {
      multiParams = false;
    }
    return (
      !historyVersion &&
      canPublish &&
      nodes?.some(node => node.type === 'spark-llm') &&
      !multiParams
    );
  }, [historyVersion, nodes, canPublish]);

  const handleAdvancedSettings = useMemoizedFn(() => {
    setVersionManagement(false);
    setAdvancedConfiguration((prev: boolean) => !prev);
    setNodeInfoEditDrawerlInfo({
      open: false,
      nodeId: '',
    });
    setOpenOperationResult(false);
  });

  const multiParams = useMemo(() => {
    const startNode = nodes?.find(node => node?.nodeType === 'node-start');
    const outputs = startNode?.data?.outputs;
    let multiParams = true;
    if (
      outputs?.length === 1 ||
      outputs
        ?.slice(1)
        .every((item: { fileType: string }) => item.fileType === 'file')
    ) {
      multiParams = false;
    }
    return multiParams;
  }, [nodes]);

  const handlePublish = useMemoizedFn(() => {
    setVersionManagement(false);
    isCanPublish(currentFlow?.id).then(flag => {
      if (flag) {
        setFabuFlag(true);
        setOpenWxmol(true);
      } else {
        setPublishModal(true);
      }
    });
  });
  const newBotId = useMemo(() => {
    return currentFlow?.ext ? JSON.parse(currentFlow.ext)?.botId : null;
  }, [currentFlow]);

  const getBotBaseInfo = (newBotId?: string | number): void => {
    const botId = newBotId;
    getAgentDetail(botId as unknown as number)
      .then(data => {
        setBotDetailInfo({
          ...data,
          name: data?.botName,
        });
      })
      .catch(err => {
        return err?.msg && message.error(err.msg);
      });
  };
  return {
    handlePublish,
    showComparativeDebugging,
    handleVersionSettings,
    handleAdvancedSettings,
    multiParams,
    newBotId,
    getBotBaseInfo,
  };
};

const PublishHeader: React.FC<PublishHeaderProps> = ({
  publishModal,
  setPublishModal,
}) => {
  const { t } = useTranslation();
  const { handleDebugger } = useFlowCommon();
  const navigate = useNavigate();
  const { id: agentMaasId } = useParams<{ id: string }>();
  // Flow store
  const currentFlow: FlowType = useFlowsManager(
    (state: unknown) => state.currentFlow
  );
  const setOpenOperationResult = useFlowsManager(
    (state: unknown) => state.setOpenOperationResult
  );
  const historyVersion: boolean = useFlowsManager(
    (state: unknown) => state.historyVersion
  );
  const checkFlow = useFlowsManager((state: unknown) => state.checkFlow);
  const isLoading: boolean = useFlowsManager(
    (state: unknown) => state.isLoading
  );
  const [botMultiFileParam, setBotMultiFileParam] = useState<boolean>(false);
  const [editV2Visible, { setLeft: hide, setRight: show }] = useToggle();
  const [fabuFlag, setFabuFlag]: any = useState(false);
  const [openWxmol, setOpenWxmol] = useState(false);
  const {
    handlePublish,
    showComparativeDebugging,
    handleVersionSettings,
    handleAdvancedSettings,
    multiParams,
    newBotId,
    getBotBaseInfo,
  } = usePublishHeader({
    setBotMultiFileParam,
    setOpenWxmol,
    setFabuFlag,
    setPublishModal,
  });

  useEffect(() => {
    newBotId && getBotBaseInfo(newBotId);
  }, [newBotId]);

  return (
    <div className="relative flex items-center gap-6 flow-header-operation-container">
      <WxModal
        botMultiFileParam={botMultiFileParam}
        moreParams={multiParams}
        showInfoModel={show}
        setPageInfo={() => {}}
        disjump={true}
        setIsOpenapi={() => {}}
        fabuFlag={fabuFlag}
        show={openWxmol}
        onCancel={() => {
          setOpenWxmol(false);
        }}
        workflowId={
          currentFlow?.ext ? JSON.parse(currentFlow.ext)?.botId : null
        }
        agentMaasId={agentMaasId || null}
        isVirtual={currentFlow?.type === 4}
      />
      <Tooltip
        title={t('workflow.nodes.header.export')}
        overlayClassName="black-tooltip"
      >
        <span
          onClick={() =>
            downloadFileWithHeaders(
              getFixedUrl(`/workflow/export/${currentFlow?.id}`),
              `${currentFlow?.name}.yml`
            )
          }
          className="flow-export-icon"
        />
      </Tooltip>

      {showComparativeDebugging && (
        <Tooltip
          title={t('workflow.nodes.header.comparativeDebugging')}
          overlayClassName="black-tooltip"
        >
          <span
            className="comparative-debugging-icon"
            onClick={() =>
              navigate(`/promptgroupdebugger?workflowId=${currentFlow?.id}`)
            }
          />
        </Tooltip>
      )}

      <Tooltip
        title={t('workflow.nodes.header.versionHistory')}
        overlayClassName="black-tooltip"
      >
        <span
          className="version-management-icon"
          onClick={handleVersionSettings}
        />
      </Tooltip>

      <Tooltip
        title={t('workflow.nodes.header.advancedConfiguration')}
        overlayClassName="black-tooltip"
      >
        <span
          className="advanced-configuration-icon"
          onClick={handleAdvancedSettings}
        />
      </Tooltip>

      {!historyVersion && <div className="w-[1px] h-[24px] bg-[#E4EAFF]" />}

      <div className="flex items-center gap-[14px]">
        {!historyVersion && (
          <div
            className="border border-[#E4EAFF] px-4 flex items-center gap-2 h-9 rounded-lg cursor-pointer"
            onClick={() => handleDebugger()}
          >
            {t('workflow.nodes.header.debug')}
          </div>
        )}

        {!historyVersion && (
          <Button
            type="primary"
            className="flex items-center px-4"
            style={{ height: '36px', lineHeight: '36px' }}
            disabled={isLoading}
            onClick={() => handlePublish()}
          >
            {currentFlow?.status === 1
              ? t('workflow.nodes.header.updatePublish')
              : t('workflow.nodes.header.publish')}
          </Button>
        )}
      </div>

      {publishModal && (
        <div
          className="w-[450px] absolute right-0 top-[70px] p-4 rounded-2xl bg-[#fff] text-[#000]"
          style={{
            zIndex: 1001,
            boxShadow: '0px 2px 4px 0px rgba(46,51,68,0.04)',
            border: '1px solid #E0E3E7',
          }}
        >
          <div className="flex items-center gap-2.5 text-lg font-semibold">
            <img src={publishModalIcon} className="w-6 h-6" alt="" />
            <span>{t('workflow.nodes.header.debugBeforePublish')}</span>
          </div>
          <p className="text-desc text-left ml-[34px] mt-2.5">
            {t('workflow.nodes.header.debugBeforePublishDesc')}
          </p>
          <div className="flex items-center gap-2.5 justify-end mt-6">
            <Button
              type="text"
              className="origin-btn px-[36px]"
              onClick={e => {
                e.stopPropagation();
                setPublishModal(false);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="primary"
              className="px-[36px]"
              onClick={e => {
                e.stopPropagation();
                setPublishModal(false);
                setOpenOperationResult(true);
                checkFlow();
              }}
            >
              {t('workflow.nodes.header.debug')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublishHeader;
