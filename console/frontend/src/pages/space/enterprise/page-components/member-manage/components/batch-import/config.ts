import { ModuleType, OperationType } from '@/types/permission';
import type { ButtonConfig } from '@/components/button-group/types';

export interface BatchImportProps {
  onSubmit?: (data: any) => Promise<boolean>;
  skipResultPreview?: boolean;
}

const batchImport: ButtonConfig = {
  key: 'batchImport',
  text: 'spaceManagement.batchImport',
  type: 'primary',
  size: 'small',
  permission: {
    module: ModuleType.SPACE,
    operation: OperationType.ADD_MEMBERS,
  },
};
export const btnConfigs = { batchImport };
