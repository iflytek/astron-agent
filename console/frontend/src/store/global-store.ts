import { create } from 'zustand';
import { getConfigs } from '@/services/common';
import { configListRepos } from '@/services/knowledge';
import { listTools } from '@/services/plugin';
import { AvatarType, PageData, RepoItem, ToolItem } from '@/types/resource';

interface GlobalStore {
  avatarIcon: AvatarType[];
  avatarColor: AvatarType[];
  knowledges: RepoItem[];
  tools: ToolItem[];
  getAvatarConfig: () => void;
  getKnowledges: () => void;
  getTools: (searchValue?: string) => void;
}

const globalStore = create<GlobalStore>((set, get) => ({
  // 初始状态
  avatarIcon: [],
  avatarColor: [],
  knowledges: [],
  tools: [],

  getAvatarConfig(): void {
    Promise.all([getConfigs('ICON'), getConfigs('COLOR')]).then(
      ([icon, color]) => {
        set({
          avatarIcon: icon,
          avatarColor: color,
        });
      }
    );
  },
  getKnowledges(): void {
    const params = {
      pageNo: 1,
      pageSize: 999,
    };
    configListRepos(params).then(data => {
      set({
        knowledges: [...(data?.pageData || [])],
      });
    });
  },
  getTools(searchValue?: string): void {
    const params = {
      pageNo: 1,
      pageSize: 999,
      content: searchValue || '',
    };
    listTools(params).then((data: PageData<ToolItem>) => {
      set({
        tools: [...(data?.pageData || [])],
      });
    });
  },
}));

export default globalStore;
