import { useEffect, useState, type ReactElement } from 'react';
import { Alert, Button, Drawer, Empty, Modal, Pagination, message } from 'antd';
import { getVersionList, restoreVersion } from '@/services/common';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import useFlowStore from '@/components/workflow/store/use-flow-store';
import type {
  VersionItem,
  VersionManagementProps,
} from '@/components/workflow/types/drawer/chat-debugger';
import type { WorkflowSnapshot } from '@/components/workflow/types/domain';

export default function VersionManagement({
  open,
  setOpen,
  operationResultOpen,
}: VersionManagementProps): ReactElement {
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const historyVersionData = useFlowsManager(state => state.historyVersionData);
  const setHistoryVersion = useFlowsManager(state => state.setHistoryVersion);
  const setHistoryVersionData = useFlowsManager(
    state => state.setHistoryVersionData
  );
  const setCanvasesDisabled = useFlowsManager(
    state => state.setCanvasesDisabled
  );
  const adoptWorkflowDraft = useFlowsManager(state => state.adoptWorkflowDraft);
  const flushCurrentFlow = useFlowsManager(state => state.flushCurrentFlow);
  const setAdvancedConfiguration = useFlowsManager(
    state => state.setAdvancedConfiguration
  );
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [target, setTarget] = useState<VersionItem | null>(null);
  useEffect(() => {
    let ignore = false;
    if (open && currentFlow?.flowId)
      void getVersionList({
        flowId: currentFlow.flowId,
        current: page,
        size: 20,
      })
        .then(result => {
          if (!ignore) {
            setVersions(result.records);
            setTotal(result.total);
            setError('');
          }
        })
        .catch(() => {
          if (!ignore) setError('无法读取版本列表');
        });
    return () => {
      ignore = true;
    };
  }, [open, currentFlow?.flowId, page]);
  const select = async (version: VersionItem | null): Promise<boolean> => {
    try {
      await flushCurrentFlow();
      const draft = useFlowsManager.getState().currentFlow;
      const raw = version?.data || draft?.originData || draft?.data;
      if (!raw) return false;
      const graph: WorkflowSnapshot = JSON.parse(raw);
      // Never expose a historical graph to synchronous draft autosave observers.
      setHistoryVersion(true);
      useFlowStore.getState().setNodes(
        graph.nodes.map(node => ({
          ...node,
          type: 'custom',
          nodeType: node.id.split('::')[0] || node.nodeType,
          selected: false,
          data: { ...node.data, status: '' },
        }))
      );
      useFlowStore.getState().setEdges(graph.edges);
      setHistoryVersionData(version);
      setHistoryVersion(!!version);
      setCanvasesDisabled(!!version);
      setAdvancedConfiguration(false);
      return true;
    } catch {
      message.error('切换版本前保存失败，请重试');
      return false;
    }
  };
  const restore = async (): Promise<void> => {
    if (!target || !currentFlow?.flowId || !currentFlow.id) return;
    setRestoring(true);
    const wasDisabled = useFlowsManager.getState().canvasesDisabled;
    setCanvasesDisabled(true);
    setAdvancedConfiguration(false);
    let committed = false;
    try {
      await flushCurrentFlow();
      const restored = await restoreVersion({
        flowId: currentFlow.flowId,
        id: String(target.id),
      });
      committed = true;
      adoptWorkflowDraft(restored);
      setHistoryVersionData(null);
      setHistoryVersion(false);
      setCanvasesDisabled(false);
      setTarget(null);
    } catch {
      if (!committed) setCanvasesDisabled(wasDisabled);
      else
        useFlowsManager.setState({
          currentFlow: undefined,
          draftLoaded: false,
          canvasesDisabled: true,
          isLoading: false,
          initializationError: '版本已恢复，界面加载失败，请重新加载草稿',
        });
      message.error(
        committed
          ? '版本已恢复，请重新加载草稿后继续'
          : '版本恢复失败，请检查提示后重试'
      );
    } finally {
      setRestoring(false);
    }
  };
  return (
    <Drawer
      title="工作流版本"
      open={open}
      onClose={() => setOpen(false)}
      width={430}
      mask={false}
      rootStyle={{ top: 80, right: operationResultOpen ? 530 : 0 }}
    >
      {error && <Alert type="error" message={error} />}
      <Button block className="mb-4" onClick={() => void select(null)}>
        返回当前草稿
      </Button>
      {!versions.length && !error && <Empty description="尚未保存版本" />}
      {versions.map(version => (
        <article
          key={version.id}
          className="border rounded-lg p-4 mb-4"
          style={{
            borderColor:
              historyVersionData?.id === version.id ? '#6356EA' : undefined,
          }}
        >
          <h3 className="font-semibold">{version.name}</h3>
          <p>{version.versionNum}</p>
          <p className="text-gray-500 text-xs my-2">{version.createdTime}</p>
          <div className="flex gap-2">
            <Button onClick={() => void select(version)}>查看</Button>
            <Button
              onClick={async () => {
                if (!(await select(version))) return;
                const state = useFlowsManager.getState();
                state.setVersionManagement(false);
                state.checkFlow();
                state.setOpenOperationResult(true);
              }}
            >
              调试此版本
            </Button>
            <Button onClick={() => setTarget(version)}>恢复为草稿</Button>
          </div>
        </article>
      ))}
      <Pagination
        size="small"
        current={page}
        total={total}
        pageSize={20}
        onChange={setPage}
        showSizeChanger={false}
      />
      <Modal
        title="恢复版本"
        open={!!target}
        onCancel={() => setTarget(null)}
        confirmLoading={restoring}
        onOk={() => void restore()}
      >
        用“{target?.name}”更新当前草稿？已保存版本与历史运行保留。
      </Modal>
    </Drawer>
  );
}
