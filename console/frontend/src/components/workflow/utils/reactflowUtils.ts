import { cloneDeep } from 'lodash';
import { v4 as uuid } from 'uuid';
import Ajv, { type AnySchema } from 'ajv';
import i18next from 'i18next';
import { isJSON } from '@/utils';
import { InputSchema, ToolArg } from '@/types/plugin-store';
import { validateVariableAggregationNode } from './variable-aggregation';
import type {
  ParameterProperty,
  ParameterSchema,
  ToolParameterNode,
  WorkflowInput,
  WorkflowNode,
  WorkflowNodeData,
  WorkflowNodeParameters,
  WorkflowOutput,
  WorkflowReference,
  WorkflowViewport,
} from '../types/domain';

const errorOutputTemplate: WorkflowOutput[] = [
  {
    id: uuid(),
    name: 'errorCode',
    schema: {
      type: 'string',
      default: '错误码',
    },
    nameErrMsg: '',
  },
  {
    id: uuid(),
    name: 'errorMessage',
    schema: {
      type: 'string',
      default: '错误信息',
    },
    nameErrMsg: '',
  },
];

// ==================== 基础工具函数 ====================
export function scapedJSONStringfy(json: object): string {
  return customStringify(json).replace(/"/g, 'œ');
}

export function scapeJSONParse(json: string): unknown {
  const parsed = json.replace(/œ/g, '"');
  return JSON.parse(parsed);
}

export function customStringify(obj: unknown): string {
  if (typeof obj === 'undefined') {
    return 'null';
  }

  if (obj === null || typeof obj !== 'object') {
    if (obj instanceof Date) {
      return `"${obj.toISOString()}"`;
    }
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const arrayItems = obj.map(item => customStringify(item)).join(',');
    return `[${arrayItems}]`;
  }

  const keyValuePairs = Object.entries(obj)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `"${key}":${customStringify(value)}`);
  return `{${keyValuePairs.join(',')}}`;
}

export function getHandleId(
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string
): string {
  return `reactflow__edge-${source}${sourceHandle}-${target}${targetHandle}`;
}

export function getNodeId(nodeType: string): string {
  return `${nodeType}::${uuid()}`;
}

export function getEdgeId(sourceId: string, targetId: string): string {
  return `reactflow__edge-${sourceId}-${targetId}`;
}

export function extractTargetAndSource(inputString: string): string[] | null {
  const regex =
    /([a-zA-Z]+-(llm|start|end|making|code|base|else|parameter|joiner|aggregation)|plugin|message|iteration|loop|loop-node-start|loop-node-end|loop-exit|variable)::[0-9a-fA-F-]{36}/g;
  return inputString.match(regex);
}

function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomPosition(viewPoint: WorkflowViewport): {
  x: number;
  y: number;
} {
  const zoom = 1 / viewPoint.zoom;
  return {
    x: (getRandomInt(500, 800) - viewPoint.x) * zoom,
    y: (getRandomInt(100, 200) - viewPoint.y) * zoom,
  };
}

export const capitalizeFirstLetter = (string: string): string => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const checkNameConventions = (string: string): boolean => {
  const regex = /^[a-zA-Z0-9_-]+$/;
  return regex.test(string);
};

export function isValidURL(str: string): boolean {
  const pattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
  return pattern.test(str);
}

// ==================== 输入数据验证 ====================
function validateInputName(
  data: WorkflowInput[],
  nameCount: Record<string, number>
): boolean {
  let passFlag = true;

  data.forEach(item => {
    if (!item?.name?.trim()) {
      item.nameErrMsg = i18next.t(
        'workflow.nodes.validation.valueCannotBeEmpty'
      );
      passFlag = false;
    } else if (!checkNameConventions(item.name)) {
      item.nameErrMsg = i18next.t(
        'workflow.nodes.validation.canOnlyContainLettersNumbersHyphensOrUnderscores'
      );
      passFlag = false;
    } else {
      item.nameErrMsg = '';
    }
    nameCount[item.name] = (nameCount[item.name] || 0) + 1;
  });

  return passFlag;
}

function validateInputContent(
  data: WorkflowInput[],
  noNeedCheckIds: string[]
): boolean {
  let passFlag = true;

  data.forEach(item => {
    if (noNeedCheckIds.includes(item?.id)) {
      item.nameErrMsg = '';
      item.schema.value.contentErrMsg = '';
      return;
    }

    const { type, content } = item.schema.value;

    if (
      (type === 'ref' && !content.name) ||
      (type === 'literal' &&
        (Array.isArray(content) ? content.length === 0 : !content.trim()))
    ) {
      item.schema.value.contentErrMsg = i18next.t(
        'workflow.nodes.validation.valueCannotBeEmpty'
      );
      passFlag = false;
    } else if (
      item.customParameterType === 'image_understanding' &&
      type === 'literal' &&
      (typeof content !== 'string' || !isValidURL(content))
    ) {
      item.schema.value.contentErrMsg = i18next.t(
        'workflow.nodes.validation.pleaseEnterValidURL'
      );
      passFlag = false;
    } else {
      item.schema.value.contentErrMsg = '';
    }
  });

  return passFlag;
}

