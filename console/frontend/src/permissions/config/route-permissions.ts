import {
  ModuleType,
  OperationType,
  RoutePermissionConfig,
} from '@/types/permission';

// ==================== 路由权限映射 ===================

// 路由权限配置表
export const ROUTE_PERMISSIONS: RoutePermissionConfig[] = [
  // 资源管理相关路由
  // {
  //   path: '/resource/plugin',
  //   module: ModuleType.SPACE,
  //   operation: OperationType.ALL_RESOURCES_ACCESS,
  // },

  // Prompt工具相关路由
  // {
  //   path: '/prompt',
  //   module: ModuleType.SPACE,
  //   operation: OperationType.ALL_RESOURCES_ACCESS,
  // },
  // {
  //   path: '/prompt/promption',
  //   module: ModuleType.PROMPT_TOOLS,
  //   operation: OperationType.USE,
  // },
  // {
  //   path: '/promptgroupdebugger',
  //   module: ModuleType.PROMPT_TOOLS,
  //   operation: OperationType.USE,
  // },

  // // 发布管理相关路由
  // {
  //   path: '/management/release',
  //   module: ModuleType.SPACE,
  //   operation: OperationType.ALL_RESOURCES_ACCESS,
  // },

  // 模型管理相关路由
  // {
  //   path: '/management/model',
  //   module: ModuleType.SPACE,
  //   operation: OperationType.ALL_RESOURCES_ACCESS,
  // },
  // {
  //   path: '/management/model/detail',
  //   module: ModuleType.MODEL_MANAGEMENT,
  //   operation: OperationType.VIEW,
  // },

  // 效果测评相关路由
  {
    path: '/management/evaluation',
    module: ModuleType.SPACE,
    operation: OperationType.ALL_RESOURCES_ACCESS,
  },
  // {
  //   path: '/management/evaluation_createTask',
  //   module: ModuleType.EFFECT_EVALUATION,
  //   operation: OperationType.CREATE,
  // },
  // {
  //   path: '/management/evaluation_detail',
  //   module: ModuleType.EFFECT_EVALUATION,
  //   operation: OperationType.VIEW,
  // },
  // {
  //   path: '/management/evaluation/dataset',
  //   module: ModuleType.EFFECT_EVALUATION,
  //   operation: OperationType.VIEW,
  // },
  // {
  //   path: '/management/evaluation/dataset_createEval',
  //   module: ModuleType.EFFECT_EVALUATION,
  //   operation: OperationType.CREATE,
  // },
  // {
  //   path: '/management/evaluation/dimensions',
  //   module: ModuleType.EFFECT_EVALUATION,
  //   operation: OperationType.VIEW,
  // },
  // {
  //   path: '/management/evaluation/dimensions_create',
  //   module: ModuleType.EFFECT_EVALUATION,
  //   operation: OperationType.CREATE,
  // },

  // // API管理相关路由
  // {
  //   path: '/management/botApi',
  //   module: ModuleType.API_MANAGEMENT,
  //   operation: OperationType.VIEW,
  // },

  // 智能体相关路由
  {
    path: '/space/agent',
    module: ModuleType.SPACE,
    operation: OperationType.ALL_RESOURCES_ACCESS,
  },
  // {
  //   path: '/work_flow',
  //   module: ModuleType.AGENT,
  //   operation: OperationType.VIEW,
  // },
  // {
  //   path: '/chat',
  //   module: ModuleType.AGENT,
  //   operation: OperationType.USE,
  // },

  // // 空间设置相关路由
  // {
  //   path: '/space',
  //   module: ModuleType.SPACE,
  //   operation: OperationType.MANAGE,
  // },
  // {
  //   path: '/space/space-detail/*',
  //   module: ModuleType.SPACE,
  //   operation: OperationType.VIEW,
  // },
];
