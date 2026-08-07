import { localeConfig } from '@/locales/localeConfig';
import { ModuleType, OperationType, RoleType } from '@/types/permission';

// 获取国际化文案的工具函数
export const getI18nText = (locale: string, key: string): string => {
  const spaceManagement = (
    localeConfig as Record<string, { spaceManagement?: Record<string, string> }>
  )[locale]?.spaceManagement;
  return spaceManagement?.[key] ?? key;
};

// 角色常量配置
export const ALL_ROLE = '0';
export const SUPER_ADMIN_ROLE = '1';
export const OWNER_ROLE = '1';
export const ADMIN_ROLE = '2';
export const MEMBER_ROLE = '3';

// 状态常量配置
const ALL_STATUS = '0';
export const PENDING_STATUS = '1'; // 待确认
const JOINED_STATUS = '3'; // 已加入
const PASSED_STATUS = '2'; // 通过
const REJECTED_STATUS_APPLY = '3'; // 拒绝 - 申请
const REJECTED_STATUS_INVITE = '2'; // 拒绝 - 邀请
const WITHDRAWN_STATUS = '4'; // 撤回
const EXPIRED_STATUS = '5'; // 过期

// Tab相关配置
export const TAB_KEYS = {
  MEMBERS: 'members',
  APPLY: 'apply',
  INVITATIONS: 'invitations',
  SETTINGS: 'settings',
} as const;

export const getTabOptions = (
  locale: string
): {
  key: string;
  label: string;
  permission?: { module: ModuleType; operation: OperationType };
}[] => [
  { key: TAB_KEYS.MEMBERS, label: getI18nText(locale, 'memberManagement') },
  {
    key: TAB_KEYS.APPLY,
    label: getI18nText(locale, 'applyManagement'),
    permission: {
      module: ModuleType.SPACE,
      operation: OperationType.APPLY_MANAGE,
    },
  },
  {
    key: TAB_KEYS.INVITATIONS,
    label: getI18nText(locale, 'invitationManagement'),
    permission: {
      module: ModuleType.SPACE,
      operation: OperationType.INVITATION_MANAGE,
    },
  },
  { key: TAB_KEYS.SETTINGS, label: getI18nText(locale, 'spaceSettings') },
];

// 角色 number => string
export const roleToRoleType = (
  role: number,
  isEnterprise: boolean = false
): RoleType => {
  if (role === undefined) {
    return RoleType.MEMBER;
  }

  const roleMap = {
    ...(isEnterprise
      ? { [SUPER_ADMIN_ROLE]: RoleType.SUPER_ADMIN }
      : { [OWNER_ROLE]: RoleType.OWNER }),
    [ADMIN_ROLE]: RoleType.ADMIN,
    [MEMBER_ROLE]: RoleType.MEMBER,
  };

  const roleKey = String(role) as keyof typeof roleMap;
  return roleMap[roleKey] || RoleType.MEMBER;
};

// 角色 string => number
const roleTypeMap = {
  [RoleType.SUPER_ADMIN]: SUPER_ADMIN_ROLE,
  [RoleType.OWNER]: OWNER_ROLE,
  [RoleType.ADMIN]: ADMIN_ROLE,
  [RoleType.MEMBER]: MEMBER_ROLE,
  default: ALL_ROLE,
} as const;
export const roleTypeToRole = (roleType: string | undefined): string => {
  return (
    roleTypeMap[roleType as keyof typeof roleTypeMap] || roleTypeMap.default
  );
};

// 角色筛选配置
export const ROLE_FILTER = {
  ALL: 'all',
  SUPER_ADMIN: RoleType.SUPER_ADMIN,
  OWNER: RoleType.OWNER,
  ADMIN: RoleType.ADMIN,
  MEMBER: RoleType.MEMBER,
} as const;

/**
 * 获取角色筛选选项
 * @param locale 语言
 * @param isEnterprise 是否是企业管理
 * @returns 角色筛选选项
 */
