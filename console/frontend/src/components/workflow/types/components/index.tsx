export interface UseExceptionHandlingReturn {
  showExceptionHandlingOutput: boolean;
  exceptionHandlingOutput: unknown[];
  retryTimesOptions: unknown[];
  exceptionHandlingMethodOptions: unknown[];
  handleChangeNodeParam: (key: string, value: unknown) => void;
  handleAddExceptionHandlingEdge: (data: unknown) => void;
  handleRemoveExceptionHandlingEdge: () => void;
}
