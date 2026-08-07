import { Node } from 'reactflow';
export interface RpaInfo {
  id: number;
  category: string;
  name: string;
  value: string;
  isDeleted: number;
  remarks: string | null;
  icon: string | null;
  createTime: string;
  updateTime: string;
  assistantName?: string;
  status?: number;
  userName?: string;
  robotCount?: number;
  path?: string;
}

export interface RpaParameter {
  id: string;
  varDirection: number;
  varName: string;
  varType: string;
  type: string;
  varValue: string;
  varDescribe: string;
  processId: string;
  required?: boolean;
  editable?: boolean;
}

export interface RpaRobot {
  project_id: string;

  name: string;

  english_name: string;

  description: string;

  version: string;

  status: number;

  parameters: RpaParameter[];

  user_id: string;

  created_at: string;

  updated_at: string;

  icon: string;
  apiKey?: string;
}

export interface RpaDetailInfo {
  id: number;

  platformId: number;

  assistantName: string;

  status: number;

  fields: {
    apiKey: string;
    [key: string]: string;
  };

  robots: RpaRobot[];

  createTime: string;

  icon?: string;
  replaceFields?: boolean;
  userName?: string;
  remarks?: string;
  platform?: string;
  updateTime: string;
}

export interface RpaDetailFormInfo {
  platformId: number;
  assistantName: string;
  icon: string;
  apiKey: string;
  [key: string]: string | number;
}
export interface RpaFormInfo {
  platformId: string;
  assistantName?: string;
  icon?: string;
  fields: {
    apiKey: string;
  };
  replaceFields?: boolean;
  remarks?: string;
}

export interface RpaNode extends Node {
  nodeType: string;
  data: {
    nodeParam: {
      projectId: string;
    };
  };
}

export interface RpaNodeParam extends RpaRobot {
  fields: RpaDetailInfo['fields'];
  platform?: string;
  rpaId?: number;
}
