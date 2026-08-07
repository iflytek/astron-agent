import React, { useMemo, useEffect, useRef, useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cloneDeep } from 'lodash';
import { Tooltip } from 'antd';
import { v4 as uuid } from 'uuid';
import {
  FLowCollapse,
  FlowSelect,
  FlowCascader,
  FlowNodeInput,
} from '@/components/workflow/ui';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { compareOperators } from '@/constants';
import { SourceHandle } from '@/components/workflow/nodes/components/handle';
import { useIfElseNodeCompareOperator } from '@/components/workflow/hooks/use-if-else-node-compare-operator';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { useMemoizedFn } from 'ahooks';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';
import arrowDownIcon from '@/assets/imgs/workflow/arrow-down-icon.png';

const OperatorDropdown = ({
  item,
  operatorId,
  setOperatorId,
  id,
  t,
}): React.ReactElement => {
  if (operatorId !== item?.id) return null;
  const { handleOperatorChange } = useIfElseCondition(id);
  return (
    <div
      className="w-[68px] text-center rounded-md absolute left-0 top-[30px] py-1.5 px-1 shadow-sm bg-[#fff]"
      style={{
        zIndex: 99999,
      }}
    >
      <div
        className="w-full px-2.5 py-1 text-desc font-medium hover:bg-[#E6F4FF] cursor-pointer flex items-center rounded-sm"
        onClick={e => {
          e.stopPropagation();
          setOperatorId('');
          handleOperatorChange(item.id, 'and');
        }}
      >
        {t('workflow.nodes.ifElseNode.and')}
      </div>
      <div
        className="w-full px-2.5 py-1 text-desc font-medium hover:bg-[#E6F4FF] cursor-pointer flex items-center rounded-sm"
        onClick={e => {
          e.stopPropagation();
          setOperatorId('');
          handleOperatorChange(item.id, 'or');
        }}
      >
        {t('workflow.nodes.ifElseNode.or')}
      </div>
    </div>
  );
};

const LeftCascader = ({
  condition,
  inputs,
  references,
  handleChangeInputParam,
  checkNode,
  id,
}): React.ReactElement => {
  const value = inputs?.find(input => input.id === condition.leftVarIndex)
    ?.schema?.value?.content?.nodeId
    ? [
        inputs.find(input => input.id === condition.leftVarIndex)?.schema?.value
          ?.content?.nodeId,
        inputs.find(input => input.id === condition.leftVarIndex)?.schema?.value
          ?.content?.name,
      ]
    : [];

  return (
    <FlowCascader
      value={value}
      options={references}
      handleTreeSelect={node => {
        handleChangeInputParam(
          condition.leftVarIndex,
          (data, value) => (data.schema.value.content = value),
          { id: node.id, nodeId: node.originId, name: node.value }
        );
      }}
      onBlur={() => checkNode(id)}
    />
  );
};

const OperatorSelect = ({
  condition,
  index,
  handleConditionChange,
  id,
  checkNode,
  caseData,
}): React.ReactElement => (
  <FlowSelect
    value={condition.compareOperator}
    onChange={value =>
      handleConditionChange(
        caseData?.id,
        index,
        (data, value) => (data.compareOperator = value),
        value
      )
    }
    options={compareOperators}
    onBlur={() => checkNode(id)}
  />
);

const RightInput = ({
  condition,
  inputs,
  references,
  handleChangeInputParam,
  checkNode,
  id,
}): React.ReactElement => {
  const inputData = inputs?.find(input => input.id === condition.rightVarIndex);
  const disabled = ['not_null', 'null', 'empty', 'not_empty'].includes(
    condition.compareOperator
  );

  if (inputData?.schema?.value?.type === 'literal') {
    return (
      <FlowNodeInput
        nodeId={id}
        disabled={disabled}
        value={inputData.schema.value.content}
        onChange={value =>
          handleChangeInputParam(
            condition.rightVarIndex,
            (data, value) => (data.schema.value.content = value),
            value
          )
        }
      />
    );
  }

  const value = inputData?.schema?.value?.content?.nodeId
    ? [
        inputData.schema.value.content.nodeId,
        inputData.schema.value.content.name,
      ]
    : [];

  return (
    <FlowCascader
      value={value}
      options={references}
      handleTreeSelect={node => {
        handleChangeInputParam(
          condition.rightVarIndex,
          (data, value) => {
            data.schema.value.content = value.content;
            data.schema.type = value.type;
          },
          {
            content: { id: node.id, nodeId: node.originId, name: node.value },
            type: node.type,
          }
        );
      }}
      onBlur={() => checkNode(id)}
    />
  );
};

