export interface useDatabaseDetailProps {
  handleCustomSQL: () => void;
  handleDbChange: (dbId: string) => void;
  handleformdata: () => void;
  modeChange: (value: number) => void;
  getFields: (list: unknown[], dbId: string, tableName: string) => void;
}

export interface UseQueryFieldReturnProps {
  originOptions: unknown[];
  assignList: unknown[];
  updateOptions: (list: unknown[]) => void;
  updateFieldList: (newFieldLsit: unknown[]) => void;
  orderList: unknown[];
  handleAddSelect: (value: unknown) => void;
  sortChange: (e: unknown, it: unknown) => void;
  handleRemoveLine: (id: string) => void;
}

export interface UseConditionActionsReturnProps {
  handleAddLine: () => void;
  handleConditionChange: (value: unknown, currentCondition: unknown) => void;
  handleFieldChange: (value: unknown, currentCondition: unknown) => void;
  handleRemoveLine: (id: string) => void;
  handleOperatorChange: (value: unknown) => void;
}

export interface UseInputHelpersReturnProps {
  curentInput: (activeCondition: unknown) => unknown;
  getTextArray: (activeCondition: unknown) => unknown;
}

export interface UseNotInModalReturnProps {
  handleNotInClick: (activeCondition: unknown) => Promise<void>;
}
