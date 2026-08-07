export interface UseSingleNodeDebuggingReturn {
  handleRun: () => void;
  handleChangeParam: (
    index: number,
    fn: (data: unknown, value: unknown) => void,
    value: unknown
  ) => void;
  uploadComplete: (
    event: ProgressEvent<EventTarget>,
    index: number,
    fileId: string
  ) => void;
  handleFileUpload: (
    file: File,
    index: number,
    multiple: boolean,
    fileId: string
  ) => void;
  handleDeleteFile: (index: number, fileId: string) => void;
  canRunDebugger: boolean;
}
