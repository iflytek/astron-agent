import start from '@/assets/imgs/workflow/node-icons/start.svg';
import end from '@/assets/imgs/workflow/node-icons/end.svg';
import model from '@/assets/imgs/workflow/node-icons/large-model.svg';
import code from '@/assets/imgs/workflow/node-icons/code.svg';
import knowledge from '@/assets/imgs/workflow/node-icons/knowledge-base.svg';
import flow from '@/assets/imgs/workflow/node-icons/workflow.svg';
import iteration from '@/assets/imgs/workflow/node-icons/iteration.svg';
import variable from '@/assets/imgs/workflow/node-icons/variable-storage.svg';
import extractor from '@/assets/imgs/workflow/node-icons/variable-extractor.svg';
import text from '@/assets/imgs/workflow/node-icons/text-processing.svg';
import message from '@/assets/imgs/workflow/node-icons/message.svg';
import tool from '@/assets/imgs/workflow/node-icons/tool.svg';
import rpa from '@/assets/imgs/workflow/node-icons/rpa.svg';
import mcp from '@/assets/imgs/workflow/node-icons/mcp.svg';
import loop from '@/assets/imgs/workflow/node-icons/loop.svg';
import aggregation from '@/assets/imgs/workflow/node-icons/variable-aggregator.svg';
import decision from '@/assets/imgs/workflow/node-icons/decision.svg';
import branch from '@/assets/imgs/workflow/node-icons/branch.svg';
import agent from '@/assets/imgs/workflow/node-icons/agent.svg';
import questionAnswer from '@/assets/imgs/workflow/node-icons/question-answer.svg';
import database from '@/assets/imgs/workflow/node-icons/database.svg';
import type { WorkflowNodeCategory } from '../types/domain';

const builtinIcons: Record<string, string> = {
  'node-start': start,
  'iteration-node-start': start,
  'loop-node-start': start,
  'node-end': end,
  'iteration-node-end': end,
  'loop-node-end': end,
  'loop-exit': end,
  'spark-llm': model,
  'ifly-code': code,
  'knowledge-base': knowledge,
  'knowledge-pro-base': knowledge,
  'decision-making': decision,
  'if-else': branch,
  iteration,
  loop,
  'node-variable': variable,
  'extractor-parameter': extractor,
  'text-joiner': text,
  message,
  agent,
  'question-answer': questionAnswer,
  database,
  'variable-aggregation': aggregation,
  plugin: tool,
  flow,
  rpa,
  mcp,
};

/** Known node identities use the supplied SVG set; extensions retain custom icons. */
export function workflowNodeIconSource(
  nodeType: string,
  customIcon?: string
): string | undefined {
  if (Object.prototype.hasOwnProperty.call(builtinIcons, nodeType))
    return builtinIcons[nodeType];
  return customIcon;
}

/** Normalize templates only, without rewriting saved graph data or model avatars. */
export function normalizeWorkflowNodeIcons(
  categories: WorkflowNodeCategory[]
): WorkflowNodeCategory[] {
  return categories.map(category => ({
    ...category,
    nodes: category.nodes.map(node => {
      const icon = workflowNodeIconSource(
        node.idType,
        node.data.icon || node.icon
      );
      return {
        ...node,
        icon,
        data: { ...node.data, icon },
      };
    }),
  }));
}
