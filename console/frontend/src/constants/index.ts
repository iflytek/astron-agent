import agentSquare from '@/assets/svgs/aside-square.svg';
import agentSquareAct from '@/assets/svgs/aside-square-act.svg';
import pluginSquare from '@/assets/svgs/aside-plugin.svg';
import pluginSquareAct from '@/assets/svgs/aside-plugin-act.svg';
import myProjects from '@/assets/svgs/aside-projects.svg';
import myProjectsAct from '@/assets/svgs/aside-projects-act.svg';
import effectEvaluation from '@/assets/svgs/aside-evaluation.svg';
import effectEvaluationAct from '@/assets/svgs/aside-evaluation-act.svg';
import releaseManagement from '@/assets/svgs/aside-release.svg';
import releaseManagementAct from '@/assets/svgs/aside-release-act.svg';
import modelManagement from '@/assets/svgs/aside-model.svg';
import modelManagementAct from '@/assets/svgs/aside-model-act.svg';
import resourceManagement from '@/assets/svgs/aside-resource.svg';
import resourceManagementAct from '@/assets/svgs/aside-resource-act.svg';

// TODO 应用管理图标替换
import appManagement from '@/assets/svgs/aside-app-manage.svg';
import appManagementAct from '@/assets//svgs/aside-app-manage-act.svg';

import promptTab from '@/assets/imgs/sidebar/prompt.svg';
import promptTabActive from '@/assets/imgs/sidebar/prompt-active.svg';
import galleryActive from '@/assets/imgs/common/gallery-active.png';
import uploadActive from '@/assets/imgs/common/upload-active.png';
import chatActive from '@/assets/imgs/common/chat-active.png';
import docx from '@/assets/imgs/knowledge/icon_zhishi_doc.png';
import pdf from '@/assets/imgs/knowledge/icon_zhishi_pdf.png';
import md from '@/assets/imgs/knowledge/icon_zhishi_md.png';
import txt from '@/assets/imgs/knowledge/icon_zhishi_txt.png';
import image from '@/assets/imgs/workflow/workflow-file-icon.png';
import folder from '@/assets/imgs/knowledge/icon_zhishi_folder.png';
import ppt from '@/assets/imgs/workflow/workflow-file-ppt-icon.png';
import knowledge from '@/assets/imgs/common/icon_bot_knowledge_file.png';
import yaml from '@/assets/imgs/common/icon_yaml.svg';
import xlsx from '@/assets/imgs/knowledge/icon_zhishi_xls.png';
import link from '@/assets/imgs/common/icon_zhishi_link.svg';
import audio from '@/assets/imgs/common/file-audio-icon.svg';
import i18n from '@/locales/i18n/index';
import gallery from '@/assets/imgs/main/icon_tabs_pic_normal.png';
import upload from '@/assets/imgs/main/icon_tabs_pc_normal.png';
import chat from '@/assets/imgs/common/icon_tabs_botcreat_normal.png';
import video from '@/assets/imgs/common/file-video-icon.svg';
import subtitle from '@/assets/imgs/common/file-srt-icon.svg';

export const tagTypeClass = new Map([
  [1, 'tag-knowledge'],
  [2, 'tag-folder'],
  [3, 'tag-file'],
  [4, 'tag-chunks'],
]);

export const parametersTypeList = [
  { label: 'string', value: 'string' },
  { label: 'number', value: 'number' },
  { label: 'boolean', value: 'boolean' },
  { label: 'object', value: 'object' },
  { label: 'array', value: 'array' },
];

// Menu list with i18n keys
export const createMenuList = (): {
  title: string;
  tabs: {
    icon: string;
    iconAct: string;
    subTitle: string;
    path: string;
    activeTab: string;
  }[];
}[] => [
  {
    title: '',
    tabs: [
      {
        icon: agentSquare,
        iconAct: agentSquareAct,
        subTitle: getTranslation('sidebar.agentMarketplace'),
        path: '/home',
        activeTab: 'home',
      },
      {
        icon: pluginSquare,
        iconAct: pluginSquareAct,
        subTitle: getTranslation('sidebar.pluginMarketplace'),
        path: '/store/plugin',
        activeTab: 'plugin',
      },
    ],
  },
  {
    title: getTranslation('sidebar.personalSpace'),
    tabs: [
      {
        icon: myProjects,
        iconAct: myProjectsAct,
        subTitle: getTranslation('sidebar.myAgents'),
        path: '/space/agent',
        activeTab: 'agent',
      },
      // {
      //   icon: promptTab,
      //   iconAct: promptTabActive,
      //   subTitle: getTranslation('sidebar.promptEngineering'),
      //   path: '/prompt',
      //   activeTab: 'prompt',
      // },
      // {
      //   icon: effectEvaluation,
      //   iconAct: effectEvaluationAct,
      //   subTitle: getTranslation('sidebar.effectEvaluation'),
      //   activeTab: 'evaluation',
      //   path: '/management/evaluation',
      // },
      {
        icon: releaseManagement,
        iconAct: releaseManagementAct,
        subTitle: getTranslation('sidebar.releaseManagement'),
        activeTab: 'release',
        path: '/management/release',
      },
      {
        icon: modelManagement,
        iconAct: modelManagementAct,
        subTitle: getTranslation('sidebar.modelManagement'),
        activeTab: 'model',
        path: '/management/model',
      },
      {
        icon: resourceManagement,
        iconAct: resourceManagementAct,
        subTitle: getTranslation('sidebar.resourceManagement'),
        activeTab: 'resource',
        path: '/resource/plugin',
      },
      {
        icon: appManagement,
        iconAct: appManagementAct,
        subTitle: getTranslation('sidebar.appManagement'),
        activeTab: 'app',
        path: '/management/app',
      },
      {
        icon: resourceManagement,
        iconAct: resourceManagementAct,
        subTitle: getTranslation('sidebar.platformAccountManagement'),
        activeTab: 'platform-account',
        path: '/management/platform-account',
      },
    ],
  },
];
// Helper function to get translations
const getTranslation = (key: string): string => {
  return i18n.t(key);
};

