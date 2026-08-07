import React, { FC, useEffect, useState } from 'react';
import { Switch, Tag, Form, Input, Button, Image, FormInstance } from 'antd';
import {
  createKnowledge,
  updateKnowledgeAPI,
  deleteChunkAPI,
} from '@/services/knowledge';
import { typeList, tagTypeClass } from '@/constants';
import GlobalMarkDown from '@/components/global-markdown';
import { useTranslation } from 'react-i18next';

import target from '@/assets/imgs/knowledge/icon_zhishi_target_act_1.png';
import text from '@/assets/imgs/knowledge/icon_zhishi_text.png';
import edit from '@/assets/imgs/knowledge/icon_zhishi_dialog_edit.png';
import del from '@/assets/imgs/main/icon_bot_del_act.png';
import order from '@/assets/imgs/knowledge/icon_zhishi_order.png';
import dialogDel from '@/assets/imgs/main/icon_dialog_del.png';
import { Chunk, FileInfoV2, TagDto } from '@/types/resource';

const { TextArea } = Input;

export const EditChunk: FC<{
  setEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  currentChunk: Chunk;
  fileId: number | string;
  resetKnowledge: () => void;
  enableChunk: (chunk: Chunk, checked: boolean) => void;
  setDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  fileInfo: FileInfoV2;
}> = ({
  setEditModal,
  currentChunk,
  fileId,
  resetKnowledge,
  enableChunk,
  setDeleteModal,
  fileInfo,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [folderTags, setFolderTags] = useState<string[]>([]);
  const [othersTag, setOtherTags] = useState<TagDto[]>([]);
  const [tagValue, setTagValue] = useState('');
  const [isEdit, setIsEdit] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [moreTags, setMoreTags] = useState(false);
  const [images] = useState<string[]>([]);

  useEffect(() => {
    form.setFieldsValue({
      text: currentChunk.content,
    });
    setTextValue(currentChunk.content || '');
    const currentTags = currentChunk.tagDtoList
      .filter(item => item.type === 4)
      .map(item => item.tagName);
    const remainTags = currentChunk.tagDtoList.filter(item => item.type !== 4);
    setTagValue(currentTags.join('，'));
    setOtherTags(remainTags);
    setChecked(currentChunk.enabled ? true : false);
  }, []);

  useEffect(() => {
    if (tagValue) {
      const tagArr = tagValue.split(/[,，]/).filter(item => item);
      setFolderTags([...tagArr]);

      if (tagArr.length + othersTag.length > 5) {
        setMoreTags(false);
      } else {
        setMoreTags(true);
      }
    } else {
      setFolderTags([]);
    }
  }, [tagValue]);

  function handleOk(): void {
    setLoading(true);
    const params = {
      id: currentChunk.id,
      fileId,
      content: textValue,
      tags: folderTags,
    };
    updateKnowledgeAPI(params)
      .then(() => {
        resetKnowledge();
        setEditModal(false);
      })
      .finally(() => setLoading(false));
  }

  return (
    <div
      className="mask"
      style={{
        zIndex: 999,
      }}
    >
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md w-[600px]">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <img src={order} className="w-3 h-3" alt="" />
            <span
              className="ml-1 text-xs text-[#F6B728]"
              style={{
                fontFamily: 'SF Pro Text, SF Pro Text-600',
                fontStyle: 'italic',
              }}
            >
              00{currentChunk.index}
            </span>
            <div className="items-center flex">
              <img src={text} className="w-3 h-3 ml-1.5" alt="" />
              <span className="text-desc ml-1">{currentChunk.charCount}</span>
              <img src={target} className="w-3 h-3 ml-1.5" alt="" />
              <span className="text-desc ml-1">
                {currentChunk.testHitCount}
              </span>
              <img
                src={typeList.get(fileInfo?.type)}
                className="w-4 h-4 ml-1.5"
                alt=""
              />
              <span
                className="text-second text-xs font-medium ml-1 text-overflow max-w-[300px]"
                title={fileInfo.name}
              >
                {fileInfo.name}
              </span>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center">
              <span
                className={`w-[9px] h-[9px] ${
                  checked ? 'bg-[#13A10E]' : 'bg-[#757575]'
                } rounded-full`}
              ></span>
              <span
                className={`${
                  checked ? 'text-[#13A10E]' : 'text-[#757575]'
                } text-sm ml-2`}
              >
                {checked ? t('knowledge.enabled') : t('knowledge.disabled')}
              </span>
            </div>
            <Switch
              disabled={['block', 'review'].includes(
                currentChunk.auditSuggest || ''
              )}
              size="small"
              checked={checked}
              onChange={checked => {
                setChecked(checked);
                enableChunk(currentChunk, checked);
              }}
              className="list-switch ml-4"
            />
          </div>
        </div>
        <EditChunkContent
          currentChunk={currentChunk}
          images={images}
          isEdit={isEdit}
          moreTags={moreTags}
          folderTags={folderTags}
          othersTag={othersTag}
          setMoreTags={setMoreTags}
          setIsEdit={setIsEdit}
          form={form}
          textValue={textValue}
          setTextValue={setTextValue}
          loading={loading}
          handleOk={handleOk}
          setEditModal={setEditModal}
          setDeleteModal={setDeleteModal}
        />
      </div>
    </div>
  );
};

export const EditChunkContent: FC<{
  currentChunk: Chunk;
  images: string[];
  isEdit: boolean;
  moreTags: boolean;
  folderTags: string[];
  othersTag: TagDto[];
  setMoreTags: React.Dispatch<React.SetStateAction<boolean>>;
  setEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  form: FormInstance<unknown>;
  textValue: string;
  setTextValue: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  handleOk: () => void;
}> = ({
  currentChunk,
  images,
  isEdit,
  moreTags,
  folderTags,
  othersTag,
  setMoreTags,
  setEditModal,
  setIsEdit,
  setDeleteModal,
  form,
  textValue,
  setTextValue,
  loading,
  handleOk,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {!isEdit && (
        <>
          <div className="mt-[18px] max-h-[320px] overflow-y-auto text-second text-sm break-words min-h-[100px]">
            <GlobalMarkDown
              content={currentChunk.markdownContent}
              isSending={false}
            />
          </div>
          <div className="flex items-center mt-2 gap-3 chunk-upload-images">
            <Image.PreviewGroup>
              {images.map((item, index) => (
                <div
                  key={index}
                  className="w-[129px] h-[86px] overflow-hidden rounded-lg"
                >
                  <Image src={item} alt="" />
                </div>
              ))}
            </Image.PreviewGroup>
          </div>
          <div className="mt-3 border-t border-[#e8e8e8] pt-2 pb-1 flex items-start justify-between">
            <div className="list-tag flex items-center flex-1 flex-wrap">
              {currentChunk.tagDtoList.map((item, index) => {
                if (index < 5) {
                  return (
                    <Tag
                      key={index}
                      className={tagTypeClass.get(item.type as number) || ''}
                    >
                      <span
                        className="max-w-[100px] text-overflow"
                        title={item.tagName}
                      >
                        {item.tagName}
                      </span>
                    </Tag>
                  );
                } else {
                  return moreTags ? (
                    <Tag
                      key={index}
                      className={tagTypeClass.get(item.type as number) || ''}
                    >
                      <span
                        className="max-w-[100px] text-overflow"
                        title={item.tagName}
                      >
                        {item.tagName}
                      </span>
                    </Tag>
                  ) : null;
                }
              })}
              {!moreTags && folderTags.length + othersTag.length > 5 && (
                <span
                  className="rounded-md inline-block bg-[#F0F3F9] px-2 py-1 h-6 text-desc mb-1 cursor-pointer"
                  onClick={() => setMoreTags(true)}
                >
                  +{folderTags.length + othersTag.length - 5}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <div
                className="rounded-md border border-[#D7DFE9] px-4 py-1 text-second text-sm cursor-pointer"
                onClick={() => setEditModal(false)}
              >
                {t('common.cancel')}
              </div>
              <div
                className="rounded-md border border-[#D7DFE9] p-2 cursor-pointer"
                onClick={() => {
                  setMoreTags(false);
                  setIsEdit(true);
                }}
              >
                <img src={edit} className="w-[14px] h-[14px]" alt="" />
              </div>
              <div
                className="rounded-md border border-[#D7DFE9] p-2 cursor-pointer"
                onClick={() => {
                  setDeleteModal(true);
                }}
              >
                <img src={del} className="w-[14px] h-[14px]" alt="" />
              </div>
            </div>
          </div>
        </>
      )}
      {isEdit && (
        <div className="mt-1.5">
          <Form form={form} layout="vertical">
            <Form.Item
              label={t('knowledge.knowledgeParagraph')}
              rules={[
                {
                  required: true,
                  message: t('knowledge.knowledgeParagraphRequired'),
                },
              ]}
              name="text"
            >
              <TextArea
                className="global-textarea"
                style={{ height: 104 }}
                value={textValue}
                onChange={event => setTextValue(event?.target.value)}
                placeholder={t('common.inputPlaceholder')}
                autoSize={{ minRows: 2, maxRows: 10 }}
              />
            </Form.Item>
          </Form>
          <div className="flex flex-row-reverse gap-3 mt-7">
            <Button
              type="primary"
              loading={loading}
              disabled={!textValue}
              onClick={handleOk}
              style={{ height: 32, lineHeight: '32px' }}
            >
              {t('common.save')}
            </Button>
            <Button
              type="text"
              className="origin-btn"
              onClick={() => {
                setIsEdit(false);
                setMoreTags(false);
              }}
              style={{ height: 32, lineHeight: '32px', borderRadius: 6 }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export const CreateChunk: FC<{
  setAddModal: (value: boolean) => void;
  fileId: number | string;
  resetKnowledge: () => void;
}> = ({ setAddModal, fileId, resetKnowledge }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [textValue, setTextValue] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tagValue) {
      const tagArr = tagValue.split(/[,，]/).filter(item => item);
      setTags([...tagArr]);
    } else {
      setTags([]);
    }
  }, [tagValue]);

  function handleOk(): void {
    setLoading(true);
    const params = {
      fileId,
      content: textValue,
      tags,
    };
    createKnowledge(params)
      .then(() => {
        resetKnowledge();
        setAddModal(false);
      })
      .finally(() => setLoading(false));
  }

  return (
    <div className="mask">
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md w-[600px]">
        <div className="text-second text-lg font-medium">
          {t('knowledge.addKnowledgeParagraph')}
        </div>
        <div className="mt-6">
          <Form form={form} layout="vertical">
            <Form.Item
              label={t('knowledge.knowledgeParagraph')}
              rules={[
                {
                  required: true,
                  message: t('knowledge.knowledgeParagraphRequired'),
                },
              ]}
              name="text"
            >
              <TextArea
                className="global-textarea"
                style={{ height: 104 }}
                value={textValue}
                onChange={event => setTextValue(event.target.value)}
                placeholder={t('common.inputPlaceholder')}
                autoSize={{ minRows: 6, maxRows: 10 }}
              />
            </Form.Item>
          </Form>
        </div>
        <div className="flex flex-row-reverse gap-3 mt-7">
          <Button
            type="primary"
            loading={loading}
            disabled={!textValue}
            className="px-[48px]"
            onClick={handleOk}
          >
            {t('common.save')}
          </Button>
          <Button
            type="text"
            className="origin-btn px-[48px]"
            onClick={() => setAddModal(false)}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const DeleteChunk: FC<{
  setDeleteModal: (value: boolean) => void;
  currentChunk: Chunk;
  fetchData: () => void;
  setEditModal: (value: boolean) => void;
}> = ({ setDeleteModal, currentChunk, fetchData, setEditModal }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  function handleDelete(): void {
    setLoading(true);
    deleteChunkAPI(currentChunk.id)
      .then(() => {
        setDeleteModal(false);
        setEditModal(false);
        fetchData();
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <div className="mask">
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md min-w-[310px]">
        <div className="flex items-center">
          <div className="bg-[#fff5f4] w-10 h-10 flex justify-center items-center rounded-lg">
            <img src={dialogDel} className="w-7 h-7" alt="" />
          </div>
          <p className="ml-2.5">{t('knowledge.confirmDeleteParagraph')}</p>
        </div>
        <p className="mt-6 text-desc max-w-[310px]">
          {t('knowledge.paragraphDeleteWarning')}
        </p>
        <div className="flex flex-row-reverse gap-3 mt-7">
          <Button
            type="text"
            loading={loading}
            onClick={handleDelete}
            className="delete-btn"
            style={{ paddingLeft: 24, paddingRight: 24 }}
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
