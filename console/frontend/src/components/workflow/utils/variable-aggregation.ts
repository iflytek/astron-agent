import { v4 as uuid } from 'uuid';
import i18next from 'i18next';

import variableAggregationIcon from '@/assets/imgs/workflow/variable-aggregation-icon.svg';

export const VARIABLE_AGGREGATION_NODE_TYPE = 'variable-aggregation';

const VARIABLE_AGGREGATION_CATEGORY_NAME = '工具节点';
const DEFAULT_OUTPUT_NAME = 'output';
const ARRAY_TYPES = [
  'array-string',
  'array-integer',
  'array-number',
  'array-boolean',
  'array-object',
];

export function createVariableAggregationInput(
  index: number,
  outputType = 'string'
): any {
  return {
    id: uuid(),
    name: `candidate${index}`,
    schema: {
      type: outputType,
      value: {
        type: 'ref',
        content: {},
        contentErrMsg: '',
      },
    },
  };
}

export function createVariableAggregationOutput(outputType = 'string'): any {
  return {
    id: uuid(),
    name: DEFAULT_OUTPUT_NAME,
    schema: {
      type: outputType,
      default: '',
    },
    required: false,
  };
}

export function getVariableAggregationDefaultFallbackValue(type: string): any {
  switch (type) {
    case 'boolean':
      return false;
    case 'integer':
    case 'number':
      return 0;
    case 'object':
      return '{}';
    case 'string':
      return '';
    default:
      if (ARRAY_TYPES.includes(type)) {
        return '[]';
      }
      return '';
  }
}

export function normalizeVariableAggregationInputs(
  inputs: any[] = [],
  outputType = 'string'
): any[] {
  return inputs.map((input: any, index: number) => ({
    ...(input || {}),
    name: `candidate${index + 1}`,
    schema: {
      ...(input?.schema || {}),
      type: outputType,
      value: {
        type: 'ref',
        content: input?.schema?.value?.content || {},
        contentErrMsg: input?.schema?.value?.contentErrMsg || '',
      },
    },
  }));
}

export function buildVariableAggregationNodeTemplate(): any {
  return {
    idType: VARIABLE_AGGREGATION_NODE_TYPE,
    aliasName: '变量聚合器',
    description: '按顺序选择首个非空变量并聚合为一个输出变量',
    data: {
      icon: variableAggregationIcon,
      allowInputReference: true,
      allowOutputReference: true,
      description: '按顺序选择首个非空变量并聚合为一个输出变量',
      inputs: [createVariableAggregationInput(1)],
      outputs: [createVariableAggregationOutput()],
      nodeMeta: {
        nodeType: '工具',
        aliasName: '变量聚合节点',
      },
      nodeParam: {
        fallbackEnabled: false,
        fallbackValue: '',
        fallbackValueErrMsg: '',
      },
      updatable: false,
    },
  };
}

export function appendVariableAggregationNodeTemplate(
  nodeTemplate: any[] = []
): any[] {
  const hasNode = nodeTemplate.some((category: any) =>
    (category?.nodes || []).some(
      (node: any) => node?.idType === VARIABLE_AGGREGATION_NODE_TYPE
    )
  );
  if (hasNode) {
    return nodeTemplate;
  }

  const template = buildVariableAggregationNodeTemplate();
  const nextTemplate = [...nodeTemplate];
  const categoryIndex = nextTemplate.findIndex((category: any) =>
    (category?.nodes || []).some((node: any) =>
      ['text-joiner', 'node-variable'].includes(node?.idType)
    )
  );

  if (categoryIndex >= 0) {
    nextTemplate[categoryIndex] = {
      ...(nextTemplate[categoryIndex] || {}),
      nodes: [...(nextTemplate[categoryIndex]?.nodes || []), template],
    };
    return nextTemplate;
  }

  nextTemplate.push({
    name: VARIABLE_AGGREGATION_CATEGORY_NAME,
    nodes: [template],
  });
  return nextTemplate;
}

export function isVariableAggregationTypeCompatible(
  referenceType?: string,
  outputType?: string
): boolean {
  return Boolean(referenceType && outputType && referenceType === outputType);
}

function filterReferenceLeaves(
  references: any[] = [],
  outputType = 'string'
): any[] {
  return references.reduce((acc: any[], reference: any) => {
    if (reference?.children?.length) {
      const children = filterReferenceLeaves(reference.children, outputType);
      if (children.length > 0) {
        acc.push({
          ...reference,
          children,
        });
      }
      return acc;
    }

    if (isVariableAggregationTypeCompatible(reference?.type, outputType)) {
      acc.push(reference);
    }
    return acc;
  }, []);
}

export function filterVariableAggregationReferences(
  references: any[] = [],
  outputType = 'string'
): any[] {
  return references.reduce((acc: any[], group: any) => {
    const filteredChildren = (group?.children || []).reduce(
      (childrenAcc: any[], child: any) => {
        const filteredRefs = filterReferenceLeaves(
          child?.references || [],
          outputType
        );
        if (filteredRefs.length > 0) {
          childrenAcc.push({
            ...child,
            references: filteredRefs,
          });
        }
        return childrenAcc;
      },
      []
    );

    if (filteredChildren.length > 0) {
      acc.push({
        ...group,
        children: filteredChildren,
      });
    }

    return acc;
  }, []);
}

function validateFallbackValue(type: string, value: any): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean';
    case 'integer':
      return Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'object':
      if (typeof value !== 'string') {
        return false;
      }
      try {
        const parsed = JSON.parse(value);
        return (
          Boolean(parsed) &&
          !Array.isArray(parsed) &&
          typeof parsed === 'object'
        );
      } catch {
        return false;
      }
    default:
      if (!ARRAY_TYPES.includes(type) || typeof value !== 'string') {
        return false;
      }
      try {
        return Array.isArray(JSON.parse(value));
      } catch {
        return false;
      }
  }
}

export function validateVariableAggregationNode(
  currentCheckNode: any
): boolean {
  if (currentCheckNode?.nodeType !== VARIABLE_AGGREGATION_NODE_TYPE) {
    return true;
  }

  let passFlag = true;
  const outputType = currentCheckNode?.data?.outputs?.[0]?.schema?.type;

  (currentCheckNode?.data?.inputs || []).forEach((input: any) => {
    const hasReference = Boolean(input?.schema?.value?.content?.name);
    if (
      hasReference &&
      !isVariableAggregationTypeCompatible(input?.schema?.type, outputType)
    ) {
      input.schema.value.contentErrMsg = i18next.t(
        'workflow.nodes.validation.variableAggregationTypeMismatch'
      );
      passFlag = false;
      return;
    }
    input.schema.value.contentErrMsg = '';
  });

  if (currentCheckNode?.data?.nodeParam?.fallbackEnabled) {
    const fallbackValue = currentCheckNode?.data?.nodeParam?.fallbackValue;
    const isValidFallback = validateFallbackValue(outputType, fallbackValue);
    currentCheckNode.data.nodeParam.fallbackValueErrMsg = isValidFallback
      ? ''
      : i18next.t(
          'workflow.nodes.validation.variableAggregationFallbackInvalid'
        );
    passFlag = isValidFallback && passFlag;
  } else {
    currentCheckNode.data.nodeParam.fallbackValueErrMsg = '';
  }

  return passFlag;
}