export const checkedNodeInputData = (
  data: WorkflowInput[],
  currentCheckNode: WorkflowNode
): boolean => {
  let passFlag = true;
  const nameCount: Record<string, number> = {};

  // 验证名称
  passFlag = validateInputName(data, nameCount);

  // 检查重复名称
  data.forEach(item => {
    if ((nameCount[item.name] ?? 0) > 1 && !item.nameErrMsg) {
      item.nameErrMsg = i18next.t(
        'workflow.nodes.validation.valueCannotBeRepeated'
      );
      passFlag = false;
    }

    if (
      currentCheckNode?.data?.nodeParam?.enableChatHistoryV2?.isEnabled &&
      item?.name === 'history' &&
      !item.nameErrMsg
    ) {
      item.nameErrMsg = i18next.t(
        'workflow.nodes.validation.valueCannotBeRepeated'
      );
      passFlag = false;
    }
  });

  // 获取不需要检查的输入ID
  const noNeedCheckIfElseInputs =
    currentCheckNode?.data?.nodeParam?.cases?.flatMap(item =>
      item.conditions
        ?.filter(condition =>
          ['not_null', 'null', 'empty', 'not_empty', 'not null'].includes(
            condition?.compareOperator || condition?.selectCondition || ''
          )
        )
        ?.map(condition => condition?.rightVarIndex || condition?.varIndex)
    ) || [];

  const noNeedCheckToolInputs =
    currentCheckNode?.nodeType === 'plugin' ||
    currentCheckNode?.nodeType === 'flow'
      ? currentCheckNode?.data?.inputs
          ?.filter(input => !input?.required || input?.disabled)
          ?.map(input => input?.id)
      : [];

  const noNeedCheckIds = [
    ...noNeedCheckIfElseInputs,
    ...noNeedCheckToolInputs,
  ].filter((id): id is string => typeof id === 'string');

  // 验证内容
  passFlag = validateInputContent(data, noNeedCheckIds) && passFlag;

  return passFlag;
};

export const checkedNodeRepeatedInputData = (
  inputs: WorkflowInput[],
  variableNodes: WorkflowNode[]
): boolean => {
  let passFlag = true;
  const variableNodesName = variableNodes
    .flatMap(item => item?.data?.inputs)
    .map(item => item.name);

  inputs.forEach(input => {
    if (variableNodesName?.includes(input.name)) {
      input.schema.value.contentErrMsg = i18next.t(
        'workflow.nodes.validation.variableMemoryNamingConflict'
      );
      passFlag = false;
    } else {
      input.schema.value.contentErrMsg = '';
    }
  });

  return passFlag;
};

// ==================== 输出数据验证 ====================
function validateProperties<Property extends ParameterProperty>(
  items: Property[],
  parentPath = '',
  parentType = ''
): { validatedItems: Property[]; flag: boolean } {
  let flag = true;
  const nameCount: Record<string, number> = {};

  const newItems = items
    .filter(item => item.name || item?.schema?.type || item?.type)
    .map(item => {
      if (!item?.name?.trim()) {
        item.nameErrMsg = i18next.t(
          'workflow.nodes.validation.valueCannotBeEmpty'
        );
        flag = false;
      } else if (!checkNameConventions(item.name)) {
        item.nameErrMsg = i18next.t(
          'workflow.nodes.validation.canOnlyContainLettersNumbersOrUnderscores'
        );
        flag = false;
      } else {
        item.nameErrMsg = '';
      }
      nameCount[item.name] = (nameCount[item.name] || 0) + 1;
      return item;
    });

  newItems.forEach(item => {
    if ((nameCount[item.name] ?? 0) > 1 && !item.nameErrMsg) {
      item.nameErrMsg = i18next.t(
        'workflow.nodes.validation.valueCannotBeRepeated'
      );
      flag = false;
    }
  });

  const validatedItems = newItems.map(item => {
    if (item.schema && Array.isArray(item.schema.properties)) {
      const result = validateProperties(
        item.schema.properties,
        parentPath,
        parentType
      );
      item.schema.properties = result.validatedItems;
      flag = flag && result.flag;
    }

    if (Array.isArray(item.properties)) {
      const result = validateProperties(
        item.properties,
        parentPath,
        parentType
      );
      item.properties = result.validatedItems;
      flag = flag && result.flag;
    }
    return item;
  });

  return { validatedItems, flag };
}

export const checkedNodeOutputData = (
  data: WorkflowOutput[],
  currentCheckNode: WorkflowNode
): boolean => {
  let passFlag = true;

  if (currentCheckNode?.nodeType !== 'plugin') {
    const validateData = validateProperties(data);
    data = validateData.validatedItems;
    passFlag = validateData.flag;
  }

  if (
    currentCheckNode?.nodeType === 'extractor-parameter' ||
    (currentCheckNode?.nodeType === 'question-answer' &&
      currentCheckNode?.data?.nodeParam?.answerType === 'direct' &&
      currentCheckNode?.data?.nodeParam?.directAnswer?.handleResponse)
  ) {
    data.forEach(item => {
      if (!item?.schema?.description?.trim() && !item?.schema?.default) {
        item.schema.descriptionErrMsg = i18next.t(
          'workflow.nodes.validation.valueCannotBeEmpty'
        );
        passFlag = false;
      } else {
        item.schema.descriptionErrMsg = '';
      }
    });
  }

  return passFlag;
};

// ==================== 节点参数验证 ====================
function validateTemplateParams(currentCheckNode: WorkflowNode): boolean {
  if (
    !['spark-llm', 'message'].includes(currentCheckNode?.nodeType) &&
    !(
      currentCheckNode?.nodeType === 'node-end' &&
      currentCheckNode?.data?.nodeParam?.outputMode === 1
    )
  ) {
    return true;
  }

  if (!currentCheckNode?.data.nodeParam.template?.trim()) {
    currentCheckNode.data.nodeParam.templateErrMsg = i18next.t(
      'workflow.nodes.validation.valueCannotBeEmpty'
    );
    return false;
  }

  currentCheckNode.data.nodeParam.templateErrMsg = '';
  return true;
}

function validateQuestionAnswerParams(currentCheckNode: WorkflowNode): boolean {
  if (currentCheckNode?.nodeType !== 'question-answer') {
    return true;
  }

  if (!currentCheckNode?.data.nodeParam.question?.trim()) {
    currentCheckNode.data.nodeParam.questionErrMsg = i18next.t(
      'workflow.nodes.validation.valueCannotBeEmpty'
    );
    return false;
  }

  currentCheckNode.data.nodeParam.questionErrMsg = '';
  return true;
}