export const getRoleOptions = (
  locale: string,
  isEnterprise: boolean = false
): { value: string; label: string }[] => [
  { value: ROLE_FILTER.ALL, label: getI18nText(locale, 'allRoles') },
  ...(isEnterprise
    ? [
        {
          value: ROLE_FILTER.SUPER_ADMIN,
          label: getI18nText(locale, 'superAdmin'),
        },
      ]
    : [{ value: ROLE_FILTER.OWNER, label: getI18nText(locale, 'owner') }]),
  { value: ROLE_FILTER.ADMIN, label: getI18nText(locale, 'admin') },
  { value: ROLE_FILTER.MEMBER, label: getI18nText(locale, 'member') },
];

// 状态筛选配置 - 邀请
export const STATUS_FILTER = {
  ALL: ALL_STATUS,
  PENDING: PENDING_STATUS,
  REJECTED: REJECTED_STATUS_INVITE,
  JOINED: JOINED_STATUS,
  WITHDRAWN: WITHDRAWN_STATUS,
  EXPIRED: EXPIRED_STATUS,
} as const;

// 状态筛选配置 - 申请
export const STATUS_FILTER_APPLY = {
  ALL: ALL_STATUS,
  PENDING: PENDING_STATUS,
  REJECTED: REJECTED_STATUS_APPLY,
  PASSED: PASSED_STATUS,
} as const;

/**
 * 获取状态筛选选项
 * @param locale 语言
 * @param isApply 是否是申请管理
 * @returns 状态筛选选项
 */
export const getStatusOptions = (
  locale: string,
  isApply: boolean = false
): { value: string; label: string }[] => [
  { value: STATUS_FILTER.ALL, label: getI18nText(locale, 'allStatus') },
  { value: STATUS_FILTER.PENDING, label: getI18nText(locale, 'pending') },
  ...(isApply
    ? [
        {
          value: STATUS_FILTER_APPLY.REJECTED,
          label: getI18nText(locale, 'rejected'),
        },
        {
          value: STATUS_FILTER_APPLY.PASSED,
          label: getI18nText(locale, 'passed'),
        },
      ]
    : [
        {
          value: STATUS_FILTER.REJECTED,
          label: getI18nText(locale, 'rejected'),
        },
        { value: STATUS_FILTER.JOINED, label: getI18nText(locale, 'joined') },
        {
          value: STATUS_FILTER.WITHDRAWN,
          label: getI18nText(locale, 'withdrawn'),
        },
        { value: STATUS_FILTER.EXPIRED, label: getI18nText(locale, 'expired') },
      ]),
];

// 时间相关配置
export const DEBOUNCE_DELAY = 500;
export const LOADING_DELAY = 800;

// 默认值配置
export const DEFAULT_VALUES = {
  TAB: TAB_KEYS.MEMBERS,
  ROLE_FILTER: ROLE_FILTER.ALL,
  STATUS_FILTER: STATUS_FILTER.ALL,
  STATUS_FILTER_APPLY: STATUS_FILTER_APPLY.ALL,
  SEARCH_VALUE: '',
} as const;

// 不同状态主题配置-申请
export const STATUS_THEME_MAP_APPLY = {
  [PENDING_STATUS]: 'warning',
  [REJECTED_STATUS_APPLY]: 'danger',
  [PASSED_STATUS]: 'success',
} as const;

// 不同状态主题配置-邀请
export const STATUS_THEME_MAP_INVITE = {
  [PENDING_STATUS]: 'warning',
  [REJECTED_STATUS_INVITE]: 'danger',
  [JOINED_STATUS]: 'success',
  [WITHDRAWN_STATUS]: 'default',
  [EXPIRED_STATUS]: 'default',
} as const;

/**
 * 获取申请状态文本展示映射
 * @param locale 语言
 * @param isApply 是否是申请管理
 * @returns 状态文本展示映射
 */
