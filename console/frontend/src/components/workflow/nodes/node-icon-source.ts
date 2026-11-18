import start from '@/assets/imgs/workflow/start-node-icon.png';
import model from '@/assets/imgs/workflow/largeModelIcon.png';
import code from '@/assets/imgs/workflow/codeIcon.png';
import knowledge from '@/assets/imgs/workflow/knowledgeIcon.png';
import flow from '@/assets/imgs/workflow/flow-icon.png';
import iteration from '@/assets/imgs/workflow/iteration-icon.png';
import variable from '@/assets/imgs/workflow/variable-memory-icon.png';
import extractor from '@/assets/imgs/workflow/variable-extractor-icon.png';
import text from '@/assets/imgs/workflow/text-splicing-icon.png';
import message from '@/assets/imgs/workflow/message-node-icon.png';
import tool from '@/assets/imgs/workflow/tool-icon.png';
import mcp from '@/assets/imgs/workflow/mcp-icon.png';
import loop from '@/assets/imgs/workflow/loop-node-icon.svg';
import aggregation from '@/assets/imgs/workflow/variable-aggregation-icon.svg';
import type { WorkflowNodeCategory } from '../types/domain';

// Undefined entries use the official outline icon in WorkflowNodeIcon.
const builtinIcons: Record<string, string | undefined> = {
  'node-start': start,
  'iteration-node-start': start,
  'loop-node-start': start,
  'node-end': undefined,
  'iteration-node-end': undefined,
  'loop-node-end': undefined,
  'loop-exit': undefined,
  'spark-llm': model,
  'ifly-code': code,
  'knowledge-base': knowledge,
  'knowledge-pro-base': knowledge,
  'decision-making': undefined,
  'if-else': undefined,
  iteration,
  loop,
  'node-variable': variable,
  'extractor-parameter': extractor,
  'text-joiner': text,
  message,
  agent: undefined,
  'question-answer': undefined,
  database: undefined,
  'variable-aggregation': aggregation,
};

const resourceIcons: Record<string, string | undefined> = {
  plugin: tool,
  flow,
  rpa: tool,
  mcp,
};

/** Built-in identity is local; resource nodes retain their selected custom image. */
export function workflowNodeIconSource(
  nodeType: string,
  customIcon?: string
): string | undefined {
  if (Object.prototype.hasOwnProperty.call(builtinIcons, nodeType))
    return builtinIcons[nodeType];
  return customIcon || resourceIcons[nodeType];
}

/** Normalize templates only, without rewriting saved graph data or model avatars. */
export function normalizeWorkflowNodeIcons(
  categories: WorkflowNodeCategory[]
): WorkflowNodeCategory[] {
  return categories.map(category => ({
    ...category,
    nodes: category.nodes.map(node => {
      const isResourceTemplate = Object.prototype.hasOwnProperty.call(
        resourceIcons,
        node.idType
      );
      const icon = workflowNodeIconSource(
        node.idType,
        isResourceTemplate ? undefined : node.data.icon || node.icon
      );
      return {
        ...node,
        icon,
        data: { ...node.data, icon },
      };
    }),
  }));
}