export const typeList = new Map([
  ['pdf', pdf],
  ['doc', docx],
  ['docx', docx],
  ['txt', txt],
  ['md', md],
  ['folder', folder],
  ['knowledge', knowledge],
  ['xlsx', xlsx],
  ['excel', xlsx],
  ['image', image],
  ['ppt', ppt],
  ['yaml', yaml],
  ['yml', yaml],
  ['audio', audio],
  ['html', link],
  ['link', link],
  ['video', video],
  ['subtitle', subtitle],
]);

export const compareOperators = [
  {
    label: getTranslation('common.contains'),
    value: 'contains',
  },
  {
    label: getTranslation('common.notContains'),
    value: 'not_contains',
  },
  {
    label: getTranslation('common.isEmpty'),
    value: 'empty',
  },
  {
    label: getTranslation('common.isNotEmpty'),
    value: 'not_empty',
  },
  {
    label: getTranslation('common.is'),
    value: 'is',
  },
  {
    label: getTranslation('common.isNot'),
    value: 'is_not',
  },
  {
    label: getTranslation('common.startsWith'),
    value: 'start_with',
  },
  {
    label: getTranslation('common.endsWith'),
    value: 'end_with',
  },
  {
    label: getTranslation('common.equals'),
    value: 'eq',
  },
  {
    label: getTranslation('common.notEquals'),
    value: 'ne',
  },
  {
    label: getTranslation('common.greaterThan'),
    value: 'gt',
  },
  {
    label: getTranslation('common.greaterThanOrEqual'),
    value: 'ge',
  },
  {
    label: getTranslation('common.lessThan'),
    value: 'lt',
  },
  {
    label: getTranslation('common.lessThanOrEqual'),
    value: 'le',
  },
  {
    label: getTranslation('common.isNull'),
    value: 'null',
  },
  {
    label: getTranslation('common.isNotNull'),
    value: 'not_null',
  },
];

export const avatarGenerationMethods = [
  {
    title: getTranslation('common.gallerySelection'),
    icon: gallery,
    iconAct: galleryActive,
    activeTab: 'gallery',
  },
  {
    title: getTranslation('common.localUpload'),
    icon: upload,
    iconAct: uploadActive,
    activeTab: 'upload',
  },
  // {
  //   title: getTranslation('common.aiGeneration'),
  //   icon: chat,
  //   iconAct: chatActive,
  //   activeTab: 'chat',
  // },
];

// Use a function to ensure translations are loaded when accessed
export const menuList = createMenuList();
export const conditions = [
  {
    label: getTranslation('common.equals'),
    value: '=',
  },
  {
    label: getTranslation('common.notEquals'),
    value: '!=',
  },
  {
    label: getTranslation('common.greaterThan'),
    value: '>',
  },
  {
    label: getTranslation('common.greaterThanOrEqual'),
    value: '>=',
  },
  {
    label: getTranslation('common.lessThan'),
    value: '<',
  },
  {
    label: getTranslation('common.lessThanOrEqual'),
    value: '<=',
  },
  {
    label: getTranslation('common.fuzzyMatch'),
    value: 'like',
  },
  {
    label: getTranslation('common.fuzzyNotMatch'),
    value: 'not like',
  },
  {
    label: getTranslation('common.in'),
    value: 'in',
  },
  {
    label: getTranslation('common.notIn'),
    value: 'not in',
  },
  {
    label: getTranslation('common.isNullCondition'),
    value: 'null',
  },
  {
    label: getTranslation('common.isNotNullCondition'),
    value: 'not null',
  },
];