function validateDecisionMakingParams(currentCheckNode: WorkflowNode): boolean {
  if (currentCheckNode?.nodeType !== 'decision-making') {
    return true;
  }

  let passFlag = true;

  (currentCheckNode.data.nodeParam.intentChains ?? []).forEach(chain => {
    if (!chain?.name?.trim()) {
      chain.nameErrMsg = i18next.t(
        'workflow.nodes.validation.valueCannotBeEmpty'
      );
      passFlag = false;
    } else {
      chain.nameErrMsg = '';
    }

    if (!chain?.description?.trim()) {
      chain.descriptionErrMsg = i18next.t(
        'workflow.nodes.validation.valueCannotBeEmpty'
      );
      passFlag = false;
    } else {
      chain.descriptionErrMsg = '';
    }
  });

  return (
    passFlag &&
    (currentCheckNode.data.nodeParam.intentChains ?? []).every(
      chain => chain?.name?.trim() && chain?.description?.trim()
    )
  );
}

function validateKnowledgeBaseParams(currentCheckNode: WorkflowNode): boolean {
  if (currentCheckNode?.nodeType === 'knowledge-base') {
    if (currentCheckNode.data.nodeParam?.repoId?.length === 0) {
      currentCheckNode.data.nodeParam.repoIdErrMsg = i18next.t(
        'workflow.nodes.validation.knowledgeCannotBeEmpty'
      );
      return false;
    }
    currentCheckNode.data.nodeParam.repoIdErrMsg = '';
  }

  if (currentCheckNode?.nodeType === 'knowledge-pro-base') {
    if (currentCheckNode.data.nodeParam?.repoIds?.length === 0) {
      currentCheckNode.data.nodeParam.repoIdErrMsg = i18next.t(
        'workflow.nodes.validation.knowledgeCannotBeEmpty'
      );
      return false;
    }
    currentCheckNode.data.nodeParam.repoIdErrMsg = '';
  }

  return true;
}

function validateIflyCodeParams(currentCheckNode: WorkflowNode): boolean {
  if (currentCheckNode?.nodeType !== 'ifly-code') {
    return true;
  }

  if (!currentCheckNode.data.nodeParam?.code) {
    currentCheckNode.data.nodeParam.codeErrMsg = i18next.t(
      'workflow.nodes.validation.codeCannotBeEmpty'
    );
    return false;
  }

  currentCheckNode.data.nodeParam.codeErrMsg = '';
  return true;
}

function validateIfElseParams(currentCheckNode: WorkflowNode): boolean {
  if (currentCheckNode?.nodeType !== 'if-else') {
    return true;
  }

  let passFlag = true;

  (currentCheckNode.data.nodeParam.cases ?? []).forEach(item => {
    item.conditions.forEach(condition => {
      if (!condition.compareOperator) {
        passFlag = false;
        condition.compareOperatorErrMsg = i18next.t(
          'workflow.nodes.validation.valueCannotBeEmpty'
        );
      } else {
        condition.compareOperatorErrMsg = '';
      }
    });
  });

  return passFlag;
}

function validateLoopParams(currentCheckNode: WorkflowNode): boolean {
  if (currentCheckNode?.nodeType !== 'loop') {
    return true;
  }

  let passFlag = true;
  const nodeParam = currentCheckNode.data.nodeParam;
  const maxLoopCount = Number(nodeParam?.maxLoopCount ?? 10);
  if (
    !Number.isInteger(maxLoopCount) ||
    maxLoopCount < 1 ||
    maxLoopCount > 100
  ) {
    nodeParam.maxLoopCountErrMsg = i18next.t(
      'workflow.nodes.validation.valueCannotBeEmpty'
    );
    passFlag = false;
  } else {
    nodeParam.maxLoopCountErrMsg = '';
  }

  if (!nodeParam?.loopVariables?.length) {
    passFlag = false;
  }

  nodeParam?.termination?.conditions?.forEach(condition => {
    if (!condition.compareOperator) {
      condition.compareOperatorErrMsg = i18next.t(
        'workflow.nodes.validation.valueCannotBeEmpty'
      );
      passFlag = false;
    } else {
      condition.compareOperatorErrMsg = '';
    }
  });

  return passFlag;
}

function validateTextJoinerParams(currentCheckNode: WorkflowNode): boolean {
  if (currentCheckNode?.nodeType !== 'text-joiner') {
    return true;
  }

  if (
    currentCheckNode?.data?.nodeParam?.mode === 1 &&
    !currentCheckNode?.data?.nodeParam?.separator
  ) {
    currentCheckNode.data.nodeParam.separatorErrMsg = i18next.t(
      'workflow.nodes.validation.separatorCannotBeEmpty'
    );
    return false;
  }

  currentCheckNode.data.nodeParam.separatorErrMsg = '';
  return true;
}

function validateAgentParams(currentCheckNode: WorkflowNode): boolean {
  if (currentCheckNode?.nodeType !== 'agent') {
    return true;
  }

  currentCheckNode.data.nodeParam.instruction ??= {};
  if (!currentCheckNode.data.nodeParam.instruction.query?.trim()) {
    currentCheckNode.data.nodeParam.instruction.queryErrMsg = i18next.t(
      'workflow.nodes.validation.valueCannotBeEmpty'
    );
    return false;
  }

  currentCheckNode.data.nodeParam.instruction.queryErrMsg = '';

  return Boolean(
    currentCheckNode?.data.nodeParam.instruction?.query?.trim() &&
      currentCheckNode?.data.nodeParam?.plugin?.mcpServerUrls?.every(
        (item: string) => !item?.trim() || isValidURL(item)
      )
  );
}

function validateQuestionAnswerOptions(
  currentCheckNode: WorkflowNode
): boolean {
  if (
    currentCheckNode?.nodeType !== 'question-answer' ||
    currentCheckNode.data.nodeParam?.answerType !== 'option'
  ) {
    return true;
  }

  let passFlag = true;

  currentCheckNode.data.nodeParam.optionAnswer
    ?.filter(item => item?.type === 2)
    .forEach(item => {
      if (!item?.content) {
        passFlag = false;
        item.contentErrMsg = i18next.t(
          'workflow.nodes.validation.valueCannotBeEmpty'
        );
      } else if (
        item?.['content_type'] === 'image' &&
        !isValidURL(item?.content)
      ) {
        passFlag = false;
        item.contentErrMsg = i18next.t(
          'workflow.nodes.validation.pleaseEnterValidURL'
        );
      } else {
        item.contentErrMsg = '';
      }
    });

  return passFlag;
}

