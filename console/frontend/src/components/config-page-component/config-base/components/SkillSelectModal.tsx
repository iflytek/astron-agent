import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Input, Button, Spin, message } from 'antd';
import { listImportableSkills } from '@/services/skill';
import type { SkillImportItem, AgentSkill } from '@/types/skill';
import styles from './CapabilityDevelopment.module.scss';

const MAX_SKILLS = 30;

interface SkillSelectModalProps {
  open: boolean;
  selected: AgentSkill[];
  onClose: () => void;
  onChange: (next: AgentSkill[]) => void;
}

const SkillSelectModal: React.FC<SkillSelectModalProps> = ({
  open,
  selected,
  onClose,
  onChange,
}) => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SkillImportItem[]>([]);

  const selectedIds = useMemo(
    () => new Set(selected.map(s => s.skillId)),
    [selected]
  );

  const fetchList = (kw?: string): void => {
    setLoading(true);
    listImportableSkills(kw)
      .then(res => setData(res || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      setKeyword('');
      fetchList();
    }
  }, [open]);

  const toggle = (item: SkillImportItem): void => {
    if (selectedIds.has(item.id)) {
      onChange(selected.filter(s => s.skillId !== item.id));
      return;
    }
    if (selected.length >= MAX_SKILLS) {
      message.warning(`最多添加 ${MAX_SKILLS} 个 Skill`);
      return;
    }
    onChange([
      ...selected,
      {
        skillId: item.id,
        name: item.name,
        description: item.description || '',
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
      title={`选择 Skill（已选 ${selected.length}/${MAX_SKILLS}）`}
    >
      <Input.Search
        allowClear
        placeholder="搜索 Skill"
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        onSearch={v => fetchList(v)}
        style={{ marginBottom: 12 }}
      />
      <Spin spinning={loading}>
        <div className={styles.skillModalList}>
          {data.map(item => {
            const checked = selectedIds.has(item.id);
            return (
              <div className={styles.skillModalRow} key={item.id}>
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
            <div className={styles.skillModalEmpty}>未找到可引入的 Skill</div>
          )}
        </div>
      </Spin>
    </Modal>
  );
};

export default SkillSelectModal;
