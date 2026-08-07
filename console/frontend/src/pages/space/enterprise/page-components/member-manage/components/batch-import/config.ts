import { ModuleType, OperationType } from '@/types/permission';
import type { ButtonConfig } from '@/components/button-group/types';

// 导入步骤枚举
export enum ImportStep {
  BEFORE_IMPORT = 'before', // 导入前
  UPLOADING = 'uploading', // 上传中
  IMPORT_RESULT = 'import_result', // 导入后（显示结果）
}

// 组件属性接口
export interface BatchImportProps {
  onSubmit?: (data: any) => Promise<boolean>;
  skipResultPreview?: boolean; // 是否跳过结果预览，直接打开AddMemberModal
}

// 批量导入按钮配置
const batchImportButtonConfig: ButtonConfig = {
  key: 'batchImport',
  text: 'spaceManagement.batchImport',
  type: 'primary',
  size: 'small',
  permission: {
    module: ModuleType.SPACE,
    operation: OperationType.ADD_MEMBERS,
  },
};

// 导入模板按钮配置
const importTemplateButtonConfig: ButtonConfig = {
  key: 'importTemplate',
  text: 'spaceManagement.importTemplate',
  type: 'link',
};

// 解析结果按钮配置
const exportResultButtonConfig: ButtonConfig = {
  key: 'exportResult',
  text: 'spaceManagement.exportResult',
  type: 'link',
};

export const btnConfigs = {
  batchImport: batchImportButtonConfig,
  importTemplate: importTemplateButtonConfig,
  exportResult: exportResultButtonConfig,
};
