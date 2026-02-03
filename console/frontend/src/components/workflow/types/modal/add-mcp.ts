// mcp操作类型
export type McpOperateType = '' | 'mcpDetail';

// 标签类型
export type McpTabType = 'offical';

export interface McpItem {
  name: string;
  description: string;
  icon: string;
  updateTime: string;
  childName: string;
}
