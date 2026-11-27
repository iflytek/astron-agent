import { useEffect, useState, type ReactElement } from 'react';
import { Button, Input, Modal, message, theme } from 'antd';
import {
  BarChartOutlined,
  FolderOpenOutlined,
  ApartmentOutlined,
  SettingOutlined,
  ExportOutlined,
  PlayCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import WorkflowAnalysis from '../../workflow-analysis';
import SandboxFileBrowser from '@/components/sandbox-file-browser';
import './index.scss';
import useChatStore from '@/components/workflow/store/use-chat-store';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useFlowCommon } from '@/components/workflow/hooks/use-flow-common';
import { downloadFileWithHeaders } from '@/utils/http';
import http from '@/utils/http';
import { getFixedUrl } from '@/components/workflow/utils';
import EditorPublishMenu from '@/components/publishing/editor-publish-menu';

export default function WorkflowActions(): ReactElement {
  const { token } = theme.useToken();
  const debugging = useChatStore(state => state.debuggering);
  const paused = useChatStore(state => state.interruptChat.interrupt);
  const stopping = useChatStore(state => state.stopRequested);
  const showNodeList = useFlowsManager(state => state.showNodeList);
  const busy = debugging || paused || stopping || !showNodeList;
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const historyVersion = useFlowsManager(state => state.historyVersion);
  const flushCurrentFlow = useFlowsManager(state => state.flushCurrentFlow);
  const setVersionManagement = useFlowsManager(
    state => state.setVersionManagement
  );
  const setAdvancedConfiguration = useFlowsManager(
    state => state.setAdvancedConfiguration
  );
  const setWorkflowTracePanelOpen = useFlowsManager(
    state => state.setWorkflowTracePanelOpen
  );
  const { handleDebugger } = useFlowCommon();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<'analysis' | 'files' | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const view = new URLSearchParams(location.search).get('panel');
    if (view === 'analysis' || view === 'files') {
      setPanel(view);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async (): Promise<void> => {
    if (!currentFlow?.flowId || !name.trim()) return;
    setSaving(true);
    try {
      await flushCurrentFlow();
      await http.post('/workflow/version', {
        flowId: currentFlow.flowId,
        name: name.trim(),
      });
      setOpen(false);
      setName('');
      message.success('版本已保存');
      setVersionManagement(true);
    } catch {
      message.error('版本保存失败，请检查提示后重试');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="workflow-toolbar-actions flex items-center gap-3">
      <Button icon={<BarChartOutlined />} onClick={() => setPanel('analysis')}>
        分析
      </Button>
      <Button
        aria-label="文件"
        icon={<FolderOpenOutlined />}
        disabled={!currentFlow?.id}
        onClick={() => setPanel('files')}
      >
        文件
      </Button>
      <Button
        icon={<ApartmentOutlined />}
        onClick={() => setWorkflowTracePanelOpen(true)}
      >
        运行追踪
      </Button>
      {!historyVersion && (
        <Button
          icon={<SettingOutlined />}
          disabled={busy}
          onClick={() => setAdvancedConfiguration(true)}
        >
          高级配置
        </Button>
      )}
      <Button
        aria-label="导出工作流"
        title="导出工作流"
        icon={<ExportOutlined />}
        onClick={() =>
          void downloadFileWithHeaders(
            getFixedUrl(`/workflow/export/${currentFlow?.id}`),
            `${currentFlow?.name}.yml`
          )
        }
      />
      <Button
        disabled={busy}
        aria-label="版本历史"
        title="版本历史"
        icon={<HistoryOutlined />}
        onClick={() => setVersionManagement(true)}
      >
        版本
      </Button>
      <Button
        icon={<PlayCircleOutlined />}
        disabled={busy}
        onClick={() => void handleDebugger()}
      >
        测试运行
      </Button>
      {!historyVersion && (
        <EditorPublishMenu
          target={{ kind: 'workflow', id: currentFlow?.id || '' }}
          name={currentFlow?.name || '工作流'}
          disabled={!currentFlow?.id || saving || busy}
          beforePublish={flushCurrentFlow}
          onSaveVersion={() => setOpen(true)}
        />
      )}
      <Modal
        title={panel === 'analysis' ? '工作流分析' : '工作流文件'}
        open={panel !== null}
        onCancel={() => setPanel(null)}
        footer={null}
        width={760}
        zIndex={panel === 'files' ? token.zIndexPopupBase + 100 : undefined}
        centered
        destroyOnClose
        className="workflow-tool-dialog"
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      >
        {panel === 'analysis' && currentFlow?.flowId && (
          <WorkflowAnalysis flowId={currentFlow.flowId} />
        )}
        {panel === 'files' && currentFlow?.id && (
          <SandboxFileBrowser kind="workflow" id={String(currentFlow.id)} />
        )}
      </Modal>
      <Modal
        title="保存工作流版本"
        open={open}
        confirmLoading={saving}
        onCancel={() => setOpen(false)}
        onOk={() => void save()}
        okButtonProps={{ disabled: !name.trim() }}
      >
        <label>
          版本名称
          <Input
            aria-label="版本名称"
            value={name}
            maxLength={100}
            onChange={event => setName(event.target.value)}
          />
        </label>
        <p className="mt-3 text-gray-500">
          此快照可用于执行与自动化，后续编辑不会修改已保存版本。
        </p>
      </Modal>
    </div>
  );
}
