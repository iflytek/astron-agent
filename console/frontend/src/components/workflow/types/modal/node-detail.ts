// Node Detail Modal 相关类型定义

export interface NodeDetailProps {
  currentNodeId: string;
  handleCloseNodeTemplate: () => void;
}

export interface NodeTemplateItem {
  idType: string;
  name: string;
  icon: string;
  markdown: string;
}
