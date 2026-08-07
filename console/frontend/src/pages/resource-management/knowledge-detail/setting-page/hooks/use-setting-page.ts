import { updateRepoAPI } from '@/services/knowledge';
import globalStore from '@/store/global-store';
import { AvatarType, RepoItem } from '@/types/resource';
import React, { useState, useEffect } from 'react';

export const useSettingPage = ({
  knowledgeInfo,
  repoId,
  initData,
}: {
  knowledgeInfo: RepoItem;
  repoId: string;
  initData: () => void;
}): {
  getKnowledges: () => void;
  avatarIcon: AvatarType[];
  avatarColor: AvatarType[];
  getAvatarConfig: () => void;
  name: string;
  tags: string[];
  tagValue: string;
  desc: string;
  loading: boolean;
  botIcon: { name?: string; value?: string };
  botColor: string;
  showModal: boolean;
  permission: number;
  users: { uid: string }[];
  idCopied: boolean;
  setName: React.Dispatch<React.SetStateAction<string>>;
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  setTagValue: React.Dispatch<React.SetStateAction<string>>;
  setDesc: React.Dispatch<React.SetStateAction<string>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setBotIcon: React.Dispatch<
    React.SetStateAction<{ name?: string; value?: string }>
  >;
  setBotColor: React.Dispatch<React.SetStateAction<string>>;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  setPermission: React.Dispatch<React.SetStateAction<number>>;
  setIdCopied: React.Dispatch<React.SetStateAction<boolean>>;
  handleSave: () => void;
} => {
  const getKnowledges = globalStore(state => state.getKnowledges);
  const avatarIcon = globalStore(state => state.avatarIcon);
  const avatarColor = globalStore(state => state.avatarColor);
  const getAvatarConfig = globalStore(state => state.getAvatarConfig);
  const [name, setName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagValue, setTagValue] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [botIcon, setBotIcon] = useState<{ name?: string; value?: string }>({});
  const [botColor, setBotColor] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [permission, setPermission] = useState(0);
  const [users] = useState([]);
  const [idCopied, setIdCopied] = useState(false);

  useEffect(() => {
    getAvatarConfig();
  }, []);

  useEffect(() => {
    setName(knowledgeInfo.name);
    setDesc(knowledgeInfo.description);
    setPermission(knowledgeInfo.visibility);
    if (knowledgeInfo.tagDtoList && knowledgeInfo.tagDtoList.length) {
      const knowledgeTags = knowledgeInfo.tagDtoList;
      const currentTags = knowledgeTags
        .filter(item => item.type === 1)
        .map(item => item.tagName);
      setTagValue(currentTags.join('，'));
    }
    setBotColor(knowledgeInfo.color || '');
    setBotIcon({
      name: knowledgeInfo.address,
      value: knowledgeInfo.icon,
    });
  }, [knowledgeInfo]);

  useEffect(() => {
    if (tagValue) {
      const tagArr = tagValue.split(/[,，]/).filter(item => item);
      setTags([...tagArr]);
    } else {
      setTags([]);
    }
  }, [tagValue]);

  function handleSave(): void {
    setLoading(true);
    const params: {
      id: string;
      name: string;
      desc: string;
      tags: string[];
      avatarColor: string;
      avatarIcon: string;
      visibility: number;
      uids?: string[];
    } = {
      id: repoId,
      name,
      desc,
      tags,
      avatarColor: botColor,
      avatarIcon: botIcon.value || '',
      visibility: permission,
    };
    if (permission === 1) {
      params.uids = users.map((item: { uid: string }) => item.uid);
    }
    updateRepoAPI(params)
      .then(() => {
        initData();
        getKnowledges();
      })
      .finally(() => setLoading(false));
  }
  return {
    getKnowledges,
    avatarIcon,
    avatarColor,
    getAvatarConfig,
    name,
    tags,
    tagValue,
    desc,
    loading,
    botIcon,
    botColor,
    showModal,
    permission,
    users,
    idCopied,
    setName,
    setTags,
    setTagValue,
    setDesc,
    setLoading,
    setBotIcon,
    setBotColor,
    setShowModal,
    setPermission,
    setIdCopied,
    handleSave,
  };
};
