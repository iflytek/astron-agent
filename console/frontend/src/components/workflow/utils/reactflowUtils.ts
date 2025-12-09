import { cloneDeep } from 'lodash';
import { v4 as uuid } from 'uuid';
import Ajv from 'ajv';
import i18next from 'i18next';
import { isJSON } from '@/utils';
import { InputSchema, ToolArg } from '@/types/plugin-store';

const errorOutputTemplate = [
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

  const keys = Object.keys(obj).sort();
  const keyValuePairs = keys.map(
    key => `"${key}":${customStringify(obj[key])}`
  );
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
    /([a-zA-Z]+-(llm|start|end|making|code|base|else|parameter|joiner)|plugin|message|iteration|variable)::[0-9a-fA-F-]{36}/g;
  return inputString.match(regex);
}

function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomPosition(viewPoint: unknown): {
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
  data: unknown[],
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
  data: unknown[],
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
      (type === 'literal' && !content?.trim())
    ) {
      item.schema.value.contentErrMsg = i18next.t(
        'workflow.nodes.validation.valueCannotBeEmpty'
      );
      passFlag = false;
    } else if (
      item.customParameterType === 'image_understanding' &&
      type === 'literal' &&
      !isValidURL(content)
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
  data: unknown[],
  currentCheckNode: unknown
): boolean => {
  let passFlag = true;
  const nameCount: Record<string, number> = {};

  // 验证名称
  passFlag = validateInputName(data, nameCount);

  // 检查重复名称
  data.forEach(item => {
    if (nameCount[item.name] > 1 && !item.nameErrMsg) {
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
            condition?.compareOperator || condition?.selectCondition
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

  const noNeedCheckIds = [...noNeedCheckIfElseInputs, ...noNeedCheckToolInputs];

  // 验证内容
  passFlag = validateInputContent(data, noNeedCheckIds) && passFlag;

  return passFlag;
};

export const checkedNodeRepeatedInputData = (
  inputs: unknown[],
  variableNodes: unknown[]
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
function validateProperties(
  items: unknown[],
  parentPath = '',
  parentType: string
): { validatedItems: unknown[]; flag: boolean } {
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
    if (nameCount[item.name] > 1 && !item.nameErrMsg) {
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
  data: unknown[],
  currentCheckNode: unknown
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
function validateTemplateParams(currentCheckNode: unknown): boolean {
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

function validateQuestionAnswerParams(currentCheckNode: unknown): boolean {
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

function validateDecisionMakingParams(currentCheckNode: unknown): boolean {
  if (currentCheckNode?.nodeType !== 'decision-making') {
    return true;
  }

  let passFlag = true;

  currentCheckNode.data.nodeParam.intentChains.forEach((chain: unknown) => {
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
    currentCheckNode.data.nodeParam.intentChains.every(
      (chain: unknown) => chain?.name?.trim() && chain?.description?.trim()
    )
  );
}

function validateKnowledgeBaseParams(currentCheckNode: unknown): boolean {
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

function validateIflyCodeParams(currentCheckNode: unknown): boolean {
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

function validateIfElseParams(currentCheckNode: unknown): boolean {
  if (currentCheckNode?.nodeType !== 'if-else') {
    return true;
  }

  let passFlag = true;

  currentCheckNode.data.nodeParam.cases.forEach((item: unknown) => {
    item.conditions.forEach((condition: unknown) => {
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

function validateTextJoinerParams(currentCheckNode: unknown): boolean {
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

function validateAgentParams(currentCheckNode: unknown): boolean {
  if (currentCheckNode?.nodeType !== 'agent') {
    return true;
  }

  if (!currentCheckNode?.data.nodeParam.instruction?.query?.trim()) {
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

function validateQuestionAnswerOptions(currentCheckNode: unknown): boolean {
  if (
    currentCheckNode?.nodeType !== 'question-answer' ||
    currentCheckNode.data.nodeParam?.answerType !== 'option'
  ) {
    return true;
  }

  let passFlag = true;

  currentCheckNode.data.nodeParam.optionAnswer
    ?.filter((item: unknown) => item?.type === 2)
    .forEach((item: unknown) => {
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

function validateDbId(nodeParam: unknown): boolean {
  if (!nodeParam?.dbId) {
    nodeParam.dbErrMsg = i18next.t(
      'workflow.nodes.databaseNode.valueCannotBeEmpty'
    );
    return false;
  }
  nodeParam.dbErrMsg = '';
  return true;
}

function validateTableName(nodeParam: unknown): boolean {
  if (!nodeParam?.tableName) {
    nodeParam.tableNameErrMsg = i18next.t(
      'workflow.nodes.databaseNode.valueCannotBeEmpty'
    );
    return false;
  }
  nodeParam.tableNameErrMsg = '';
  return true;
}

function validateAssignmentList(nodeParam: unknown): boolean {
  if (!nodeParam?.assignmentList?.length) {
    nodeParam.fieldNameErrMsg = i18next.t(
      'workflow.nodes.databaseNode.valueCannotBeEmpty'
    );
    return false;
  }
  nodeParam.fieldNameErrMsg = '';
  return true;
}

function validateCases(nodeParam: unknown): boolean {
  let pass = true;
  nodeParam.cases?.forEach((item: unknown) => {
    item.conditions?.forEach((condition: unknown) => {
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

function validateSql(nodeParam: unknown): boolean {
  if (!nodeParam?.sql?.trim()) {
    nodeParam.sqlErrMsg = i18next.t(
      'workflow.nodes.databaseNode.valueCannotBeEmpty'
    );
    return false;
  }
  nodeParam.sqlErrMsg = '';
  return true;
}

export function validateDatabaseParams(currentCheckNode: unknown): boolean {
  if (currentCheckNode?.nodeType !== 'database') return true;

  const nodeParam = currentCheckNode.data.nodeParam;
  let passFlag = true;

  passFlag = validateDbId(nodeParam) && passFlag;

  if (nodeParam?.mode !== 0) {
    passFlag = validateTableName(nodeParam) && passFlag;

    if (nodeParam?.mode > 1) {
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

function validateServiceIdParams(currentCheckNode: unknown): boolean {
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

function validateRetryConfig(currentCheckNode: unknown): boolean {
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

export const checkedNodeParams = (currentCheckNode: unknown): boolean => {
  const validations = [
    validateTemplateParams,
    validateQuestionAnswerParams,
    validateDecisionMakingParams,
    validateKnowledgeBaseParams,
    validateIflyCodeParams,
    validateIfElseParams,
    validateTextJoinerParams,
    validateAgentParams,
    validateQuestionAnswerOptions,
    validateDatabaseParams,
    validateServiceIdParams,
    validateRetryConfig,
  ];

  return validations.every(validation => validation(currentCheckNode));
};

// ==================== 节点操作函数 ====================
export function getNextName(arr: unknown[], prefix: string): string {
  const regex = new RegExp(`^${prefix}_(\\d+)$`);
  const numbers = arr
    .map(item => item?.data?.label)
    .map(name => {
      const match = name?.match(regex);
      return match ? parseInt(match[1], 10) : null;
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
  edges: unknown[]
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
  edges: unknown[]
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
const assignUUIDs = (arr): unknown[] => {
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

export const copyNodeData = (data: unknown): unknown => {
  const newData = cloneDeep(data);

  newData.inputs = newData.inputs.map((item: unknown) => ({
    ...item,
    id: uuid(),
  }));
  newData.outputs = assignUUIDs(newData.outputs);

  if (newData?.nodeParam?.intentChains) {
    newData.nodeParam.intentChains = newData.nodeParam.intentChains.map(
      (item: unknown) => ({
        ...item,
        id: `intent-one-of::${uuid()}`,
      })
    );
  }

  if (newData?.nodeParam?.optionAnswer) {
    newData.nodeParam.optionAnswer = newData.nodeParam.optionAnswer.map(
      (item: unknown) => ({
        ...item,
        id: `option-one-of::${uuid()}`,
      })
    );
  }

  if (newData?.nodeParam?.cases) {
    newData.nodeParam.cases = newData.nodeParam.cases.map((item: unknown) => ({
      ...item,
      id: `branch_one_of::${uuid()}`,
    }));

    if (newData.inputs.length >= 2) {
      newData.nodeParam.cases[0].conditions[0].leftVarIndex =
        newData.inputs[0].id;
      newData.nodeParam.cases[0].conditions[0].rightVarIndex =
        newData.inputs[1].id;
    }
  }

  return newData;
};

export function findItemById(dataArray: unknown[], id: string): unknown | null {
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

export function renderType(params): string {
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
    const baseType = type.split('-')[1];
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
export function generateKnowledgeOutput(type: string): unknown[] {
  const commonResult = {
    id: uuid(),
    name: 'results',
    schema: {
      type: 'array-object',
      properties: [] as unknown[],
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

function createProperty(name: string, type: string): unknown {
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

export function hasDecisionMakingNode(nodes: unknown[]): boolean {
  return nodes?.some(
    node =>
      node?.id?.startsWith('decision-making') &&
      node?.data?.nodeParam?.reasonMode !== 1
  );
}

export const handleReplaceNodeId = (
  childNodes: unknown[],
  replacements: Record<string, string>
): unknown[] => {
  const childNodesString = JSON.stringify(childNodes);
  return JSON.parse(
    childNodesString.replace(
      new RegExp(Object.keys(replacements).join('|'), 'g'),
      match => replacements[match]
    )
  );
};

export const isRefKnowledgeBase = (input: unknown): boolean => {
  return (
    input?.schema?.type !== 'array-object' &&
    input?.schema?.value?.content?.nodeId?.startsWith('knowledge-base')
  );
};

// ==================== JSON 验证函数 ====================
export const validateInputJSON = (
  newValue: string,
  schema: unknown
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

export const generateDefaultInput = (type: string): unknown => {
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
function generateSchemaForNode(node: unknown): unknown {
  const schema: unknown = {};

  switch (node.type) {
    case 'array-object':
      schema.type = 'array';
      schema.items = {
        type: 'object',
        properties: {},
        required: [],
      };

      node.properties?.forEach((property: unknown) => {
        schema.items.properties[property.name] =
          generateSchemaForNode(property);
        if (property.required) {
          schema.items.required.push(property.name);
        }
      });

      if (schema.items.required.length === 0) {
        delete schema.items.required;
      }
      break;

    case 'array-integer':
      schema.type = 'array';
      schema.items = { type: 'integer' };
      break;

    case 'array-boolean':
      schema.type = 'array';
      schema.items = { type: 'boolean' };
      break;

    case 'array-string':
      schema.type = 'array';
      schema.items = { type: 'string' };
      break;

    case 'array-number':
      schema.type = 'array';
      schema.items = { type: 'number' };
      break;

    case 'object':
      schema.type = 'object';
      schema.properties = {};
      schema.required = [];

      node.properties?.forEach((property: unknown) => {
        schema.properties[property.name] = generateSchemaForNode(property);
        if (property.required) {
          schema.required.push(property.name);
        }
      });

      if (schema.required.length === 0) {
        delete schema.required;
      }
      break;

    default:
      schema.type = node.type;
  }

  return schema;
}

export const generateValidationSchema = (data: unknown): unknown => {
  return generateSchemaForNode(data.schema);
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
  source: unknown[],
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
    if (Object.hasOwn(target, key)) {
      ordered[key] = target[key];
    }
  });

  return ordered;
};

export const generateInputsAndOutputsOrder = (
  currentNode: unknown,
  target: Record<string, unknown>,
  key: string
): Record<string, unknown> => {
  let source: unknown[] = [];

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
export function filterTreeNodes(nodes: unknown[]): unknown[] {
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
  schemaList: unknown[],
  oldObj: unknown = null
): unknown {
  const newObj = generateDefaultObject(schemaList);
  return oldObj ? mergeByStructure(newObj, oldObj) : newObj;
}

function generateDefaultObject(schemaList: unknown[]): Record<string, unknown> {
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
    return mergeObjectsByStructure(newObj, oldObj);
  }

  if (Array.isArray(newObj)) {
    return mergeArraysByStructure(newObj, oldObj);
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
  if (Array.isArray(oldObj) && oldObj.length > 0) {
    return [mergeByStructure(newObj[0], oldObj[0])];
  }
  return newObj;
}

function getDefaultValueForType(type: string, schema: unknown): unknown {
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
  return typeHandlers[type]?.();
}

function handleObjectSchema(schema: unknown): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  (schema.properties || []).forEach((prop: unknown) => {
    obj[prop.name] = getDefaultValueForType(
      prop.type || prop.schema?.type,
      prop
    );
  });

  return obj;
}

function handleArrayObjectSchema(schema: unknown): unknown[] {
  return schema.properties?.length
    ? [handleObjectSchema({ properties: schema.properties })]
    : [];
}

function isObject(value: unknown): boolean {
  return value && typeof value === 'object' && !Array.isArray(value);
}

// ==================== 路径查找函数 ====================
export function findPathById(
  schemaList: unknown[],
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
  if (path.length === 0) return { ...obj };

  const newObj = JSON.parse(JSON.stringify(obj));
  let current = newObj;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];

    if (!current[key] && !current?.[0]?.[key]) {
      return obj;
    }

    if (current[key]) {
      current = current[key];
    } else if (current?.[0]?.[key]) {
      current = current[0][key];
    }
  }

  const lastKey = path[path.length - 1];
  if (current && Object.hasOwn(current, lastKey)) {
    delete current[lastKey];
  } else if (current?.[0] && Object.hasOwn(current[0], lastKey)) {
    delete current[0][lastKey];
  }

  return newObj;
}

// ==================== 工具参数处理函数 ====================
export const handleModifyToolUrlParams = (
  toolUrlParams: unknown[]
): unknown[] => {
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
export const findFromTwoItems = (tree: unknown[]): string[] => {
  const result: string[] = [];

  function traverse(node: unknown): void {
    if (node.from === 1 && node?.fatherType !== 'array') {
      result.push(node.name);
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach((child: unknown) => traverse(child));
    }
  }

  tree.forEach(node => traverse(node));
  return result;
};

// ==================== 树转换函数 ====================
function transformArrayItem(item: unknown, isFirstLevel: boolean): unknown {
  if (item.open === false) return null;

  const transformedItem: unknown = {
    id: item.id || uuid(),
    name: item.name,
  };

  if (isFirstLevel) {
    transformedItem.schema = { type: item.type };
  } else {
    transformedItem.type = item.type;
  }

  if (item.type === 'array') {
    handleArrayTransformation(item, transformedItem, isFirstLevel);
  } else if (item.children) {
    handleObjectTransformation(item, transformedItem, isFirstLevel);
  }

  return transformedItem;
}

function handleArrayTransformation(
  item: unknown,
  transformedItem: unknown,
  isFirstLevel: boolean
): void {
  const firstChildType = item?.children?.[0]?.type;

  if (firstChildType !== 'object') {
    if (isFirstLevel) {
      transformedItem.schema.type = `array-${firstChildType}`;
      transformedItem.schema.properties = [];
    } else {
      transformedItem.type = `array-${firstChildType}`;
      transformedItem.properties = [];
    }
  } else {
    const children = item?.children?.[0]?.children || item.children;
    const transformedChildren = children
      ?.map((child: unknown) => transformArrayItem(child, false))
      .filter(Boolean);

    if (isFirstLevel) {
      transformedItem.schema.type = 'array-object';
      transformedItem.schema.properties = transformedChildren;
    } else {
      transformedItem.type = 'array-object';
      transformedItem.properties = transformedChildren;
    }
  }
}

function handleObjectTransformation(
  item: unknown,
  transformedItem: unknown,
  isFirstLevel: boolean
): void {
  const transformedChildren = item.children
    .map((child: unknown) => transformArrayItem(child, false))
    .filter(Boolean);

  if (isFirstLevel) {
    transformedItem.schema.type = 'object';
    transformedItem.schema.properties = transformedChildren;
  } else {
    transformedItem.type = 'object';
    transformedItem.properties = transformedChildren;
  }
}

export const transformTree = (inputArray: unknown[]): unknown[] => {
  return inputArray.map(item => transformArrayItem(item, true)).filter(Boolean);
};

// ==================== 项目删除函数 ====================
function removeFromProperties(
  propertiesArray: unknown[],
  idToRemove: string
): unknown[] {
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
  dataArray: unknown[],
  idToRemove: string
): unknown[] => {
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
export const extractIdsWithNonEmptyProperties = (data: unknown[]): string[] => {
  const ids: string[] = [];

  function extractFromItem(item: unknown): void {
    const hasSchemaProperties =
      item.schema &&
      Array.isArray(item.schema.properties) &&
      item.schema.properties.length > 0;

    const hasProperties =
      Array.isArray(item.properties) && item.properties.length > 0;

    if (hasSchemaProperties || hasProperties) {
      ids.push(item.id);

      if (hasSchemaProperties) {
        item.schema.properties.forEach(extractFromItem);
      }

      if (hasProperties) {
        item.properties.forEach(extractFromItem);
      }
    }
  }

  data.forEach(extractFromItem);
  return ids;
};

type NodeType = {
  id: string;
  data: unknown;
};

type EdgeType = {
  source: string;
  target: string;
};

function buildSchemaReferences(
  schema: unknown,
  parent: { originId: string; prefix?: string; parentType?: string } = {
    originId: '',
  }
): unknown[] {
  if (!schema) return [];

  const baseValue = parent.prefix
    ? `${parent.prefix}.${schema.name}`
    : schema.name;

  // 基础类型
  if (!['object', 'array-object'].includes(schema.type)) {
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
  if (Array.isArray(schema.properties)) {
    return [
      {
        originId: parent.originId,
        id: schema.id,
        label: schema.name,
        value: baseValue,
        type: schema?.type,
        parentType: parent.parentType,
        fileType: schema.allowedFileType?.[0] || '',
        children: schema.properties.flatMap((prop: unknown) =>
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
        ),
      },
    ];
  }

  return [];
}

function buildOwnReferences(
  sourceNode: NodeType,
  targetNode: NodeType
): unknown[] {
  const errorOutputs =
    [1, 2]?.includes(sourceNode?.data?.retryConfig?.errorStrategy) &&
    sourceNode?.data?.retryConfig?.shouldRetry
      ? errorOutputTemplate
      : [];

  const outputs =
    targetNode?.nodeType === 'iteration'
      ? sourceNode?.data?.outputs?.filter((output: unknown) =>
          output?.schema?.type?.includes('array')
        )
      : [...(sourceNode?.data?.outputs || []), ...errorOutputs];

  return (
    outputs?.flatMap((output: unknown) =>
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
): unknown[] {
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
    .filter(Boolean) as unknown[];

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
