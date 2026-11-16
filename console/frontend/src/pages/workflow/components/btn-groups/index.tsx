import { useState, type ReactElement } from 'react';
import { Button, Dropdown, Input, Modal, message } from 'antd';
import {
  EllipsisOutlined,
  PlayCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useFlowCommon } from '@/components/workflow/hooks/use-flow-common';
import { downloadFileWithHeaders } from '@/utils/http';
import http from '@/utils/http';
import { getFixedUrl } from '@/components/workflow/utils';

export default function WorkflowActions(): ReactElement {
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
  const setFlowChatResultOpen = useFlowsManager(
    state => state.setFlowChatResultOpen
  );
  const { handleDebugger } = useFlowCommon();
  const [open, setOpen] = useState(false);
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
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: [
            {
              key: 'result',
              label: '运行结果',
              onClick: () => setFlowChatResultOpen(true),
            },
            {
              key: 'trace',
              label: '运行追踪',
              onClick: () => setWorkflowTracePanelOpen(true),
            },
            ...(!historyVersion
              ? [
                  {
                    key: 'advanced',
                    label: '高级配置',
                    onClick: () => setAdvancedConfiguration(true),
                  },
                ]
              : []),
            { type: 'divider' as const },
            {
              key: 'export',
              label: '导出工作流',
              onClick: () =>
                void downloadFileWithHeaders(
                  getFixedUrl(`/workflow/export/${currentFlow?.id}`),
                  `${currentFlow?.name}.yml`
                ),
            },
          ],
        }}
      >
        <Button
          aria-label="更多工作流操作"
          title="更多工作流操作"
          icon={<EllipsisOutlined />}
        />
      </Dropdown>
      <Button
        aria-label="版本历史"
        title="版本历史"
        icon={<HistoryOutlined />}
        onClick={() => setVersionManagement(true)}
      />
      <Button
        icon={<PlayCircleOutlined />}
        onClick={() => void handleDebugger()}
      >
        测试运行
      </Button>
      {!historyVersion && (
        <Button type="primary" onClick={() => setOpen(true)}>
          保存版本
        </Button>
      )}
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
