// 企业空间菜单配置
import {
  SpaceManageIcon,
  MemberManageIcon,
  TeamSettingsIcon,
} from '@/components/svg-icons/space';

export const enterpriseMenuItems = [
  {
    key: 'space',
    title: '空间管理',
    path: 'space',
    icon: SpaceManageIcon,
  },
  {
    key: 'member',
    title: '成员管理',
    path: 'member',
    icon: MemberManageIcon,
  },
  {
    key: 'team',
    title: '团队设置',
    path: 'team',
    icon: TeamSettingsIcon,
  },
];

// 页面标题配置
export const PAGE_TITLES = {
  space: '空间管理',
  member: '成员管理',
  team: '团队设置',
} as const;