const ErrorRow = ({ condition, inputs, index }): React.ReactElement => (
  <div className="flex-1 flex items-center gap-2.5 text-xs overflow-hidden text-[#F74E43]">
    <div className="flex flex-col w-1/4">
      {
        inputs?.find(input => input.id === condition.leftVarIndex)?.schema
          ?.value?.contentErrMsg
      }
    </div>
    <div className="flex flex-col flex-1">
      {condition.compareOperatorErrMsg}
    </div>
    <div className="flex flex-col flex-1"></div>
    <div className="flex flex-col w-1/4">
      {
        inputs?.find(input => input.id === condition.rightVarIndex)?.schema
          ?.value?.contentErrMsg
      }
    </div>
    <span className="w-4 flex-shrink-0"></span>
  </div>
);

const ConditionRow = ({
  condition,
  index,
  inputs,
  references,
  handleChangeInputParam,
  id,
  checkNode,
  caseData,
}): React.ReactElement => {
  const { t } = useTranslation();
  const { handleRemoveLine } = useIfElseLines(id);
  const { handleConditionChange } = useIfElseCondition(id);

  return (
    <div key={condition.id} className="flex flex-col mt-2.5 overflow-hidden">
      <div className="flex-1 flex items-center text-desc gap-2.5">
        <div className="w-1/4">
          <LeftCascader
            {...{
              condition,
              inputs,
              references,
              handleChangeInputParam,
              checkNode,
              id,
            }}
          />
        </div>
        <div className="flex-1">
          <OperatorSelect
            {...{
              condition,
              index,
              handleConditionChange,
              id,
              checkNode,
              caseData,
            }}
          />
        </div>
        <div className="flex-1">
          <FlowSelect
            disabled={['not_null', 'null', 'empty', 'not_empty'].includes(
              condition.compareOperator
            )}
            value={
              inputs.find(input => input.id === condition.rightVarIndex)?.schema
                ?.value?.type
            }
            options={[
              { label: t('workflow.nodes.ifElseNode.input'), value: 'literal' },
              { label: t('workflow.nodes.ifElseNode.reference'), value: 'ref' },
            ]}
            onChange={value =>
              handleChangeInputParam(
                condition.rightVarIndex,
                (data, value) => {
                  data.schema.value.type = value;
                  data.schema.value.content = value === 'literal' ? '' : {};
                },
                value
              )
            }
          />
        </div>
        <div className="w-1/4">
          <RightInput
            {...{
              condition,
              inputs,
              references,
              handleChangeInputParam,
              checkNode,
              id,
            }}
          />
        </div>
        {caseData?.conditions?.length > 1 && (
          <img
            src={remove}
            className="w-[16px] h-[17px] cursor-pointer"
            alt=""
            onClick={() => handleRemoveLine(caseData, index)}
          />
        )}
      </div>
      <ErrorRow {...{ condition, inputs, index }} />
    </div>
  );
};

