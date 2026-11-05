import type {
  ChangeEventHandler,
  Dispatch,
  MutableRefObject,
  ReactElement,
  ReactNode,
  RefObject,
  SetStateAction,
} from 'react';
import type {
  AvatarType,
  RepoItem,
  ToolItem as ResourceTool,
} from '@/types/resource';
import type { SkillImportItem } from '@/types/skill';
import type { ToolItem as SelectedTool } from '@/components/workflow/types/nodes/agent';
import type { WorkflowNode } from '@/components/workflow/types/domain';

export interface ParameterSummary {
  id?: string;
  key?: string;
  name?: string;
  title?: string;
  type: string;
  description?: string;
}

export interface ParameterPreview {
  key?: string;
  title: ReactNode;
}

export type PluginRow = Omit<ResourceTool, 'icon'> & {
  kind: 'plugin';
  icon: string;
  params: ParameterPreview[];
};

export interface McpRow {
  kind: 'mcp';
  id: string;
  name: string;
  toolId: string;
  description: string;
  icon: string;
  updateTime: string;
  childName: string;
  isMcp: true;
  avatarColor?: undefined;
  params?: undefined;
  webSchema?: undefined;
}

export type KnowledgeRow = RepoItem & { kind: 'knowledge'; toolId: string };
export type SkillRow = SkillImportItem & { kind: 'skill'; toolId: string };
export type CatalogTool = PluginRow | McpRow;
export type CatalogRow = CatalogTool | KnowledgeRow | SkillRow;
export type ToolDraft = Partial<ResourceTool> & { childName?: string };
export type CatalogTab =
  | ''
  | 'offical'
  | 'person'
  | 'mcp'
  | 'knowledge'
  | 'skill';
export type CatalogOperation =
  | ''
  | 'create'
  | 'edit'
  | 'test'
  | 'toolDetail'
  | 'mcpDetail';
export interface ToolPagination {
  pageNo: number;
  pageSize: number;
}

export interface CatalogContext {
  id: string;
  setPagination: Dispatch<SetStateAction<ToolPagination>>;
  pagination: ToolPagination;
  loader: RefObject<HTMLDivElement>;
  loadingRef: MutableRefObject<boolean>;
  hasMore: boolean;
  contentRef: MutableRefObject<string>;
  dataSource: CatalogRow[];
  setDataSource: Dispatch<SetStateAction<CatalogRow[]>>;
  setHasMore: Dispatch<SetStateAction<boolean>>;
  orderFlag: number;
  setOrderFlag: Dispatch<SetStateAction<number>>;
  orderBy: string;
  setOrderBy: Dispatch<SetStateAction<string>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  toolRef: RefObject<HTMLDivElement>;
  optionsRef: RefObject<HTMLDivElement>;
  currentTab: CatalogTab;
  setCurrentTab: Dispatch<SetStateAction<CatalogTab>>;
  setStep: Dispatch<SetStateAction<number>>;
  step: number;
  checkedIds: string[];
  nodes: WorkflowNode[];
  handleAddTool: (tool: SelectedTool) => void;
  handleCheckTool: (tool: CatalogTool) => void;
  toolsList: SelectedTool[];
  setSearchValue: Dispatch<SetStateAction<string>>;
  searchValue: string;
  handleInputChange: ChangeEventHandler<HTMLInputElement>;
  closeToolModal: () => void;
  handleChangeTab: (tab: CatalogTab) => void;
  operate: CatalogOperation;
  setOperate: Dispatch<SetStateAction<CatalogOperation>>;
  currentToolInfo: ToolDraft;
  setCurrentToolInfo: Dispatch<SetStateAction<ToolDraft>>;
  currentTool: ToolDraft;
  setCurrentTool: Dispatch<SetStateAction<ToolDraft>>;
  operateId: string | number;
  setOperateId: Dispatch<SetStateAction<string | number>>;
  setDeleteModal: Dispatch<SetStateAction<boolean>>;
  item: CatalogTool;
  renderParamsTooltip: (tool: CatalogTool) => ReactElement;
  handleClearData: () => void;
  handleClearMCPData: () => void;
  botIcon: AvatarType;
  setBotIcon: Dispatch<SetStateAction<AvatarType>>;
  botColor: string;
  setBotColor: Dispatch<SetStateAction<string>>;
}

export type CatalogPropsFor<Key extends keyof CatalogContext> = Pick<
  CatalogContext,
  Key
>;

export function isCatalogTool(row: CatalogRow): row is CatalogTool {
  return row.kind === 'plugin' || row.kind === 'mcp';
}

export function readParameterSummaries(
  schema: string | undefined
): ParameterSummary[] {
  if (!schema) return [];
  try {
    const parsed: unknown = JSON.parse(schema);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('toolRequestInput' in parsed) ||
      !Array.isArray(parsed.toolRequestInput)
    )
      return [];
    return parsed.toolRequestInput.flatMap(
      (value: unknown): ParameterSummary[] => {
        if (
          typeof value !== 'object' ||
          value === null ||
          !('type' in value) ||
          typeof value.type !== 'string'
        )
          return [];
        return [
          {
            type: value.type,
            id:
              'id' in value && typeof value.id === 'string'
                ? value.id
                : undefined,
            key:
              'key' in value && typeof value.key === 'string'
                ? value.key
                : undefined,
            name:
              'name' in value && typeof value.name === 'string'
                ? value.name
                : undefined,
            title:
              'title' in value && typeof value.title === 'string'
                ? value.title
                : undefined,
            description:
              'description' in value && typeof value.description === 'string'
                ? value.description
                : undefined,
          },
        ];
      }
    );
  } catch {
    return [];
  }
}

export function readMcpRows(value: unknown): McpRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown): McpRow[] => {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('id' in item) ||
      (typeof item.id !== 'string' && typeof item.id !== 'number') ||
      !('name' in item) ||
      typeof item.name !== 'string' ||
      !('server_url' in item) ||
      typeof item.server_url !== 'string'
    )
      return [];
    return [
      {
        kind: 'mcp',
        id: String(item.id),
        name: item.name,
        toolId: String(item.id),
        description:
          'brief' in item && typeof item.brief === 'string' ? item.brief : '',
        icon:
          'logo_url' in item && typeof item.logo_url === 'string'
            ? item.logo_url
            : '',
        updateTime:
          'create_time' in item && typeof item.create_time === 'string'
            ? item.create_time
            : '',
        childName:
          'childName' in item && typeof item.childName === 'string'
            ? item.childName
            : '',
        isMcp: true,
      },
    ];
  });
}
