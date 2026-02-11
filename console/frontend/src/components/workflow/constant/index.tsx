import React from 'react';
import { StartDetail } from '@/components/workflow/nodes/start';
import { EndDetail } from '@/components/workflow/nodes/end';
import { CodeDetail } from '@/components/workflow/nodes/code';
import { LargeModelDetail } from '@/components/workflow/nodes/llm';
import { DatabaseDetail } from '@/components/workflow/nodes/database';
import { KnowledgeDetail } from '@/components/workflow/nodes/knowledge';
import { KnowledgeProDetail } from '@/components/workflow/nodes/knowledge-pro';
import { ToolDetail } from '@/components/workflow/nodes/plugin';
import { MessageDetail } from '@/components/workflow/nodes/message';
import { DecisionMakingDetail } from '@/components/workflow/nodes/decision-making';
import { IfElseDetail } from '@/components/workflow/nodes/if-else';
import { IteratorDetail } from '@/components/workflow/nodes/iterator';
import { TextHandleDetail } from '@/components/workflow/nodes/text-handle';
import { ExtractorParameterDetail } from '@/components/workflow/nodes/extractor-parameterNode';
import { VariableMemoryDetail } from '@/components/workflow/nodes/variable-memory';
import { FlowDetail } from '@/components/workflow/nodes/flow';
import { AgentDetail } from '@/components/workflow/nodes/agent';
import { QuestionAnswerDetail } from '@/components/workflow/nodes/question-answer';
import { NodeCommonProps } from '@/components/workflow/types/hooks';
import { RpaDetail } from '@/components/workflow/nodes/rpa';
import { McpDetail } from '@/components/workflow/nodes/mcp';

// 定义输出类型选项的接口（支持嵌套结构）
interface OriginOutputType {
  label: string;
  value: string;
  children?: OriginOutputType[];
}

export const nodeTypeComponentMap: Record<
  string,
  React.ComponentType<NodeCommonProps>
> = {
  'node-start': StartDetail,
  'iteration-node-start': StartDetail,
  'spark-llm': LargeModelDetail,
  'ifly-code': CodeDetail,
  'knowledge-base': KnowledgeDetail,
  'knowledge-pro-base': KnowledgeProDetail,
  'question-answer': QuestionAnswerDetail,
  database: DatabaseDetail,
  plugin: ToolDetail,
  flow: FlowDetail,
  'decision-making': DecisionMakingDetail,
  'if-else': IfElseDetail,
  'node-end': EndDetail,
  'iteration-node-end': EndDetail,
  iteration: IteratorDetail,
  agent: AgentDetail,
  'node-variable': VariableMemoryDetail,
  'extractor-parameter': ExtractorParameterDetail,
  'text-joiner': TextHandleDetail,
  message: MessageDetail,
  rpa: RpaDetail,
  mcp: McpDetail,
};

export const originOutputTypeList: OriginOutputType[] = [
  {
    label: 'String',
    value: 'string',
  },
  {
    label: 'File',
    value: 'file',
    children: [
      {
        label: 'Image',
        value: 'image',
      },
      {
        label: 'Pdf',
        value: 'pdf',
      },
      {
        label: 'Doc',
        value: 'doc',
      },
      {
        label: 'Ppt',
        value: 'ppt',
      },
      {
        label: 'Excel',
        value: 'excel',
      },
      {
        label: 'Txt',
        value: 'txt',
      },
      {
        label: 'Audio',
        value: 'audio',
      },
      {
        label: 'Video',
        value: 'video',
      },
      {
        label: 'Subtitle',
        value: 'subtitle',
      },
    ],
  },
  {
    label: 'Integer',
    value: 'integer',
  },
  {
    label: 'Boolean',
    value: 'boolean',
  },
  {
    label: 'Number',
    value: 'number',
  },
  {
    label: 'Object',
    value: 'object',
  },
  {
    label: 'Array<String>',
    value: 'array-string',
  },
  {
    label: 'Array<File>',
    value: 'fileList',
    children: [
      {
        label: 'Array<Image>',
        value: 'Array<image>',
      },
      {
        label: 'Array<Pdf>',
        value: 'Array<pdf>',
      },
      {
        label: 'Array<Doc>',
        value: 'Array<doc>',
      },
      {
        label: 'Array<Ppt>',
        value: 'Array<ppt>',
      },
      {
        label: 'Array<Excel>',
        value: 'Array<excel>',
      },
      {
        label: 'Array<Txt>',
        value: 'Array<txt>',
      },
      {
        label: 'Array<Audio>',
        value: 'Array<audio>',
      },
    ],
  },
  {
    label: 'Array<Integer>',
    value: 'array-integer',
  },
  {
    label: 'Array<Boolean>',
    value: 'array-boolean',
  },
  {
    label: 'Array<Number>',
    value: 'array-number',
  },
  {
    label: 'Array<Object>',
    value: 'array-object',
  },
];