function validateDbId(nodeParam: WorkflowNodeParameters): boolean {
  if (!nodeParam?.dbId) {
    nodeParam.dbErrMsg = i18next.t(
      'workflow.nodes.databaseNode.valueCannotBeEmpty'
    );
    return false;
  }
  nodeParam.dbErrMsg = '';
  return true;
}

function validateTableName(nodeParam: WorkflowNodeParameters): boolean {
  if (!nodeParam?.tableName) {
    nodeParam.tableNameErrMsg = i18next.t(
      'workflow.nodes.databaseNode.valueCannotBeEmpty'
    );
    return false;
  }
  nodeParam.tableNameErrMsg = '';
  return true;
}

function validateAssignmentList(nodeParam: WorkflowNodeParameters): boolean {
  if (!nodeParam?.assignmentList?.length) {
    nodeParam.fieldNameErrMsg = i18next.t(
      'workflow.nodes.databaseNode.valueCannotBeEmpty'
    );
    return false;
  }
  nodeParam.fieldNameErrMsg = '';
  return true;
}

function validateCases(nodeParam: WorkflowNodeParameters): boolean {
  let pass = true;
  nodeParam.cases?.forEach(item => {
    item.conditions?.forEach(condition => {
      if (!condition.selectCondition) {
        condition.compareOperatorErrMsg = i18next.t(
          'workflow.nodes.databaseNode.valueCannotBeEmpty'
        );
        pass = false;
      } else {
        condition.compareOperatorErrMsg = '';
      }

      if (!condition.fieldName) {
        condition.fieldErrMsg = i18next.t(
          'workflow.nodes.databaseNode.valueCannotBeEmpty'
        );
        pass = false;
      } else {
        condition.fieldErrMsg = '';
      }
    });
  });
  return pass;
}

function validateSql(nodeParam: WorkflowNodeParameters): boolean {
  if (!nodeParam?.sql?.trim()) {
    nodeParam.sqlErrMsg = i18next.t(
      'workflow.nodes.databaseNode.valueCannotBeEmpty'
    );
    return false;
  }
  nodeParam.sqlErrMsg = '';
  return true;
}

export function validateDatabaseParams(
  currentCheckNode: WorkflowNode
): boolean {
  if (currentCheckNode?.nodeType !== 'database') return true;

  const nodeParam = currentCheckNode.data.nodeParam;
  let passFlag = true;

  passFlag = validateDbId(nodeParam) && passFlag;

  if (nodeParam?.mode !== 0) {
    passFlag = validateTableName(nodeParam) && passFlag;

    if ((nodeParam.mode ?? 0) > 1) {
      if (nodeParam?.mode === 2) {
        passFlag = validateAssignmentList(nodeParam) && passFlag;
      }
      passFlag = validateCases(nodeParam) && passFlag;
    }
  } else {
    passFlag = validateSql(nodeParam) && passFlag;
  }

  return passFlag;
}

function validateServiceIdParams(currentCheckNode: WorkflowNode): boolean {
  const nodeTypesRequiringServiceId = [
    'spark-llm',
    'knowledge-pro-base',
    'question-answer',
    'decision-making',
    'agent',
    'extractor-parameter',
  ];

  if (!nodeTypesRequiringServiceId.includes(currentCheckNode?.nodeType)) {
    return true;
  }

  if (!currentCheckNode?.data?.nodeParam?.serviceId) {
    currentCheckNode.data.nodeParam.llmIdErrMsg = i18next.t(
      'workflow.nodes.databaseNode.modelCannotBeEmpty'
    );
    return false;
  }

  currentCheckNode.data.nodeParam.llmIdErrMsg = '';
  return true;
}

function validateRetryConfig(currentCheckNode: WorkflowNode): boolean {
  if (!currentCheckNode?.data?.retryConfig?.shouldRetry) {
    return true;
  }
  if (currentCheckNode?.data?.retryConfig?.errorStrategy !== 1) {
    return true;
  }

  if (!currentCheckNode?.data?.retryConfig?.customOutput) {
    currentCheckNode.data.nodeParam.setAnswerContentErrMsg = '值不能为空';
    return false;
  }

  if (!isJSON(currentCheckNode?.data?.retryConfig?.customOutput)) {
    currentCheckNode.data.nodeParam.setAnswerContentErrMsg = '无效的JSON格式';
    return false;
  }

  return true;
}

export const checkedNodeParams = (currentCheckNode: WorkflowNode): boolean => {
  const validations = [
    validateTemplateParams,
    validateQuestionAnswerParams,
    validateDecisionMakingParams,
    validateKnowledgeBaseParams,
    validateIflyCodeParams,
    validateIfElseParams,
    validateLoopParams,
    validateTextJoinerParams,
    validateAgentParams,
    validateQuestionAnswerOptions,
    validateDatabaseParams,
    validateServiceIdParams,
    validateRetryConfig,
    validateVariableAggregationNode,
  ];

  return validations.every(validation => validation(currentCheckNode));
};

// ==================== 节点操作函数 ====================
export function getNextName(
  arr: { data: { label?: string } }[],
  prefix: string
): string {
  const regex = new RegExp(`^${prefix}_(\\d+)$`);
  const numbers = arr
    .map(item => item?.data?.label)
    .map(name => {
      const match = name?.match(regex);
      return match ? parseInt(match[1] ?? '', 10) : null;
    })
    .filter((number): number is number => number !== null);

  if (numbers.length === 0) {
    return `${prefix}_1`;
  }

  const maxNumber = Math.max(...numbers);
  for (let i = 1; i <= maxNumber; i++) {
    if (!numbers.includes(i)) {
      return `${prefix}_${i}`;
    }
  }

  return `${prefix}_${maxNumber + 1}`;
}

