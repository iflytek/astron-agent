import React, { useMemo, useState, ReactNode, memo, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import useFlowStore from '@/components/workflow/store/use-flow-store';
import useSpaceStore from '@/store/space-store';
import useChatStore from '@/components/workflow/store/use-chat-store';
import FlowEdit from '@/components/workflow/modal/flow-edit';
import VirtualConfig from '@/components/virtual-config-modal';
import dayjs from 'dayjs';
import { isJSON } from '@/utils';
import { saveFlowAPI } from '@/services/flow';
import { Button } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';

import arrowLeft from '@/assets/imgs/knowledge/workflow-back.png';
import flowEditIcon from '@/assets/imgs/workflow/flow-edit-icon.png';
import flowSuccessIcon from '@/assets/imgs/workflow/flow-success-icon.png';
import flowRunningIcon from '@/assets/imgs/workflow/flow-running-icon.png';
import flowFailedIcon from '@/assets/imgs/workflow/flow-failed-icon.png';
import { TFunction } from 'i18next';
interface FlowHeaderProps {
  currentTab?: 'arrange' | 'overview' | 'files';
  children?: ReactNode;
  currentFlow?: any;
}

interface FlowStatusProps {
  flowResult: any;
  t: TFunction;
}

type FlowTabKey = 'arrange' | 'overview' | 'files';

const FlowStatus: React.FC<FlowStatusProps> = ({ flowResult, t }) => {
  const statusStyle = useMemo(() => {
    if (!flowResult?.status) return { background: '', color: '', icon: '' };
    switch (flowResult.status) {
      case 'running':
      case 'stopping':
        return {
          background: '#eef3ff',
          color: '#3159d9',
          icon: flowRunningIcon,
        };
      case 'success':
        return {
          background: '#f1fbf3',
          color: '#26743b',
          icon: flowSuccessIcon,
        };
      case 'cancelled':
      case 'interrupted':
        return {
          background: '#fff7e6',
          color: '#8a5c0b',
          icon: flowFailedIcon,
        };
      default:
        return {
          background: '#fff5f6',
          color: '#a43246',
          icon: flowFailedIcon,
        };
    }
  }, [flowResult]);

  if (!flowResult?.status) return null;

  return (
    <div
      className="workflow-run-status px-1.5 py-0.5 rounded-sm flex items-center flex-wrap gap-1 text-xs"
      style={{ background: statusStyle.background, color: statusStyle.color }}
    >
      <img
        src={statusStyle.icon}
        alt=""
        className={`w-3 h-3 ${flowResult.status === 'running' ? 'flow-rotate-center' : ''}`}
      />
      <span>
        {flowResult.status === 'stopping'
          ? '正在停止运行…'
          : flowResult.status === 'cancelled'
            ? '已停止运行'
            : flowResult.status === 'interrupted'
              ? '运行已中断'
              : flowResult.status === 'running'
                ? t('workflow.nodes.header.testRunning')
                : flowResult.status === 'success'
                  ? t('workflow.nodes.header.runCompleted')
                  : t('workflow.nodes.header.runFailed')}
      </span>
      {flowResult.status !== 'running' &&
        flowResult.status !== 'stopping' &&
        flowResult.timeCost !== '' &&
        flowResult.timeCost != null && (
          <>
            <span>{flowResult.timeCost}s</span>
            <span
              className="w-[2px] h-[2px] rounded-full"
              style={{ background: statusStyle.color }}
            ></span>
            <span>{flowResult.totalTokens} Tokens</span>
          </>
        )}
    </div>
  );
};

interface FlowTabsProps {
  currentTab: FlowTabKey;
  id: string;
  t: TFunction;
  navigate: ReturnType<typeof useNavigate>;
}

const FlowTabs: React.FC<FlowTabsProps> = ({ currentTab, id, t, navigate }) => (
  <nav
    className="workflow-tabs flex items-center justify-center w-auto gap-3"
    aria-label="工作流视图"
  >
    {(['arrange', 'overview', 'files'] as FlowTabKey[]).map(tab => (
      <button
        key={tab}
        type="button"
        aria-current={currentTab === tab ? 'page' : undefined}
        className={`flex min-w-[106px] items-center justify-center py-2.5 px-5 rounded-xl font-medium cursor-pointer ${
          currentTab === tab ? 'config-tabs-active' : 'config-tabs-normal'
        }`}
        onClick={() => navigate(`/work_flow/${id}/${tab}`, { replace: true })}
      >
        <span className={`${tab}-icon`}></span>
        <span className="ml-2">
          {tab === 'files'
            ? '文件'
            : t(
                `workflow.nodes.header.${
                  tab === 'arrange' ? 'arrange' : 'analysis'
                }`
              )}
        </span>
      </button>
    ))}
  </nav>
);

const FlowHeader: React.FC<FlowHeaderProps> = ({ children, currentFlow }) => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const flowResult = useFlowsManager(state => state.flowResult);
  const stopRequested = useChatStore(state => state.stopRequested);
  const isLoading = useFlowsManager(state => state.isLoading);
  const flushCurrentFlow = useFlowsManager(state => state.flushCurrentFlow);
  useFlowStore(state => state.nodes);
  useFlowStore(state => state.edges);
  const unsaved = useFlowsManager.getState().hasUnsavedCurrentFlow();
  const spaceName = useSpaceStore(state => state.spaceName);
  const spaceType = useSpaceStore(state => state.spaceType);
  const [failedAvatar, setFailedAvatar] = useState('');
  const [saveError, setSaveError] = useState('');
  const historyVersion = useFlowsManager(state => state.historyVersion);
  const historyVersionData = useFlowsManager(state => state.historyVersionData);
  const setCurrentFlow = useFlowsManager(state => state.setCurrentFlow);
  const [currentTab, setCurrentTab] = useState<FlowTabKey>('arrange');
  const [modalType, setModalType] = useState<string>('');

  const isVirtualFlow = useMemo(() => {
    return currentFlow?.type === 4;
  }, [currentFlow]);

  const flowConfig = useMemo(() => {
    return isJSON(currentFlow?.flowConfig)
      ? JSON.parse(currentFlow?.flowConfig)
      : {};
  }, [currentFlow?.flowConfig]);

  const handleEditSumbit = (fields: any): Promise<void> => {
    const config = {
      ...fields.talkAgentConfig,
    };
    const params = {
      id: currentFlow?.id,
      flowId: currentFlow?.flowId,
      name: fields?.name,
      description: fields?.botDesc,
      avatarIcon: fields.avatar,
      category: fields.botType,
      flowConfig: config,
    };
    return saveFlowAPI({
      ...params,
      ...(typeof config.vcn === 'string'
        ? { advancedConfig: { textToSpeech: { vcn_cn: config.vcn } } }
        : {}),
    }).then(data => {
      setModalType('');
      setCurrentFlow((previous: any) =>
        previous?.id === data.id
          ? {
              ...previous,
              name: data.name,
              description: data.description,
              updateTime: data.updateTime,
              avatarIcon: data.avatarIcon,
              category: data.category,
              flowConfig: data.flowConfig,
              advancedConfig: data.advancedConfig,
            }
          : previous
      );
    });
  };

  useEffect(() => {
    const tab = location?.pathname?.split('/')?.pop();
    setCurrentTab(
      tab === 'overview' || tab === 'files' || tab === 'arrange'
        ? tab
        : 'arrange'
    );
  }, [location]);

  return (
    <div className="workflow-header-shell" onKeyDown={e => e.stopPropagation()}>
      {modalType === 'text' && currentFlow && (
        <FlowEdit currentFlow={currentFlow} setModalType={setModalType} />
      )}
      {modalType === 'virtual' && (
        <VirtualConfig
          visible={modalType === 'virtual'}
          onCancel={() => {
            setModalType('');
          }}
          formValues={
            {
              flowId: currentFlow?.flowId,
              name: currentFlow?.name,
              botType: currentFlow?.category,
              avatar: currentFlow?.avatarIcon,
              botDesc: currentFlow?.description,
              talkAgentConfig: {
                interactType: flowConfig?.interactType,
                vcn: flowConfig?.vcn,
                sceneId: flowConfig?.sceneId,
                sceneMode: flowConfig?.sceneMode,
                sceneEnable: flowConfig?.sceneEnable,
                vcnEnable: flowConfig?.vcnEnable,
                callSceneId: flowConfig?.callSceneId,
                sceneVcn: flowConfig?.sceneVcn,
              },
            } as any
          }
          onSubmit={handleEditSumbit}
        />
      )}
      <div
        className="workflow-header w-full h-[80px] bg-[#fff] border-b border-[#e2e8ff] flex justify-between px-6 py-5"
        style={{ borderRadius: '0px 0px 24px 24px' }}
      >
        {/* 左侧返回 + 名称 */}
        <div className="relative flex items-center flex-1 gap-2">
          <button
            type="button"
            className="workflow-back-button"
            aria-label="返回工作流列表"
            onClick={() => navigate('/space/workflows')}
          >
            <img src={arrowLeft} className="w-[28px]" alt="" />
          </button>
          <div className="relative flex items-center gap-4">
            {currentFlow?.avatarIcon &&
            failedAvatar !== currentFlow.avatarIcon ? (
              <img
                src={currentFlow.avatarIcon}
                className="w-[39px] h-[39px]"
                alt=""
                onError={() => setFailedAvatar(currentFlow.avatarIcon)}
              />
            ) : (
              <ApartmentOutlined
                className="workflow-identity-icon"
                aria-hidden
              />
            )}
            <div className="flex flex-col h-full">
              <div className="workflow-title flex items-center gap-1 text-center">
                <span className="font-medium" title={currentFlow?.name}>
                  {currentFlow?.name}
                </span>
                {currentTab === 'arrange' && (
                  <>
                    {isVirtualFlow ? (
                      <Button
                        size="small"
                        disabled={historyVersion}
                        onClick={() => setModalType('virtual')}
                      >
                        语音与虚拟人设置
                      </Button>
                    ) : (
                      <button
                        type="button"
                        className="workflow-edit-button"
                        aria-label="编辑工作流信息"
                        onClick={() => setModalType('text')}
                      >
                        <img
                          src={flowEditIcon}
                          className="w-[14px] h-[14px]"
                          alt=""
                        />
                      </button>
                    )}
                  </>
                )}
                {historyVersion && (
                  <span className="bg-[#E9EEFF] w-[30px] h-[18px] text-[#6356EA] text-[10px] flex items-center justify-center rounded-[7px]">
                    {(historyVersionData as any)?.name}
                  </span>
                )}
              </div>
              {currentTab === 'arrange' && (
                <div className="flex items-center gap-3 text-[14px] mt-[3px]">
                  <p
                    className="workflow-description text-desc max-w-[160px] text-overflow"
                    title={currentFlow?.description}
                  >
                    {historyVersion
                      ? (historyVersionData as any)?.description
                      : currentFlow?.description}
                  </p>
                  {historyVersion == false && (
                    <div className="workflow-save-state text-[14px] text-[#9E9E9E] rounded-sm flex items-center jusity-center">
                      {isLoading
                        ? '正在保存草稿…'
                        : unsaved
                          ? '草稿尚未保存'
                          : currentFlow?.updateTime
                            ? `${t('workflow.nodes.header.autoSaved')} ${dayjs(currentFlow.updateTime).format('HH:mm:ss')}`
                            : '正在读取草稿…'}
                      {unsaved && !isLoading && (
                        <Button
                          size="small"
                          onClick={() => {
                            setSaveError('');
                            void flushCurrentFlow().catch(() =>
                              setSaveError(
                                '草稿保存失败，修改仍保留在本页。请重试保存。'
                              )
                            );
                          }}
                        >
                          重试保存
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <FlowStatus
              flowResult={
                stopRequested
                  ? { ...flowResult, status: 'stopping' }
                  : flowResult
              }
              t={t}
            />
          </div>
        </div>

        {/* 中间 Tabs */}
        {id && (
          <FlowTabs currentTab={currentTab} id={id} t={t} navigate={navigate} />
        )}

        {/* 右侧操作按钮 */}
        <div className="flex justify-end flex-1">{children}</div>
      </div>
      <div className="workflow-space-context">
        {spaceName || (spaceType === 'personal' ? '我的个人资源' : '当前空间')}{' '}
        / 工作流编排
      </div>
      {saveError && unsaved && (
        <div className="workflow-save-error" role="alert">
          {saveError}
        </div>
      )}
    </div>
  );
};

export default memo(FlowHeader);
