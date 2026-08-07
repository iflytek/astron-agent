import React, { useState, useEffect, useMemo, FC } from 'react';
import { Form, Input, Button, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  createFolderAPI,
  updateFolderAPI,
  updateFileAPI,
  deleteFileAPI,
  deleteFolderAPI,
} from '@/services/knowledge';
import { typeList, tagTypeClass } from '@/constants';
import { generateType } from '@/utils/utils';
import { useTranslation } from 'react-i18next';

import dialogDel from '@/assets/imgs/main/icon_dialog_del.png';
import folder from '@/assets/imgs/knowledge/icon_dialog_folder.png';
import {
  CreateFolderParams,
  FileItem,
  TagDto,
  UpdateFolderParams,
} from '@/types/resource';

const { TextArea } = Input;

export const AddFolder: FC<{
  setAddFolderModal: (value: boolean) => void;
  parentId: number;
  repoId: number;
  getFiles: () => void;
  modalType: string;
  currentFile: FileItem;
}> = ({
  setAddFolderModal,
  parentId,
  repoId,
  getFiles,
  modalType,
  currentFile,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [folderTags, setFolderTags] = useState<string[]>([]);
  const [_, setOtherTags] = useState<TagDto[]>([]);
  const [tagValue, setTagValue] = useState('');
  const [disabledSave, setDisabledSave] = useState(true);
  const [loading, setLoading] = useState(false);

  function handleOk(): void {
    setLoading(true);
    const values = form.getFieldsValue();
    const params: CreateFolderParams | UpdateFolderParams = {
      parentId,
      repoId,
      name: values.name,
      tags: folderTags,
    };

    let requestAPI;

    if (modalType === 'edit') {
      params.id = currentFile.id;
      requestAPI = updateFolderAPI;
    } else {
      requestAPI = createFolderAPI;
    }

    requestAPI(params)
      .then(() => {
        setAddFolderModal(false);
        getFiles();
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    if (tagValue) {
      const tagArr = tagValue.split(/[,，]/).filter(item => item);
      setFolderTags([...tagArr]);
    } else {
      setFolderTags([]);
    }
  }, [tagValue]);

  function handleFormChange(): void {
    let flag = false;
    const values = form.getFieldsValue();
    for (const key in values) {
      if (!values[key]) {
        flag = true;
      }
    }
    setDisabledSave(flag);
  }

  useEffect(() => {
    if (modalType === 'edit') {
      const currentTags = currentFile.tagDtoList
        ?.filter(item => item.type === 2)
        .map(item => item.tagName);
      const remainTags = currentFile.tagDtoList?.filter(
        item => item.type !== 2
      );
      setDisabledSave(false);
      setTagValue(currentTags?.join('，') || '');
      setOtherTags(remainTags || []);
      form.setFieldsValue({
        name: currentFile.name,
      });
    }
  }, []);

  // function deleteTag(index: number): void {
  //   folderTags.splice(index, 1);
  //   setFolderTags([...folderTags]);
  //   setTagValue(folderTags.join('，'));
  // }

  return (
    <div className="mask">
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md w-[448px]">
        <div className="flex items-center">
          <img src={folder} className="w-10 h-10" alt="" />
          <h3 className="ml-2.5 text-lg font-medium text-second">
            {modalType === 'create' ? t('common.create') : t('common.edit')}
            {t('knowledge.folder')}
          </h3>
        </div>
        <div className="mt-7">
          <Form layout="vertical" form={form} onFieldsChange={handleFormChange}>
            <Form.Item
              label={t('knowledge.folderName')}
              rules={[{ required: true }]}
              name="name"
            >
              <Input
                type="text"
                className="global-input"
                placeholder={t('knowledge.pleaseEnter')}
                maxLength={20}
                showCount
              />
            </Form.Item>
          </Form>
        </div>
        {/* <div className='mt-6'>
          <h3 className='text-sm font-medium text-second'>添加标签</h3>
          <p className='mt-1.5 text-desc'>用逗号隔开多个标签</p>
          {folderTags.length || othersTag.length ? <div className='mt-1 list-tag'>
            {folderTags.map((t: any, index) => {
              const currentTag = <Tag key={index} className='tag-folder'>
                <span className='max-w-[100px] text-overflow' title={t}>{t}</span>
                <span className='w-[1px] h-[10px] ml-2'></span>
                <span
                  className='flex items-center justify-center w-4 h-4 ml-2 cursor-pointer'
                  onClick={() => deleteTag(index)}
                >
                  <span className='text-sm mt-[-3px]'>x</span>
                </span>
              </Tag>
              if (index < 5) {
                return currentTag
              } else {
                return moreTags ? currentTag : null
              }
            })}
            {othersTag.map((t: any, index) => {
              const currentTag = <Tag key={index} className={`tag-knowledge ${tagTypeClass.get(t.type)}`}>
                <span className='max-w-[100px] text-overflow' title={t.tagName}>{t.tagName}</span>
              </Tag>
              if (index < 5 - folderTags.length) {
                return currentTag
              } else {
                return moreTags ? currentTag : null
              }
            })}
            {!moreTags && folderTags.length + othersTag.length > 5 &&
              <span
                className='rounded-md inline-block bg-[#F0F3F9] px-2 py-1 h-6 text-desc mb-1 cursor-pointer'
                onClick={() => setMoreTags(true)}
              >
                +{folderTags.length + othersTag.length - 5}
              </span>}
          </div> : null}
          <TextArea
            placeholder='请输入'
            className='global-textarea mt-1.5'
            style={{height:104,resize: 'none'}}
            value={tagValue}
            onChange={(event) => setTagValue(event.target.value)}
            onBlur={(event) => {
              let valueArr = event.target.value.split('，')
              //@ts-ignore
              valueArr = [...new Set(valueArr)]
              const others = othersTag.map((item: any) => item.tagName)
              valueArr = valueArr.filter(item => !others.includes(item))
              setTagValue(valueArr.join('，'))
            }}
          />
        </div> */}
        <div className="flex flex-row-reverse gap-3 mt-7">
          <Button
            type="primary"
            className="px-[48px]"
            onClick={handleOk}
            disabled={disabledSave}
            loading={loading}
          >
            {modalType === 'edit' ? t('common.save') : t('common.add')}
          </Button>
          <Button
            type="text"
            className="origin-btn px-[48px]"
            onClick={() => setAddFolderModal(false)}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const DeleteFile: FC<{
  repoId: number;
  setDeleteModal: (value: boolean) => void;
  currentFile: FileItem;
  getFiles: () => void;
  tag: string;
}> = ({ repoId, setDeleteModal, currentFile, getFiles, tag }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  function handleDelete(): void {
    setLoading(true);
    if (currentFile.isFile) {
      deleteFileAPI(
        repoId,
        tag !== 'SparkDesk-RAG'
          ? currentFile.id
          : currentFile?.fileInfoV2?.uuid,
        tag
      )
        .then(data => {
          setDeleteModal(false);
          getFiles();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      deleteFolderAPI(currentFile.id)
        .then(data => {
          setDeleteModal(false);
          getFiles();
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }

  const fileImg = useMemo(() => {
    if (currentFile.type === 'folder') {
      return typeList.get(currentFile.type);
    }
    return typeList.get(
      generateType((currentFile.type || '')?.toLowerCase()) || ''
    );
  }, [currentFile, typeList, generateType]);

  return (
    <div className="mask">
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md min-w-[310px]">
        <div className="flex items-center">
          <div className="bg-[#fff5f4] w-10 h-10 flex justify-center items-center rounded-lg">
            <img src={dialogDel} className="w-7 h-7" alt="" />
          </div>
          <p className="ml-2.5">
            {currentFile.type === 'folder'
              ? t('knowledge.confirmDeleteFolder')
              : t('knowledge.confirmDeleteFile')}
            ？
          </p>
        </div>
        <div className="w-full h-10 bg-[#F9FAFB] text-center mt-7 py-3 px-2 text-xs flex justify-center items-center">
          <div className="flex items-center w-full">
            <img src={fileImg} className="flex-shrink-0 w-4 h-4" alt="" />
            <span
              className="ml-1 max-w-[262px] text-overflow"
              title={currentFile.name}
            >
              {currentFile.name}
            </span>
          </div>
        </div>
        <p className="mt-6 text-desc max-w-[292px]">
          {currentFile.type === 'folder'
            ? t('knowledge.folderDeleteWarning')
            : t('knowledge.fileDeleteWarning')}
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

export const TagsManage: FC<{
  setTagsModal: (value: boolean) => void;
  repoId: number;
  pid: number;
  currentFile: FileItem;
  getFiles: () => void;
}> = ({ setTagsModal, repoId, pid, currentFile, getFiles }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [folderTags, setFolderTags] = useState<string[]>([]);
  const [othersTag, setOtherTags] = useState<TagDto[]>([]);
  const [tagValue, setTagValue] = useState('');
  const [modalType] = useState('edit');
  const [loading, setLoading] = useState(false);
  const [moreTags, setMoreTags] = useState(false);

  useEffect(() => {
    const currentTags = currentFile.tagDtoList
      ?.filter(item => item.type === 3)
      .map(item => item.tagName);
    const remainTags = currentFile.tagDtoList?.filter(item => item.type !== 3);
    setTagValue(currentTags?.join('，') || '');
    setOtherTags(remainTags || []);
  }, []);

  useEffect(() => {
    if (tagValue) {
      const tagArr = tagValue.split(/[,，]/).filter(item => item);
      setFolderTags([...tagArr]);
    } else {
      setFolderTags([]);
    }
  }, [tagValue]);

  function handleOk(): void {
    setLoading(true);
    const params = {
      id: currentFile.id,
      repoId,
      parentId: pid,
      tags: folderTags,
    };
    updateFileAPI(params)
      .then(data => {
        setTagsModal(false);
        getFiles();
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function deleteTag(index: number): void {
    folderTags.splice(index, 1);
    setFolderTags([...folderTags]);
    setTagValue(folderTags.join('，'));
  }

  return (
    <div className="mask">
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md w-[448px]">
        {modalType === 'edit' && (
          <>
            <div className="text-lg text-second text-medium">
              {t('knowledge.tagSettings')}
            </div>
            <div className="bg-[#F9FAFB] mt-6 p-3 w-full flex items-center justify-center">
              <img
                src={typeList.get(
                  generateType((currentFile.type || '')?.toLowerCase()) || ''
                )}
                className="w-4 h-4"
                alt=""
              />
              <p className="ml-1 text-xs font-medium text-second">
                {currentFile.name}
              </p>
            </div>
            <div className="text-sm font-medium text-second mt-7">
              {t('knowledge.addTags')}
            </div>
            <div className="mt-1.5 text-desc font-medium">
              {t('knowledge.addTagsDescription')}{' '}
              <span
                className="text-[#6356EA] cursor-pointer"
                onClick={() =>
                  navigate(`/resource/knowledge/detail/${repoId}/setting`, {
                    state: {
                      parentId: pid,
                    },
                  })
                }
              >
                {t('knowledge.knowledgeSettings')}
              </span>
            </div>
            {folderTags.length || othersTag.length ? (
              <div className="mt-1 list-tag">
                {folderTags.map((t, index) => {
                  const currentTag = (
                    <Tag key={index} className="tag-file">
                      <span className="max-w-[100px] text-overflow" title={t}>
                        {t}
                      </span>
                      <span className="w-[1px] h-[10px] ml-2"></span>
                      <span
                        className="flex items-center justify-center w-4 h-4 ml-2 cursor-pointer"
                        onClick={() => deleteTag(index)}
                      >
                        <span className="text-sm mt-[-3px]">x</span>
                      </span>
                    </Tag>
                  );
                  if (index < 5) {
                    return currentTag;
                  } else {
                    return moreTags ? currentTag : null;
                  }
                })}
                {othersTag.map((t, index) => {
                  const currentTag = (
                    <Tag
                      key={index}
                      className={`tag-knowledge ${tagTypeClass.get(t.type as number)}`}
                    >
                      <span
                        className="max-w-[100px] text-overflow"
                        title={t.tagName}
                      >
                        {t.tagName}
                      </span>
                    </Tag>
                  );
                  if (index < 5 - folderTags.length) {
                    return currentTag;
                  } else {
                    return moreTags ? currentTag : null;
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
            ) : null}
            <TextArea
              placeholder="请输入"
              className="mt-2 global-textarea"
              style={{ height: 104, resize: 'none' }}
              value={tagValue}
              onChange={event => setTagValue(event.target.value)}
              onBlur={event => {
                let valueArr = event.target.value.split('，');
                //@ts-ignore
                valueArr = [...new Set(valueArr)];
                const others = othersTag.map(item => item.tagName);
                valueArr = valueArr.filter(item => !others.includes(item));
                setTagValue(valueArr.join('，'));
              }}
            />
            <div className="flex flex-row-reverse gap-3 mt-7">
              <Button
                type="primary"
                className="px-[48px]"
                loading={loading}
                onClick={handleOk}
              >
                {t('common.save')}
              </Button>
              <Button
                type="text"
                className="origin-btn px-[48px]"
                onClick={() => setTagsModal(false)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </>
        )}
        {modalType === 'delete' && (
          <>
            <div className="flex items-center">
              <div className="bg-[#fff5f4] w-10 h-10 flex justify-center items-center rounded-lg">
                <img src={dialogDel} className="w-7 h-7" alt="" />
              </div>
              <p className="ml-2.5">
                {t('knowledge.confirmDeleteKnowledgeTag')}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