export function findChildrenNodes(
  startNodeId: string,
  edges: EdgeType[]
): string[] {
  const visited = new Set<string>();
  const stack = [startNodeId];
  const result: string[] = [];

  while (stack.length > 0) {
    const currentNodeId = stack.pop() || '';
    if (!visited.has(currentNodeId)) {
      visited.add(currentNodeId);
      if (currentNodeId !== startNodeId) {
        result.push(currentNodeId);
      }

      edges.forEach(edge => {
        if (edge.source === currentNodeId && !visited.has(edge.target)) {
          stack.push(edge.target);
        }
      });
    }
  }

  return result;
}

export function findParentNodes(
  startNodeId: string,
  edges: EdgeType[]
): string[] {
  const visited = new Set<string>();
  const stack = [startNodeId];
  const result: string[] = [];

  while (stack.length > 0) {
    const currentNodeId = stack.pop() || '';
    if (!visited.has(currentNodeId)) {
      visited.add(currentNodeId);
      if (currentNodeId !== startNodeId) {
        result.push(currentNodeId);
      }

      edges.forEach(edge => {
        if (edge.target === currentNodeId && !visited.has(edge.source)) {
          stack.push(edge.source);
        }
      });
    }
  }

  return result;
}

/**
 * 给数组的每一项（以及嵌套的 schema.properties）递归设置 id
 * @param {Array} arr - 原始数组
 * @returns {Array} 新数组（id 已填充）
 */
const assignUUIDs = <Property extends ParameterProperty>(
  arr: Property[]
): Property[] => {
  return arr.map(item => {
    const newItem = { ...item, id: uuid() };

    // 如果 schema 内有 properties，递归处理
    if (
      newItem.schema?.properties &&
      Array.isArray(newItem.schema.properties)
    ) {
      newItem.schema = {
        ...newItem.schema,
        properties: assignUUIDs(newItem.schema.properties),
      };
    }

    return newItem;
  });
};

export const copyNodeData = (data: WorkflowNodeData): WorkflowNodeData => {
  const newData = cloneDeep(data);

  newData.inputs = newData.inputs.map(item => ({
    ...item,
    id: uuid(),
  }));
  newData.outputs = assignUUIDs(newData.outputs);

  if (newData?.nodeParam?.intentChains) {
    newData.nodeParam.intentChains = newData.nodeParam.intentChains.map(
      item => ({
        ...item,
        id: `intent-one-of::${uuid()}`,
      })
    );
  }

  if (newData?.nodeParam?.optionAnswer) {
    newData.nodeParam.optionAnswer = newData.nodeParam.optionAnswer.map(
      item => ({
        ...item,
        id: `option-one-of::${uuid()}`,
      })
    );
  }

  if (newData?.nodeParam?.cases) {
    newData.nodeParam.cases = newData.nodeParam.cases.map(item => ({
      ...item,
      id: `branch_one_of::${uuid()}`,
    }));

    const firstCondition = newData.nodeParam.cases[0]?.conditions[0];
    const [leftInput, rightInput] = newData.inputs;
    if (firstCondition && leftInput && rightInput) {
      firstCondition.leftVarIndex = leftInput.id;
      firstCondition.rightVarIndex = rightInput.id;
    }
  }

  return newData;
};