export const getApplyStatusTextMap = (
  locale: string
): Record<string, string> => ({
  [STATUS_FILTER_APPLY.ALL]: getI18nText(locale, 'allStatus'),
  [STATUS_FILTER_APPLY.PENDING]: getI18nText(locale, 'pending'),
  [STATUS_FILTER_APPLY.REJECTED]: getI18nText(locale, 'rejected'),
  [STATUS_FILTER_APPLY.PASSED]: getI18nText(locale, 'passed'),
});

/**
 * 获取邀请状态文本展示映射
 * @param locale 语言
 * @param isApply 是否是申请管理
 * @returns 状态文本展示映射
 */
export const getInvitationStatusTextMap = (
  locale: string
): Record<string, string> => ({
  [STATUS_FILTER.ALL]: getI18nText(locale, 'allStatus'),
  [STATUS_FILTER.PENDING]: getI18nText(locale, 'pending'),
  [STATUS_FILTER.REJECTED]: getI18nText(locale, 'rejected'),
  [STATUS_FILTER.JOINED]: getI18nText(locale, 'joined'),
  [STATUS_FILTER.WITHDRAWN]: getI18nText(locale, 'withdrawn'),
  [STATUS_FILTER.EXPIRED]: getI18nText(locale, 'expired'),
});

// 消息提示配置 - 支持国际化
export const getMessages = (
  locale: string
): {
  SUCCESS: Record<string, string>;
  ERROR: Record<string, string>;
  INFO: Record<string, string>;
} => ({
  SUCCESS: {
    SPACE_UPDATE: getI18nText(locale, 'spaceUpdateSuccess'),
    MEMBER_ADD: getI18nText(locale, 'memberAddSuccess'),
    OWNERSHIP_TRANSFER: getI18nText(locale, 'ownershipTransferSuccess'),
    SPACE_DELETE: getI18nText(locale, 'spaceDeleteSuccess'),
  },
  ERROR: {
    SPACE_LOAD: getI18nText(locale, 'spaceLoadError'),
    SPACE_UPDATE: getI18nText(locale, 'spaceUpdateError'),
    MEMBER_ADD: getI18nText(locale, 'memberAddError'),
    OWNERSHIP_TRANSFER: getI18nText(locale, 'ownershipTransferError'),
    SPACE_DELETE: getI18nText(locale, 'spaceDeleteError'),
    SPACE_NOT_FOUND: getI18nText(locale, 'spaceNotFound'),
  },
  INFO: {
    SHARE_DEVELOPING: getI18nText(locale, 'shareFeatureDeveloping'),
  },
});

// 空间角色映射 - 支持国际化
export const getRoleTextMap = (locale: string): Record<string, string> => ({
  [ALL_ROLE]: getI18nText(locale, 'allRoles'),
  [ROLE_FILTER.SUPER_ADMIN]: getI18nText(locale, 'superAdmin'),
  [ROLE_FILTER.OWNER]: getI18nText(locale, 'owner'),
  [ROLE_FILTER.ADMIN]: getI18nText(locale, 'admin'),
  [ROLE_FILTER.MEMBER]: getI18nText(locale, 'member'),
});

// 成员管理中角色选择器的可选择角色配置
export const MEMBER_ROLE_OPTIONS = [
  ROLE_FILTER.ADMIN,
  ROLE_FILTER.MEMBER,
] as const;

export const getMemberRoleOptions = (
  locale: string
): { value: number; label: string }[] =>
  MEMBER_ROLE_OPTIONS.map(role => ({
    value: Number(roleTypeToRole(role)),
    label: getI18nText(locale, role),
  }));

// export const defaultEnterpriseAvatar = 'https://openres.xfyun.cn/xfyundoc/2025-07-29/9a976f35-e51a-4140-817d-bde44e58ffa5/1753780785368/enterpriseAvatar.svg';
export const defaultEnterpriseAvatar =
  'https://openres.xfyun.cn/xfyundoc/2025-08-15/4c1ec85b-b8a5-422f-ad09-b398700a218e/1755245023381/building.svg';
