import { useEffect, useState, type ReactElement } from 'react';
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Modal,
  Pagination,
  Skeleton,
  Tag,
  message,
} from 'antd';
import {
  HistoryOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  RollbackOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthoringDrawerStyle } from '../../hooks/use-authoring-drawer-style';
import './version-management.css';
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
}: VersionManagementProps): ReactElement {
  const rootStyle = useAuthoringDrawerStyle();
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
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [revision, setRevision] = useState(0);
  const [restoring, setRestoring] = useState(false);
  const [target, setTarget] = useState<VersionItem | null>(null);
  useEffect(() => {
    let ignore = false;
    if (open && currentFlow?.flowId) {
      setLoading(true);
      setError('');
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
          if (!ignore) setError('版本加载失败，请重试。');
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [open, currentFlow?.flowId, page, revision]);
  useEffect(() => {
    setPage(1);
    setVersions([]);
  }, [currentFlow?.flowId]);
  const select = async (version: VersionItem | null): Promise<boolean> => {
    if (switching || restoring) return false;
    setSwitching(true);
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
    } finally {
      setSwitching(false);
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
      title={
        <span>
          <HistoryOutlined /> 版本历史
        </span>
      }
      open={open}
      onClose={() => setOpen(false)}
      width="min(540px, 100vw)"
      mask={false}
      rootStyle={rootStyle}
      rootClassName="workflow-version-drawer"
    >
      <div className="workflow-version-context">
        <div>
          <strong>当前草稿</strong>
          <p>编辑会自动保存；已保存版本保持不变。</p>
        </div>
        {historyVersionData ? (
          <Button
            loading={switching}
            disabled={restoring}
            onClick={() => void select(null)}
          >
            回到草稿
          </Button>
        ) : (
          <Tag color="blue">正在编辑</Tag>
        )}
      </div>
      <div className="workflow-version-list-heading">
        <h3>
          已保存版本 <span>{total}</span>
        </h3>
        <Button
          type="text"
          aria-label="刷新版本列表"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => setRevision(value => value + 1)}
        />
      </div>
      {error && (
        <Alert
          showIcon
          type="error"
          message={error}
          action={
            <Button onClick={() => setRevision(value => value + 1)}>
              重试
            </Button>
          }
        />
      )}
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        !error && (
          <>
            {!versions.length && (
              <Empty description="尚未保存版本。通过发布菜单保存版本后，可在这里查看或恢复。" />
            )}
            <div className="workflow-version-list">
              {versions.map(version => (
                <article
                  key={version.id}
                  className={
                    historyVersionData?.id === version.id ? 'is-selected' : ''
                  }
                >
                  <div className="workflow-version-identity">
                    <h4 title={version.name}>{version.name || '未命名版本'}</h4>
                    {historyVersionData?.id === version.id && (
                      <Tag color="blue">正在查看</Tag>
                    )}
                  </div>
                  <time>
                    {dayjs(version.createdTime).isValid()
                      ? dayjs(version.createdTime).format('YYYY-MM-DD HH:mm')
                      : version.createdTime}
                  </time>
                  <details>
                    <summary>版本标识</summary>
                    <code>{version.versionNum}</code>
                  </details>
                  <div className="workflow-version-actions">
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      disabled={switching || restoring}
                      onClick={() => void select(version)}
                    >
                      查看
                    </Button>
                    <Button
                      size="small"
                      icon={<PlayCircleOutlined />}
                      disabled={switching || restoring}
                      onClick={async () => {
                        if (!(await select(version))) return;
                        const state = useFlowsManager.getState();
                        state.setVersionManagement(false);
                        state.checkFlow();
                        state.setOpenOperationResult(true);
                      }}
                    >
                      调试
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      icon={<RollbackOutlined />}
                      disabled={switching || restoring}
                      onClick={() => setTarget(version)}
                    >
                      恢复为草稿
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            {total > 20 && (
              <Pagination
                size="small"
                current={page}
                total={total}
                pageSize={20}
                onChange={setPage}
                showSizeChanger={false}
              />
            )}
          </>
        )
      )}
      <Modal
        title="恢复版本"
        open={!!target}
        keyboard={!restoring}
        onCancel={() => {
          if (!restoring) setTarget(null);
        }}
        confirmLoading={restoring}
        okText="恢复为草稿"
        cancelText="取消"
        cancelButtonProps={{ disabled: restoring }}
        closable={!restoring}
        maskClosable={!restoring}
        onOk={() => void restore()}
      >
        用“{target?.name}”更新当前草稿？已保存版本与历史运行保留。
      </Modal>
    </Drawer>
  );
}