export function findItemById(
  dataArray: ParameterProperty[],
  id: string
): ParameterProperty | null {
  for (const item of dataArray) {
    if (item.id === id) {
      return item;
    }

    const properties = item.schema?.properties || item.properties;

    if (properties) {
      const found = findItemById(properties, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export function renderType(params: {
  fileType?: string;
  type?: string;
  schema?: { type?: string };
}): string {
  if (params.fileType && params?.type === 'array-string') {
    return `Array<${
      (params?.fileType?.slice(0, 1).toUpperCase() || '') +
      (params?.fileType?.slice(1) || '')
    }>`;
  }
  if (params.fileType && params?.type === 'string') {
    return (
      (params?.fileType?.slice(0, 1).toUpperCase() || '') +
      (params?.fileType?.slice(1) || '')
    );
  }
  const type = params?.type || params?.schema?.type || '';
  if (type?.includes('array') && type?.split('-')?.[1]) {
    const baseType = type.split('-')[1] ?? '';
    const capitalized = baseType.charAt(0).toUpperCase() + baseType.slice(1);
    return `Array<${capitalized}>`;
  }
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function isBaseType(type: string): boolean {
  const baseTypes = [
    'string',
    'integer',
    'boolean',
    'number',
    'array-string',
    'array-integer',
    'array-boolean',
    'array-number',
    'array-object',
    'array-array',
    'image',
    'pdf',
  ];
  return baseTypes.includes(type);
}

// ==================== 知识库相关函数 ====================
export function generateKnowledgeOutput(type: string): WorkflowOutput[] {
  const commonResult: WorkflowOutput = {
    id: uuid(),
    name: 'results',
    schema: {
      type: 'array-object',
      properties: [],
    },
    required: true,
    nameErrMsg: '',
  };

  if (type === 'SparkDesk-RAG') {
    commonResult.schema.properties = [
      createProperty('score', 'number'),
      createProperty('index', 'number'),
      createProperty('type', 'string'),
      createProperty('content', 'string'),
      createProperty('fileType', 'string'),
      createProperty('fileId', 'string'),
    ];
  } else if (type === 'CBG-RAG') {
    commonResult.schema.properties = [
      createProperty('score', 'number'),
      createProperty('docId', 'string'),
      createProperty('content', 'string'),
      createProperty('references', 'object'),
    ];
  } else {
    commonResult.schema.properties = [
      createProperty('score', 'number'),
      createProperty('docId', 'string'),
      createProperty('title', 'string'),
      createProperty('content', 'string'),
      createProperty('context', 'string'),
      createProperty('references', 'object'),
    ];
  }

  return [commonResult];
}

function createProperty(name: string, type: string): ParameterProperty {
  return {
    id: uuid(),
    name,
    type,
    default: '',
    required: true,
    nameErrMsg: '',
  };
}

// ==================== 版本检查函数 ====================
export function isOldVersionFlow(inputTime: string): boolean {
  const fixedTime = new Date('2025-03-14T06:00:00.000+00:00');
  const inputDate = new Date(inputTime);
  return inputDate < fixedTime;
}

export function hasDecisionMakingNode(nodes: WorkflowNode[]): boolean {
  return nodes?.some(
    node =>
      node?.id?.startsWith('decision-making') &&
      node?.data?.nodeParam?.reasonMode !== 1
  );
}

export const handleReplaceNodeId = <T>(
  childNodes: T[],
  replacements: Record<string, string>
): T[] => {
  const childNodesString = JSON.stringify(childNodes);
  return JSON.parse(
    childNodesString.replace(
      new RegExp(Object.keys(replacements).join('|'), 'g'),
      match => replacements[match] ?? match
    )
  );
};

export const isRefKnowledgeBase = (input: WorkflowInput): boolean => {
  return (
    input.schema.type !== 'array-object' &&
    input.schema.value.type === 'ref' &&
    Boolean(input.schema.value.content.nodeId?.startsWith('knowledge-base'))
  );
};

// ==================== JSON 验证函数 ====================
export const validateInputJSON = (
  newValue: string,
  schema: AnySchema
): string => {
  try {
    const ajv = new Ajv();
    const jsonData = JSON.parse(newValue);
    const validate = ajv.compile(schema);
    const valid = validate(jsonData);

    if (!valid) {
      const firstError = validate?.errors?.[0];
      const path = firstError?.instancePath
        ? firstError.instancePath.slice(1)
        : '';
      const msg = firstError?.message ?? '';
      return `${path} ${msg}`.trim();
    }
    return '';
  } catch {
    return 'Invalid JSON format';
  }
};

export const generateDefaultInput = (
  type: string
): string | number | boolean => {
  switch (type) {
    case 'boolean':
      return false;
    case 'number':
    case 'integer':
      return 0;
    case 'string':
      return '';
    default:
      return '';
  }
};

// ==================== Schema 生成函数 ====================
interface ValidationSchema {
  type?: string;
  items?: ValidationSchema;
  properties?: Record<string, ValidationSchema>;
  required?: string[];
}

function generateSchemaForNode(
  node: Pick<ParameterProperty, 'type' | 'properties'>
): ValidationSchema {
  if (node.type === 'object' || node.type === 'array-object') {
    const properties: Record<string, ValidationSchema> = {};
    const required: string[] = [];
    node.properties?.forEach(property => {
      properties[property.name] = generateSchemaForNode(property);
      if (property.required) required.push(property.name);
    });
    const objectSchema: ValidationSchema = { type: 'object', properties };
    if (required.length > 0) objectSchema.required = required;
    return node.type === 'array-object'
      ? { type: 'array', items: objectSchema }
      : objectSchema;
  }
  if (
    ['array-integer', 'array-boolean', 'array-string', 'array-number'].includes(
      node.type ?? ''
    )
  ) {
    return {
      type: 'array',
      items: { type: node.type?.slice('array-'.length) },
    };
  }
  return { type: node.type };
}

export const generateValidationSchema = (
  data: ParameterProperty
): ValidationSchema => {
  return generateSchemaForNode(data.schema ?? data);
};

export const generateUploadType = (type: string): string[] => {
  const typeMap: Record<string, string[]> = {
    image: ['jpg', 'png', 'bmp', 'jpeg'],
    pdf: ['pdf'],
    doc: ['docx', 'doc'],
    ppt: ['ppt', 'pptx'],
    excel: ['xls', 'xlsx', 'csv'],
    txt: ['txt'],
    audio: ['wav', 'mp3', 'flac', 'm4a', 'aac', 'ogg', 'wma', 'midi'],
    video: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'],
    subtitle: ['srt', 'vtt', 'ass', 'ssa'],
  };

  return typeMap[type] || [];
};

// ==================== 工具函数 ====================
const handleParmasOrder = (
  source: { name: string }[],
  target: Record<string, unknown>
): Record<string, unknown> => {
  const ordered: Record<string, unknown> = {};
  const sourceKeys = source?.map(item => item?.name) || [];

  Object.keys(target).forEach(key => {
    if (!sourceKeys.includes(key)) {
      ordered[key] = target[key];
    }
  });

  source?.forEach(item => {
    const key = item.name;
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      ordered[key] = target[key];
    }
  });

  return ordered;
};

export const generateInputsAndOutputsOrder = (
  currentNode: WorkflowNode,
  target: Record<string, unknown>,
  key: 'inputs' | 'outputs'
): Record<string, unknown> => {
  let source: WorkflowOutput[] = [];

  if (currentNode?.id?.startsWith('node-end')) {
    source = currentNode?.data?.inputs || [];
  } else if (currentNode?.id?.startsWith('node-start')) {
    source = currentNode?.data?.outputs || [];
  } else {
    source = currentNode?.data?.[key] || [];
  }

  return handleParmasOrder(source, target);
};

// ==================== 树节点过滤函数 ====================
export function filterTreeNodes(
  nodes: ToolParameterNode[]
): ToolParameterNode[] {
  if (!Array.isArray(nodes)) {
    return [];
  }

  return nodes
    .map(node => {
      if (node.open === false) {
        return null;
      }

      const newNode = { ...node };

      if (node.children && Array.isArray(node.children)) {
        newNode.children = filterTreeNodes(node.children);
      }

      return newNode;
    })
    .filter(node => node !== null);
}

// ==================== 对象生成和合并函数 ====================
export function generateOrUpdateObject(
  schemaList: ParameterProperty[],
  oldObj: unknown = null
): unknown {
  const newObj = generateDefaultObject(schemaList);
  return oldObj ? mergeByStructure(newObj, oldObj) : newObj;
}

function generateDefaultObject(
  schemaList: ParameterProperty[]
): Record<string, unknown> {
  const defaultValues: Record<string, unknown> = {};

  schemaList.forEach(item => {
    defaultValues[item.name] = getDefaultValueForType(
      item?.type || item?.schema?.type,
      item.schema
    );
  });

  return defaultValues;
}

function mergeByStructure(newObj: unknown, oldObj: unknown): unknown {
  if (isObject(newObj)) {
    return mergeObjectsByStructure(newObj, isObject(oldObj) ? oldObj : {});
  }

  if (Array.isArray(newObj)) {
    return Array.isArray(oldObj)
      ? mergeArraysByStructure(newObj, oldObj)
      : newObj;
  }

  return oldObj !== undefined ? oldObj : newObj;
}

function mergeObjectsByStructure(
  newObj: Record<string, unknown>,
  oldObj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const newKeys = Object.keys(newObj);
  const oldKeys = Object.keys(oldObj);

  newKeys.forEach((newKey, index) => {
    const oldKey = oldKeys[index];

    if (oldKey !== undefined) {
      result[newKey] = mergeByStructure(newObj[newKey], oldObj[oldKey]);
    } else {
      result[newKey] = newObj[newKey];
    }
  });

  return result;
}

function mergeArraysByStructure(
  newObj: unknown[],
  oldObj: unknown[]
): unknown[] {
  return oldObj.map(item => mergeByStructure(newObj[0], item));
}

function getDefaultValueForType(
  type: string | undefined,
  schema: Pick<ParameterSchema, 'properties'> | undefined
): unknown {
  const typeHandlers: Record<string, () => unknown> = {
    string: () => '',
    integer: () => 0,
    boolean: () => false,
    number: () => 0,
    'array-string': () => [],
    'array-integer': () => [],
    'array-boolean': () => [],
    'array-number': () => [],
    object: () => handleObjectSchema(schema),
    'array-object': () => handleArrayObjectSchema(schema),
  };
  return type ? typeHandlers[type]?.() : undefined;
}

function handleObjectSchema(
  schema: Pick<ParameterSchema, 'properties'> | undefined
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  (schema?.properties || []).forEach(prop => {
    obj[prop.name] = getDefaultValueForType(
      prop.type || prop.schema?.type,
      prop
    );
  });

  return obj;
}

function handleArrayObjectSchema(
  schema: Pick<ParameterSchema, 'properties'> | undefined
): unknown[] {
  return schema?.properties?.length
    ? [handleObjectSchema({ properties: schema.properties })]
    : [];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// ==================== 路径查找函数 ====================
export function findPathById(
  schemaList: ParameterProperty[],
  targetId: string,
  currentPath: string[] = []
): string[] | null {
  for (const item of schemaList) {
    if (item.id === targetId) {
      return [...currentPath, item.name];
    }

    const properties = item.schema?.properties || item?.properties;
    if (properties) {
      const nestedPath = findPathById(properties, targetId, [
        ...currentPath,
        item.name,
      ]);
      if (nestedPath) return nestedPath;
    }
  }

  return null;
}

// ==================== 字段删除函数 ====================
export function deleteFieldByPath(obj: unknown, path: string[]): unknown {
  if (path.length === 0) return isObject(obj) ? { ...obj } : obj;
  const newObj: unknown = JSON.parse(JSON.stringify(obj));
  let current: unknown = newObj;
  for (const key of path.slice(0, -1)) {
    if (isObject(current) && current[key]) {
      current = current[key];
    } else {
      const first: unknown = Array.isArray(current) ? current[0] : undefined;
      if (!isObject(first) || !first[key]) return obj;
      current = first[key];
    }
  }
  const lastKey = path[path.length - 1];
  if (lastKey === undefined) return newObj;
  if (
    isObject(current) &&
    Object.prototype.hasOwnProperty.call(current, lastKey)
  ) {
    delete current[lastKey];
  } else {
    const first: unknown = Array.isArray(current) ? current[0] : undefined;
    if (
      isObject(first) &&
      Object.prototype.hasOwnProperty.call(first, lastKey)
    ) {
      delete first[lastKey];
    }
  }
  return newObj;
}

export const handleModifyToolUrlParams = (
  toolUrlParams: ToolParameterNode[]
): WorkflowInput[] => {
  return toolUrlParams
    ?.filter(item => item?.open !== false)
    ?.map(item => ({
      id: uuid(),
      name: item.name,
      type: item.type,
      disabled: false,
      required: item?.required,
      description: item?.description,
      schema: {
        type:
          item?.type === 'array'
            ? `array-${item?.children?.[0]?.type}`
            : item?.type,
        value: {
          type: 'ref',
          content: {},
        },
      },
    }));
};

// ==================== 树遍历函数 ====================
export const findFromTwoItems = (tree: ToolParameterNode[]): string[] => {
  const result: string[] = [];

  function traverse(node: ToolParameterNode): void {
    if (node.from === 1 && node?.fatherType !== 'array') {
      result.push(node.name);
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach(child => traverse(child));
    }
  }

  tree.forEach(node => traverse(node));
  return result;
};

// ==================== 树转换函数 ====================
function transformParameterSchema(item: ToolParameterNode): ParameterSchema {
  let type = item.type;
  let children = item.children;
  if (item.type === 'array') {
    const firstChild = children?.[0];
    type = `array-${firstChild?.type}`;
    children =
      firstChild?.type === 'object' ? firstChild.children || children : [];
  }
  const schema: ParameterSchema = { type };
  if (children) {
    schema.properties = children.flatMap(child => {
      if (child.open === false) return [];
      const childSchema = transformParameterSchema(child);
      return [{ id: child.id || uuid(), name: child.name, ...childSchema }];
    });
  }
  return schema;
}

export const transformTree = (
  inputArray: ToolParameterNode[]
): WorkflowOutput[] => {
  return inputArray.flatMap(item =>
    item.open === false
      ? []
      : [
          {
            id: item.id || uuid(),
            name: item.name,
            schema: transformParameterSchema(item),
          },
        ]
  );
};

function removeFromProperties(
  propertiesArray: ParameterProperty[],
  idToRemove: string
): ParameterProperty[] {
  return propertiesArray
    .map(property => {
      if (property.properties && Array.isArray(property.properties)) {
        return {
          ...property,
          properties: removeFromProperties(property.properties, idToRemove),
        };
      }
      return property;
    })
    .filter(property => property.id !== idToRemove);
}

export const removeItemById = (
  dataArray: WorkflowOutput[],
  idToRemove: string
): WorkflowOutput[] => {
  return dataArray
    .map(item => {
      if (item.schema && item.schema.properties) {
        return {
          ...item,
          schema: {
            ...item.schema,
            properties: removeFromProperties(
              item.schema.properties,
              idToRemove
            ),
          },
        };
      }
      return item;
    })
    .filter(item => item.id !== idToRemove);
};

// ==================== ID 提取函数 ====================
export const extractIdsWithNonEmptyProperties = (
  data: ParameterProperty[]
): string[] => {
  const ids: string[] = [];

  function extractFromItem(item: ParameterProperty): void {
    const hasSchemaProperties =
      item.schema &&
      Array.isArray(item.schema.properties) &&
      item.schema.properties.length > 0;

    const hasProperties =
      Array.isArray(item.properties) && item.properties.length > 0;

    if (hasSchemaProperties || hasProperties) {
      ids.push(item.id);

      if (hasSchemaProperties) {
        item.schema?.properties?.forEach(extractFromItem);
      }

      if (hasProperties) {
        item.properties?.forEach(extractFromItem);
      }
    }
  }

  data.forEach(extractFromItem);
  return ids;
};

type NodeType = Pick<WorkflowNode, 'id' | 'data' | 'nodeType'>;

type EdgeType = {
  source: string;
  target: string;
};

function buildSchemaReferences(
  schema: ParameterProperty,
  parent: { originId: string; prefix?: string; parentType?: string } = {
    originId: '',
  }
): WorkflowReference[] {
  if (!schema) return [];

  const baseValue = parent.prefix
    ? `${parent.prefix}.${schema.name}`
    : schema.name;

  // 基础类型
  if (!['object', 'array-object'].includes(schema.type ?? '')) {
    return [
      {
        originId: parent.originId,
        id: schema.id,
        label: schema.name,
        value: baseValue,
        type: schema.type || 'string',
        parentType: parent.parentType,
        fileType: schema.allowedFileType?.[0] || '',
      },
    ];
  }

  // object 节点（自身保留 + children）
  return [
    {
      originId: parent.originId,
      id: schema.id,
      label: schema.name,
      value: baseValue,
      type: schema?.type,
      parentType: parent.parentType,
      fileType: schema.allowedFileType?.[0] || '',
      children: Array.isArray(schema.properties)
        ? schema.properties.flatMap(prop =>
            buildSchemaReferences(
              {
                ...prop,
                ...prop.schema,
                name: prop.name,
                id: prop.id,
                allowedFileType: prop.allowedFileType,
              },
              {
                originId: parent.originId,
                prefix: baseValue,
                parentType: 'object',
              }
            )
          )
        : undefined,
    },
  ];
}

function buildOwnReferences(
  sourceNode: NodeType,
  targetNode: NodeType
): WorkflowReference[] {
  const errorOutputs =
    [1, 2].includes(sourceNode.data.retryConfig?.errorStrategy ?? 0) &&
    sourceNode?.data?.retryConfig?.shouldRetry
      ? errorOutputTemplate
      : [];

  const outputs =
    targetNode?.nodeType === 'iteration'
      ? sourceNode?.data?.outputs?.filter(output =>
          output?.schema?.type?.includes('array')
        )
      : [...(sourceNode?.data?.outputs || []), ...errorOutputs];

  return (
    outputs?.flatMap(output =>
      buildSchemaReferences(
        {
          ...output,
          ...output.schema,
          name: output.name,
          id: output.id,
          allowedFileType: output.allowedFileType,
        },
        { originId: sourceNode.id }
      )
    ) || []
  );
}

export function generateReferences(
  nodes: NodeType[],
  edges: EdgeType[],
  id: string
): WorkflowReference[] {
  const targetNode = nodes.find(n => n.id === id);
  if (!targetNode) return [];

  const visited = new Set<string>();
  const queue: string[] = [id];
  const ancestorIds = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    const incoming = edges.filter(e => e.target === current);
    for (const e of incoming) {
      const src = e.source;
      if (visited.has(src)) continue;
      visited.add(src);
      ancestorIds.add(src);
      queue.push(src);
    }
  }

  const result = Array.from(ancestorIds)
    .map(srcId => {
      const srcNode = nodes.find(n => n.id === srcId);
      if (!srcNode || srcNode?.data?.outputs?.length === 0) return null;
      const references = buildOwnReferences(srcNode, targetNode) || [];
      return {
        label: srcNode.data?.label ?? '',
        value: srcNode.id,
        parentNode: true,
        children: [
          {
            label: '',
            value: '',
            references,
          },
        ],
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return result;
}

export const convertToKBMB = (bytes: number): string => {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(1) + 'KB';
  } else {
    return bytes + 'B';
  }
};

const generateDefaultInputValue = (type: string): unknown => {
  if (type === 'string') {
    return '';
  } else if (type === 'number') {
    return 0;
  } else if (type === 'boolean') {
    return false;
  } else if (type === 'int' || type === 'integer') {
    return 0;
  } else if (type === 'array') {
    return '[]';
  } else if (type === 'object') {
    return '{}';
  }
  return undefined;
};

export const transformSchemaToArray = (schema: InputSchema): ToolArg[] => {
  const requiredFields = schema.required || [];
  return Object.entries(schema.properties).map(([name, property]) => {
    return {
      name,
      type: property.type,
      description: property.description,
      required: requiredFields.includes(name),
      enum: property.enum,
      value: property?.default || generateDefaultInputValue(property.type),
    };
  });
};
