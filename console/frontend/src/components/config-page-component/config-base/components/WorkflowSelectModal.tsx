import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Input, Button, Spin, message } from 'antd';
import { listFlows } from '@/services/flow';
import type { AgentWorkflow } from '@/types/agent-workflow';
import styles from './CapabilityDevelopment.module.scss';

const MAX_WORKFLOWS = 30;

interface WorkflowListItem {
  id?: string | number;
  flowId?: string;
  name?: string;
  description?: string;
  avatarIcon?: string;
  [key: string]: unknown;
}

interface WorkflowSelectModalProps {
  open: boolean;
  selected: AgentWorkflow[];
  onClose: () => void;
  onChange: (next: AgentWorkflow[]) => void;
}

const WorkflowSelectModal: React.FC<WorkflowSelectModalProps> = ({
  open,
  selected,
  onClose,
  onChange,
}) => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WorkflowListItem[]>([]);

  const selectedIds = useMemo(
    () => new Set(selected.map(w => w.flowId)),
    [selected]
  );

  const fetchList = (kw?: string): void => {
    setLoading(true);
    // status=1 keeps the list to published workflows only (same filter as the
    // workflow canvas add-flow selector); unpublished flows cannot run via the
    // production chat endpoint.
    listFlows({ current: 1, pageSize: 200, search: kw, status: 1 })
      .then((res: any) => {
        const list = (res?.pageData || []).filter((item: WorkflowListItem) =>
          Boolean(item.flowId)
        );
        setData(list);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      setKeyword('');
      fetchList();
    }
  }, [open]);

  const toggle = (item: WorkflowListItem): void => {
    const flowId = item.flowId as string;
    if (selectedIds.has(flowId)) {
      onChange(selected.filter(w => w.flowId !== flowId));
      return;
    }
    if (selected.length >= MAX_WORKFLOWS) {
      message.warning(`最多添加 ${MAX_WORKFLOWS} 个工作流`);
      return;
    }
    onChange([
      ...selected,
      {
        flowId,
        name: item.name || '',
        description: item.description || '',
        icon: item.avatarIcon || undefined,
      },
    ]);
  };

  return (
    <Modal
      open={open}
      centered
      footer={null}
      closable
      onCancel={onClose}
      title={`选择工作流（已选 ${selected.length}/${MAX_WORKFLOWS}）`}
    >
      <Input.Search
        allowClear
        placeholder="搜索工作流"
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        onSearch={v => fetchList(v)}
        style={{ marginBottom: 12 }}
      />
      <Spin spinning={loading}>
        <div className={styles.skillModalList}>
          {data.map(item => {
            const checked = selectedIds.has(item.flowId as string);
            return (
              <div
                className={styles.skillModalRow}
                key={item.flowId || item.id}
              >
                <div className={styles.skillModalMeta}>
                  <div className={styles.skillModalName}>{item.name}</div>
                  <div className={styles.skillModalDesc}>
                    {item.description || '暂无描述'}
                  </div>
                </div>
                <Button
                  type={checked ? 'default' : 'primary'}
                  onClick={() => toggle(item)}
                >
                  {checked ? '移除' : '添加'}
                </Button>
              </div>
            );
          })}
          {!loading && data.length === 0 && (
            <div className={styles.skillModalEmpty}>未找到已发布的工作流</div>
          )}
        </div>
      </Spin>
    </Modal>
  );
};

export default WorkflowSelectModal;