const CaseRow = ({
  item,
  caseIndex,
  cases,
  t,
  operatorRef,
  operatorId,
  setOperatorId,
  inputs,
  references,
  handleChangeInputParam,
  id,
  checkNode,
  canvasesDisabled,
}): React.ReactElement => {
  const { handleRemoveCase } = useIfElseCases(id);
  const { handleAddLine } = useIfElseLines(id);
  return (
    <div className="relative" key={item.id}>
      {caseIndex === cases.length - 1 ? (
        <div className="bg-[#F7F7F7] rounded-md p-4 mx-[18px]">
          {t('workflow.nodes.ifElseNode.else')}
        </div>
      ) : (
        <div className="bg-[#F7F7F7] rounded-md p-4 mx-[18px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>
                {caseIndex === 0
                  ? t('workflow.nodes.ifElseNode.if')
                  : t('workflow.nodes.ifElseNode.elseIf')}
              </span>
              {cases?.length > 2 && (
                <span className="bg-[#EAECEF] rounded-sm px-2 py-0.5 text-xs">
                  {t('workflow.nodes.ifElseNode.priority')}
                  {item.level}
                </span>
              )}
            </div>
            {cases?.length > 2 && (
              <img
                src={remove}
                className="w-[16px] h-[17px] cursor-pointer mt-1.5"
                alt=""
                onClick={() => handleRemoveCase(item.id)}
              />
            )}
          </div>
          <div className="flex items-center mt-2">
            {item?.conditions.length > 1 && (
              <div className="w-[50px] mr-4"></div>
            )}
            <div className="flex-1 flex items-center text-desc gap-2.5">
              <h4 className="w-1/4">
                {t('workflow.nodes.ifElseNode.referenceVariable')}
              </h4>
              <h4 className="flex-1">
                {t('workflow.nodes.ifElseNode.selectCondition')}
              </h4>
              <h4 className="flex-1">
                {t('workflow.nodes.ifElseNode.compareType')}
              </h4>
              <h4 className="w-1/4">
                {t('workflow.nodes.ifElseNode.compareValue')}
              </h4>
              {item?.conditions?.length > 1 && <span className="w-4"></span>}
            </div>
          </div>
          <div className="flex w-full">
            {item?.conditions.length > 1 && (
              <div className="flex-shrink-0 w-[50px] mr-4 my-4">
                <div className="flex flex-col h-full">
                  <div className="flex-1 relative">
                    <div className="absolute left-1/2 right-0 top-0 bottom-0 rounded-tl-lg border-solid border-0 border-t border-l border-[#C4C4C4]"></div>
                  </div>
                  <div
                    className="w-full flex justify-center items-center gap-0.5 text-xs text-[#6356EA] font-medium relative hover:bg-[#dfdfe0] cursor-pointer rounded-md py-1.5"
                    onClick={e => {
                      e.stopPropagation();
                      setOperatorId(item?.id);
                    }}
                    ref={operatorRef}
                  >
                    <span>
                      {item.logicalOperator === 'and'
                        ? t('workflow.nodes.ifElseNode.and')
                        : t('workflow.nodes.ifElseNode.or')}
                    </span>
                    <img
                      src={arrowDownIcon}
                      className="w-[7px] h-[5px]"
                      alt=""
                    />
                    <OperatorDropdown
                      item={item}
                      operatorId={operatorId}
                      setOperatorId={setOperatorId}
                      id={id}
                      t={t}
                    />
                  </div>
                  <div className="flex-1 relative">
                    <div className="absolute left-1/2 right-0 top-0 bottom-0 rounded-bl-lg border-solid border-0 border-b border-l border-[#C4C4C4]"></div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              {item?.conditions?.map((condition, index) => (
                <ConditionRow
                  condition={condition}
                  index={index}
                  inputs={inputs}
                  references={references}
                  handleChangeInputParam={handleChangeInputParam}
                  id={id}
                  checkNode={checkNode}
                  caseData={item}
                />
              ))}
            </div>
          </div>
          {!canvasesDisabled && (
            <div
              className="text-[#6356EA] text-xs font-medium mt-1 inline-flex items-center cursor-pointer gap-1.5"
              onClick={() => handleAddLine(item.id)}
            >
              <img src={inputAddIcon} className="w-3 h-3" alt="" />
              <span>{t('workflow.nodes.common.add')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const useIfElseCases = (
  id: string
): {
  handleAddCase: () => void;
  handleRemoveCase: (caseId: string) => void;
  getLeftRef: (
    condition: unknown,
    inputs: unknown,
    references: unknown
  ) => {
    leftLabel: string;
    leftName: string;
    leftRef: string;
  };
  getRightRef: (
    condition: unknown,
    inputs: unknown,
    references: unknown
  ) => {
    rightLabel: string;
    rightName: string;
    rightRef: string;
  };
} => {
  const getCurrentStore = useFlowsManager(s => s.getCurrentStore);
  const currentStore = getCurrentStore();
  const setNode = currentStore(s => s.setNode);
  const takeSnapshot = currentStore(s => s.takeSnapshot);
  const canPublishSetNot = useFlowsManager(s => s.canPublishSetNot);
  const setEdges = currentStore(s => s.setEdges);

  const handleAddCase = useMemoizedFn(() => {
    takeSnapshot();
    const leftVarIndex = uuid();
    const rightVarIndex = uuid();
    setNode(id, old => {
      old.data.inputs = [
        ...(old.data?.inputs || []),
        {
          id: leftVarIndex,
          name: 'input' + uuid().replaceAll('-', ''),
          schema: {
            type: 'string',
            value: { type: 'ref', content: { nodeId: '', name: '' } },
          },
        },
        {
          id: rightVarIndex,
          name: 'input' + uuid().replaceAll('-', ''),
          schema: {
            type: 'string',
            value: { type: 'ref', content: { nodeId: '', name: '' } },
          },
        },
      ];
      old.data.nodeParam.cases.splice(old.data.nodeParam.cases.length - 1, 0, {
        id: 'branch_one_of::' + uuid(),
        level: old.data.nodeParam.cases.length,
        logicalOperator: 'and',
        conditions: [
          { id: uuid(), leftVarIndex, rightVarIndex, compareOperator: null },
        ],
      });
      return { ...cloneDeep(old) };
    });
    canPublishSetNot();
  });

  const handleRemoveCase = useMemoizedFn((caseId: string) => {
    takeSnapshot();
    setNode(id, old => {
      const currentCase = old?.data?.nodeParam?.cases.find(
        item => item.id === caseId
      );
      const conditions = currentCase?.conditions || [];
      const needDeleteInputs = [
        ...conditions.map(c => c.leftVarIndex),
        ...conditions.map(c => c.rightVarIndex),
      ];
      old.data.inputs = old.data.inputs.filter(
        input => !needDeleteInputs.includes(input.id)
      );
      old.data.nodeParam.cases = old.data.nodeParam.cases
        .filter(item => item.id !== caseId)
        .map((item, index) => ({
          ...item,
          level:
            index === old.data.nodeParam.cases?.length - 2 ? 999 : index + 1,
        }));
      return { ...cloneDeep(old) };
    });
    setEdges(edges => edges.filter(edge => edge.sourceHandle !== caseId));
    canPublishSetNot();
  });

  // helpers.ts
  const getInputById = useMemoizedFn((inputs, id) => {
    return inputs?.find(input => input.id === id);
  });

  const getReferenceLabel = useMemoizedFn((references, nodeId) => {
    return references?.find(ref => ref.value === nodeId)?.label;
  });

  const getLeftRef = useMemoizedFn(
    (
      condition,
      inputs,
      references
    ): {
      leftLabel: string;
      leftName: string;
      leftRef: string;
    } => {
      const leftInput = getInputById(inputs, condition.leftVarIndex);
      const leftLabel = getReferenceLabel(
        references,
        leftInput?.schema?.value?.content?.nodeId
      );
      const leftName = leftInput?.schema?.value?.content?.name;
      return { leftLabel, leftName, leftRef: `${leftLabel} - ${leftName}` };
    }
  );

  const getRightRef = useMemoizedFn(
    (
      condition,
      inputs,
      references
    ): {
      rightLabel: string;
      rightName: string;
      rightRef: string;
    } => {
      const rightInput = getInputById(inputs, condition.rightVarIndex);
      if (!rightInput) return { rightLabel: '', rightName: '', rightRef: '' };

      const { type, content } = rightInput.schema?.value || {};

      if (type === 'literal') {
        return { rightLabel: content, rightName: content, rightRef: content };
      }

      if (
        ['empty', 'not_empty', 'null', 'not_null'].includes(
          condition.compareOperator
        )
      ) {
        const label =
          condition.compareOperator === 'empty'
            ? 'Empty'
            : condition.compareOperator === 'not_empty'
              ? 'Not Empty'
              : 'Null';
        return { rightLabel: label, rightName: label, rightRef: label };
      }

      const rightLabel = getReferenceLabel(references, content?.nodeId);
      const rightName = content?.name;
      return {
        rightLabel,
        rightName,
        rightRef: `${rightLabel} - ${rightName}`,
      };
    }
  );

  return { handleAddCase, handleRemoveCase, getLeftRef, getRightRef };
};

const useIfElseLines = (
  id: string
): {
  handleAddLine: (caseId: string) => void;
  handleRemoveLine: (caseData: unknown, index: number) => void;
} => {
  const getCurrentStore = useFlowsManager(s => s.getCurrentStore);
  const currentStore = getCurrentStore();
  const setNode = currentStore(s => s.setNode);
  const takeSnapshot = currentStore(s => s.takeSnapshot);
  const canPublishSetNot = useFlowsManager(s => s.canPublishSetNot);

  const handleAddLine = useMemoizedFn((caseId: string) => {
    takeSnapshot();
    const leftVarIndex = uuid();
    const rightVarIndex = uuid();
    setNode(id, old => {
      old.data.inputs.push(
        {
          id: leftVarIndex,
          name: 'input' + uuid().replaceAll('-', ''),
          schema: {
            type: 'string',
            value: { type: 'ref', content: { nodeId: '', name: '' } },
          },
        },
        {
          id: rightVarIndex,
          name: 'input' + uuid().replaceAll('-', ''),
          schema: {
            type: 'string',
            value: { type: 'ref', content: { nodeId: '', name: '' } },
          },
        }
      );
      const currentCase = old.data.nodeParam.cases.find(
        item => item.id === caseId
      );
      currentCase.conditions.push({
        id: uuid(),
        leftVarIndex,
        rightVarIndex,
        compareOperator: null,
      });
      return { ...cloneDeep(old) };
    });
    canPublishSetNot();
  });

  const handleRemoveLine = useMemoizedFn((caseData, index) => {
    const leftVarIndex = caseData?.conditions?.[index]?.leftVarIndex;
    const rightVarIndex = caseData?.conditions?.[index]?.rightVarIndex;
    takeSnapshot();
    setNode(id, old => {
      old.data.inputs = old.data.inputs.filter(
        input => input.id !== leftVarIndex && input.id !== rightVarIndex
      );
      const currentCase = old.data.nodeParam.cases.find(
        item => item.id === caseData?.id
      );
      currentCase.conditions = currentCase.conditions.filter(
        (_, i) => i !== index
      );
      return { ...cloneDeep(old) };
    });
    canPublishSetNot();
  });

  return { handleAddLine, handleRemoveLine };
};

const useIfElseCondition = (
  id: string
): {
  handleConditionChange: (
    caseId: string,
    index: number,
    fn: (condition: unknown, value: unknown) => void,
    value: unknown
  ) => void;
  handleOperatorChange: (caseId: string, value: unknown) => void;
} => {
  const getCurrentStore = useFlowsManager(s => s.getCurrentStore);
  const currentStore = getCurrentStore();
  const setNode = currentStore(s => s.setNode);
  const autoSaveCurrentFlow = useFlowsManager(s => s.autoSaveCurrentFlow);
  const canPublishSetNot = useFlowsManager(s => s.canPublishSetNot);

  const handleConditionChange = useMemoizedFn((caseId, index, fn, value) => {
    setNode(id, old => {
      const currentCase = old.data.nodeParam.cases.find(
        item => item.id === caseId
      );
      const currentCondition = currentCase.conditions[index];
      fn(currentCondition, value);
      if (['not_null', 'null', 'empty', 'not_empty'].includes(value)) {
        const currentInput = old.data.inputs.find(
          input => input.id === currentCondition.rightVarIndex
        );
        currentInput.schema.value.type = 'literal';
        currentInput.schema.value.content = '';
      }
      return { ...cloneDeep(old) };
    });
    autoSaveCurrentFlow();
    canPublishSetNot();
  });

  const handleOperatorChange = useMemoizedFn((caseId, value) => {
    setNode(id, old => {
      const currentCase = old.data.nodeParam.cases.find(
        item => item.id === caseId
      );
      currentCase.logicalOperator = value;
      return { ...cloneDeep(old) };
    });
    autoSaveCurrentFlow();
  });

  return { handleConditionChange, handleOperatorChange };
};

export const IfElseDetail = memo((props): React.ReactElement => {
  const { id, data } = props;
  const { handleChangeInputParam, references, inputs } = useNodeCommon({
    id,
    data,
  });
  const { handleAddCase } = useIfElseCases(id);
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const checkNode = currentStore(state => state.checkNode);
  const operatorRef = useRef<HTMLDivElement | null>(null);
  const [operatorId, setOperatorId] = useState('');

  useEffect((): void | (() => void) => {
    function clickOutside(event: MouseEvent): void {
      if (operatorRef.current && !operatorRef.current.contains(event.target)) {
        setOperatorId('');
      }
    }
    document.body.addEventListener('click', clickOutside);
    return (): void => {
      document.body.removeEventListener('click', clickOutside);
    };
  }, []);

  const cases = useMemo(() => {
    return data?.nodeParam?.cases || [];
  }, [data]);

  return (
    <div>
      <div className="p-[14px] pb-[6px]">
        <div className="bg-[#fff] rounded-lg">
          <FLowCollapse
            label={
              <div className="text-base font-medium flex items-center justify-between">
                <div>{t('workflow.nodes.ifElseNode.branch')}</div>
                {!canvasesDisabled && (
                  <div
                    className="flex items-center cursor-pointer text-[#6356EA] text-xs font-medium gap-1"
                    onClick={e => {
                      e.stopPropagation();
                      handleAddCase();
                    }}
                    style={{
                      pointerEvents: canvasesDisabled ? 'none' : 'auto',
                    }}
                  >
                    <img src={inputAddIcon} className="w-2.5 h-2.5" alt="" />
                    <span>{t('workflow.nodes.ifElseNode.addBranch')}</span>
                  </div>
                )}
              </div>
            }
            content={
              <div className="flex flex-col gap-2.5">
                {cases?.map((item, caseIndex) => (
                  <CaseRow
                    item={item}
                    caseIndex={caseIndex}
                    cases={cases}
                    t={t}
                    operatorRef={operatorRef}
                    operatorId={operatorId}
                    setOperatorId={setOperatorId}
                    inputs={inputs}
                    references={references}
                    handleChangeInputParam={handleChangeInputParam}
                    id={id}
                    checkNode={checkNode}
                    canvasesDisabled={canvasesDisabled}
                  />
                ))}
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
});

export const IfElse = memo(({ id, data }): React.ReactElement => {
  const { t } = useTranslation();
  const { isConnectable, inputs, references } = useNodeCommon({ id, data });
  const { getLeftRef, getRightRef } = useIfElseCases(id);

  const cases = useMemo(() => {
    return data?.nodeParam?.cases || [];
  }, [data]);

  return (
    <>
      {cases?.map((item, caseIndex) => (
        <>
          <span>
            {caseIndex === 0
              ? t('workflow.nodes.ifElseNode.if')
              : caseIndex === cases.length - 1
                ? t('workflow.nodes.ifElseNode.else')
                : t('workflow.nodes.ifElseNode.elseIf')}
          </span>
          <span className="relative pr-[14px] exception-handle-edge">
            <div className="border border-solid py-1 rounded-mini text-xs coz-fg-primary min-h-[32px] rounded">
              {item?.conditions?.map((condition, index) => {
                const { leftLabel, leftName, leftRef } = getLeftRef(
                  condition,
                  inputs,
                  references
                );
                const { rightLabel, rightName, rightRef } = getRightRef(
                  condition,
                  inputs,
                  references
                );

                return (
                  <div
                    className="flex flex-col overflow-hidden"
                    key={condition.id}
                  >
                    <div className="flex items-center px-1 overflow-hidden">
                      {leftLabel && leftName ? (
                        <div className="flex-1 flex-shrink-0 rounded bg-[#f2f3f8] px-2.5 py-1 overflow-hidden">
                          <Tooltip title={leftRef}>
                            <div className="text-overflow">{leftRef}</div>
                          </Tooltip>
                        </div>
                      ) : (
                        <div className="flex-1"></div>
                      )}

                      <div className="flex items-center px-2">
                        {useIfElseNodeCompareOperator(
                          condition.compareOperator
                        )}
                      </div>

                      {rightLabel && rightName ? (
                        <div className="flex-1 flex-shrink-0 min-w-0 rounded bg-[#f2f3f8] px-2.5 py-1 overflow-hidden">
                          <Tooltip title={rightRef}>
                            <div className="text-overflow">{rightRef}</div>
                          </Tooltip>
                        </div>
                      ) : (
                        <div className="flex-1"></div>
                      )}
                    </div>

                    {index !== item?.conditions?.length - 1 && (
                      <div className="relative text-center py-1">
                        <div className="absolute top-[50%] -mt-[1px] coz-stroke-primary w-full border-0 border-b border-solid"></div>
                        <span className="min-w-[28px] relative inline-block bg-[#fff]">
                          {item.logicalOperator === 'and'
                            ? t('workflow.nodes.ifElseNode.and')
                            : t('workflow.nodes.ifElseNode.or')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              <SourceHandle
                nodeId={id}
                id={item.id}
                isConnectable={isConnectable}
              />
            </div>
          </span>
        </>
      ))}
    </>
  );
});
