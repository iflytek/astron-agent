import type React from 'react';
import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Form, Input, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { createKnowledgeAPI, deleteKnowledgeAPI } from '@/services/knowledge';
import { RepoItem } from '@/types/resource';

export type VersionType = 'AIUI-RAG2' | 'CBG-RAG' | 'Ragflow-RAG';
export const versionList: {
  type: VersionType;
  title: string;
  description?: string;
  link?: string;
}[] = [
  {
    type: 'Ragflow-RAG',
    title: 'ragflowRAG',
    description: 'ragflowRAGDescription',
    link: 'https://github.com/infiniflow/ragflow?tab=readme-ov-file',
  },
  {
    type: 'CBG-RAG',
    title: 'xinghuoKnowledge',
    description: 'xingpuDescription',
  },
];
export const DeleteModal: FC<{
  setDeleteModal: (value: boolean) => void;
  currentKnowledge: RepoItem;
  getKnowledges: () => void;
}> = ({ setDeleteModal, currentKnowledge, getKnowledges }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const remove = async (): Promise<void> => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await deleteKnowledgeAPI(currentKnowledge.id, currentKnowledge.tag);
      setDeleteModal(false);
      getKnowledges();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : '删除失败，请重试。'
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      open
      title={t('knowledge.confirmDeleteKnowledge')}
      onCancel={() => {
        if (!loading) setDeleteModal(false);
      }}
      onOk={() => void remove()}
      confirmLoading={loading}
      okText={t('common.delete')}
      cancelText={t('common.cancel')}
      okButtonProps={{ danger: true }}
      cancelButtonProps={{ disabled: loading }}
    >
      <p className="my-4 break-words font-medium">{currentKnowledge.name}</p>
      <p>{t('knowledge.deleteKnowledgeWarning')}</p>
      {error && (
        <Alert type="error" showIcon message={error} className="mt-4" />
      )}
    </Modal>
  );
};
export const CreateModal: FC<{ setCreateModal: (value: boolean) => void }> = ({
  setCreateModal,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [version, setVersion] = useState<VersionType>('Ragflow-RAG');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const save = async (): Promise<void> => {
    if (loading) return;
    try {
      const values = await form.validateFields();
      setLoading(true);
      setError('');
      // Preserve Console's create-repo payload, including the selected RAG type.
      const payload = {
        name: values.name,
        desc: values.desc || '',
        tag: version,
      };
      const data = await createKnowledgeAPI(payload);
      navigate(
        `/resource/knowledge/upload?parentId=-1&repoId=${data.id}&tag=${version}`
      );
    } catch (failure) {
      if (!(failure && typeof failure === 'object' && 'errorFields' in failure))
        setError(
          failure instanceof Error ? failure.message : '创建失败，请重试。'
        );
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      open
      title={t('knowledge.createKnowledge')}
      width={520}
      onCancel={() => {
        if (!loading) setCreateModal(false);
      }}
      onOk={() => void save()}
      confirmLoading={loading}
      okText={t('knowledge.confirm')}
      cancelText={t('common.cancel')}
      cancelButtonProps={{ disabled: loading }}
    >
      {error && (
        <Alert type="error" showIcon message={error} className="my-4" />
      )}
      <Form form={form} layout="vertical" className="mt-6">
        <Form.Item
          label={t('knowledge.knowledgeName')}
          name="name"
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('knowledge.pleaseEnter'),
            },
          ]}
        >
          <Input
            maxLength={20}
            showCount
            placeholder={t('knowledge.pleaseEnter')}
          />
        </Form.Item>
        <Form.Item label={t('knowledge.knowledgeDescription')} name="desc">
          <Input.TextArea
            maxLength={200}
            showCount
            rows={3}
            placeholder={t('knowledge.pleaseEnter')}
          />
        </Form.Item>
      </Form>
      <fieldset className="mt-6">
        <legend className="mb-2 text-sm">
          {t('knowledge.knowledgeVersion')}
        </legend>
        <div className="flex flex-col gap-2">
          {versionList.map(item => (
            <VersionItem
              key={item.type}
              version={version}
              setVersion={setVersion}
              {...item}
              description={item.description || ''}
            />
          ))}
        </div>
      </fieldset>
    </Modal>
  );
};
export const VersionItem: FC<{
  version: string;
  setVersion: React.Dispatch<React.SetStateAction<VersionType>>;
  type: VersionType;
  title: string;
  description: string;
  link?: string;
}> = ({ version, setVersion, type, title, description, link }) => {
  const { t } = useTranslation();
  return (
    <label
      className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer"
      style={{ borderColor: version === type ? '#315ff4' : '#dfe6f1' }}
    >
      <input
        type="radio"
        name="knowledge-version"
        checked={version === type}
        onChange={() => setVersion(type)}
        className="mt-1 accent-[#315ff4]"
      />
      <span>
        <span className="font-medium text-[#18243d]">
          {t(`knowledge.${title}`)}
        </span>
        <span className="block mt-1 text-sm text-[#607089]">
          {t(`knowledge.${description}`)}
        </span>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="block mt-1 text-sm break-all text-[#315ff4]"
          >
            {link}
          </a>
        )}
      </span>
    </label>
  );
};
