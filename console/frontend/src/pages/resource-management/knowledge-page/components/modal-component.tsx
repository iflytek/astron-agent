import React, { useState, useRef, FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { createKnowledgeAPI, deleteKnowledgeAPI } from '@/services/knowledge';

import dialogDel from '@/assets/imgs/main/icon_dialog_del.png';
import knowledgeVersionChecked from '@/assets/imgs/knowledge/knowledge_version_checked.svg';
import { RepoItem } from '../../../../types/resource';

const { TextArea } = Input;

export type VersionType = 'AIUI-RAG2' | 'CBG-RAG' | 'Ragflow-RAG';
export const versionList: {
  type: VersionType;
  title: string;
  description?: string;
  link?: string;
}[] = [
  // {
  //   type: 'AIUI-RAG2',
  //   title: 'xingchenKnowledge',
  //   description: 'xingchenDescription',
  // },
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

  function handleDelete(): void {
    setLoading(true);
    deleteKnowledgeAPI(currentKnowledge.id, currentKnowledge.tag)
      .then(data => {
        setDeleteModal(false);
        getKnowledges();
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <div className="mask">
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md w-[310px]">
        <div className="flex items-center">
          <div className="bg-[#fff5f4] w-10 h-10 flex justify-center items-center rounded-lg">
            <img src={dialogDel} className="w-7 h-7" alt="" />
          </div>
          <p className="ml-2.5">{t('knowledge.confirmDeleteKnowledge')}</p>
        </div>
        <div
          className="w-full h-10 bg-[#F9FAFB] text-center mt-7 py-2 px-5 text-overflow"
          title={currentKnowledge.name}
        >
          {currentKnowledge.name}
        </div>
        <p className="mt-6 text-desc">
          {t('knowledge.deleteKnowledgeWarning')}
        </p>
        <div className="flex flex-row-reverse gap-3 mt-7">
          <Button
            type="text"
            loading={loading}
            className="delete-btn"
            style={{ paddingLeft: 24, paddingRight: 24 }}
            onClick={handleDelete}
          >
            {t('common.delete')}
          </Button>
          <Button
            type="text"
            className="origin-btn"
            onClick={() => setDeleteModal(false)}
            style={{ paddingLeft: 24, paddingRight: 24 }}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const CreateModal: FC<{ setCreateModal: (value: boolean) => void }> = ({
  setCreateModal,
}) => {
  const { t } = useTranslation();
  const appRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [disabledSave, setDisabledSave] = useState(true);
  const [desc, setDesc] = useState('');
  const [version, setVersion] = useState<VersionType>('Ragflow-RAG');
  const [loading, setLoading] = useState(false);

  function handleOk(): void {
    setLoading(true);
    const values = form.getFieldsValue();
    const params = {
      name: values.name,
      desc,
      tag: version,
    };
    createKnowledgeAPI(params)
      .then(data => {
        navigate(
          `/resource/knowledge/upload?parentId=-1&repoId=${data.id}&tag=${version}`
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function handleFormChange(): void {
    let flag = false;
    const values = form.getFieldsValue();
    for (const key in values) {
      if (!values[key]?.trim()) {
        flag = true;
      }
    }
    setDisabledSave(flag);
  }

  return (
    <div className="mask">
      <div
        className="absolute  rounded-2xl p-6 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-[#fff] w-[448px]"
        ref={appRef}
      >
        <div className="font-semibold text-base">
          {t('knowledge.createKnowledge')}
        </div>
        <div className="mt-[26px]">
          <Form form={form} layout="vertical" onFieldsChange={handleFormChange}>
            <Form.Item
              label={t('knowledge.knowledgeName')}
              rules={[{ required: true }]}
              name="name"
            >
              <Input
                type="text"
                maxLength={20}
                showCount
                className="global-input"
                placeholder={t('knowledge.pleaseEnter')}
              />
            </Form.Item>
          </Form>
        </div>
        <div className="mt-6">
          <h3 className="text-second font-medium text-sm">
            {t('knowledge.knowledgeDescription')}
          </h3>
          <div className="relative">
            <TextArea
              value={desc}
              onChange={event => setDesc(event.target.value)}
              placeholder={t('knowledge.pleaseEnter')}
              maxLength={200}
              className="global-input mt-2 shrink-0 w-full"
              style={{ height: 90, resize: 'none' }}
            />
            <div className="absolute bottom-3 right-3 ant-input-limit ">
              {desc.length} / 200
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-second font-medium text-sm">
              <span className="text-[#F74E43] mr-1 text-[18px] align-middle">
                *
              </span>
              {t('knowledge.knowledgeVersion')}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {versionList.map(item => (
              <VersionItem
                key={item.type}
                version={version}
                setVersion={setVersion}
                type={item.type}
                title={item.title}
                description={item.description || ''}
                link={item.link || ''}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-row-reverse gap-3 mt-7">
          <Button
            type="primary"
            disabled={disabledSave}
            loading={loading}
            className="px-6"
            onClick={handleOk}
          >
            {t('knowledge.confirm')}
          </Button>
          <Button
            type="text"
            className="origin-btn px-6"
            onClick={() => setCreateModal(false)}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
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
    <div
      className="w-full rounded-lg p-3.5 flex flex-col cursor-pointer relative "
      style={{
        border: version === type ? '1px solid #6356EA' : '1px solid #E2E8FF',
      }}
      onClick={() => setVersion(type)}
    >
      <div
        className="text-sm"
        style={{
          fontWeight: version === type ? 500 : 400,
          color: version === type ? '#6356EA' : '',
        }}
      >
        {t(`knowledge.${title}`)}
      </div>
      <p className="text-desc">
        {t(`knowledge.${description}`)}
        {link && (
          <a
            className="hover:text-[#275EFF]"
            rel="noopener noreferrer"
            onClick={e => {
              e.stopPropagation();
              window.open(link);
            }}
          >
            {link}
          </a>
        )}
      </p>
      {version === type && (
        <img
          src={knowledgeVersionChecked}
          className="absolute top-[-1px] right-[-1px] w-[30px] h-[30px]"
          alt=""
        />
      )}
    </div>
  );
};
