// Code Node 相关类型定义

export interface CodeDetailProps {
  id: string;
  data: CodeNodeData;
}

export interface CodeNodeData {
  nodeParam: CodeNodeParam;
}

export interface CodeNodeParam {
  code?: string;
  codeErrMsg?: string;
}
