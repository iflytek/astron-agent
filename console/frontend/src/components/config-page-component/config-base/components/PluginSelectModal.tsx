import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Input, Button, Spin, message } from 'antd';
import { listToolSquare } from '@/services/tool';
import type { Tool, AgentTool } from '@/types/plugin-store';
import styles from './CapabilityDevelopment.module.scss';

const MAX_TOOLS = 30;

interface PluginSelectModalProps {
  open: boolean;
  selected: AgentTool[];
  onClose: () => void;
  onChange: (next: AgentTool[]) => void;
}

const PluginSelectModal: React.FC<PluginSelectModalProps> = ({
  open,
  selected,
  onClose,
  onChange,
}) => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Tool[]>([]);

  const selectedIds = useMemo(
    () => new Set(selected.map(t => t.toolId)),
    [selected]
  );

  const fetchList = (kw?: string): void => {
    setLoading(true);
    // orderFlag is required: the backend sorts by it and NPEs on a null value (-> HTTP 500).
    // Omitting tagFlag keeps MCP tools out of the result (they have their own capability block).
    listToolSquare({ content: kw, page: 1, pageSize: 200, orderFlag: 0 })
      .then(res => {
        // Only regular Link/HTTP plugins are addable here; MCP tools have their own block.
        const list = (res?.pageData || []).filter(
          item => !item.isMcp && Boolean(item.toolId)
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

  const toggle = (item: Tool): void => {
    const toolId = item.toolId as string;
    if (selectedIds.has(toolId)) {
      onChange(selected.filter(t => t.toolId !== toolId));
      return;
    }
    if (selected.length >= MAX_TOOLS) {
      message.warning(`最多添加 ${MAX_TOOLS} 个插件`);
      return;
    }
    onChange([
      ...selected,
      {
        toolId,
        name: item.name,
        description: item.description || '',
        icon: item.icon || item.avatar || undefined,
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
      title={`选择插件（已选 ${selected.length}/${MAX_TOOLS}）`}
    >
      <Input.Search
        allowClear
        placeholder="搜索插件"
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        onSearch={v => fetchList(v)}
        style={{ marginBottom: 12 }}
      />
      <Spin spinning={loading}>
        <div className={styles.skillModalList}>
          {data.map(item => {
            const checked = selectedIds.has(item.toolId as string);
            return (
              <div
                className={styles.skillModalRow}
                key={item.toolId || item.id}
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
            <div className={styles.skillModalEmpty}>未找到可引入的插件</div>
          )}
        </div>
      </Spin>
    </Modal>
  );
};

export default PluginSelectModal;
