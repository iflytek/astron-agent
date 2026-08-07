import React, {
  useMemo,
  useCallback,
  useState,
  memo,
  useRef,
  useEffect,
  createContext,
} from 'react';
import { cloneDeep } from 'lodash';
import { v4 as uuid } from 'uuid';
import { useTranslation } from 'react-i18next';
import JsonMonacoEditor from '@/components/monaco-editor/JsonMonacoEditor';
import {
  FlowNodeInput,
  FlowSelect,
  FlowCascader,
  FLowCollapse,
} from '@/components/workflow/ui';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import {
  UseConditionActionsReturnProps,
  UseInputHelpersReturnProps,
  UseNotInModalReturnProps,
} from '@/components/workflow/types';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';

import { Input, Modal } from 'antd';
import arrowDownIcon from '@/assets/imgs/workflow/arrow-down-icon.png';
import { conditions } from '@/constants';

const ModalContext = createContext<string | null>(null);
const CaseTitle = ({ item, mode }): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center mt-2">
      {item?.conditions.length > 1 && <div className="w-[50px] mr-4"></div>}
      <div className="flex-1 flex items-center text-desc gap-2.5">
        <h4 className="w-1/4">{t('workflow.nodes.databaseNode.tableField')}</h4>
        <h4 className="flex-1">
          {t('workflow.nodes.databaseNode.selectCondition')}
        </h4>
        <h4 className="flex-1">
          {t('workflow.nodes.databaseNode.compareType')}
        </h4>
        <h4 className="w-1/4">
          {t('workflow.nodes.databaseNode.compareValue')}
        </h4>
        {(item?.conditions?.length > 1 || mode === 3) && (
          <span className="w-4"></span>
        )}
      </div>
    </div>
  );
};

const OperatorSelect = ({
  item,
  setOperatorId,
  operatorRef,
  operatorId,
  handleOperatorChange,
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className="flex-shrink-0 w-[50px] mr-4 my-4">
      <div className="flex flex-col h-full">
        <div className="relative flex-1">
          <div className="absolute left-1/2 right-0 top-0 bottom-0 rounded-tl-lg border-solid border-0 border-t border-l border-[#C4C4C4]"></div>
        </div>
        <div
          className="w-full flex justify-center items-center gap-0.5 text-xs text-[#6356EA] font-medium relative hover:bg-[#dfdfe0] cursor-pointer rounded-md py-1.5"
          onClick={(e): void => {
            e.stopPropagation();
            setOperatorId(item?.id);
          }}
          ref={operatorRef}
        >
          <span>
            {item.logicalOperator === 'and'
              ? t('workflow.nodes.databaseNode.and')
              : t('workflow.nodes.databaseNode.or')}
          </span>
          <img src={arrowDownIcon} className="w-[7px] h-[5px]" alt="" />
          {operatorId === item?.id && (
            <div
              className="w-[68px] text-center rounded-md absolute left-0 top-[30px] py-1.5 px-1 shadow-sm bg-[#fff]"
              style={{
                zIndex: 99999,
              }}
            >
              <div
                className="w-full py-1 text-desc font-medium hover:bg-[#E6F4FF] cursor-pointer flex items-center justify-center rounded-sm"
                onClick={(e): void => {
                  e.stopPropagation();
                  setOperatorId('');
                  handleOperatorChange('and');
                }}
                style={{
                  display: item.logicalOperator === 'and' ? 'none' : 'flex',
                }}
              >
                {t('workflow.nodes.databaseNode.and')}
              </div>
              <div
                className="w-full py-1 text-desc font-medium hover:bg-[#E6F4FF] cursor-pointer flex items-center justify-center rounded-sm"
                onClick={e => {
                  e.stopPropagation();
                  setOperatorId('');
                  handleOperatorChange('or');
                }}
                style={{
                  display: item.logicalOperator === 'or' ? 'none' : 'flex',
                }}
              >
                {t('workflow.nodes.databaseNode.or')}
              </div>
            </div>
          )}
        </div>
        <div className="relative flex-1">
          <div className="absolute left-1/2 right-0 top-0 bottom-0 rounded-bl-lg border-solid border-0 border-b border-l border-[#C4C4C4]"></div>
        </div>
      </div>
    </div>
  );
};

const ConditionRow = ({
  condition,
  handleFieldChange,
  handleConditionChange,
  checkNode,
  id,
  getFieldOptions,
  getConditionOptions,
  handleChangeInputParam,
  references,
  item,
  mode,
  curentInput,
  handleNotInClick,
  getTextArray,
  handleRemoveLine,
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex flex-col mt-2.5 overflow-hidden">
        <div className="flex-1 flex items-center text-desc gap-2.5">
          <div className="w-1/4">
            <FlowSelect
              value={condition.fieldName}
              onChange={value => handleFieldChange(value, condition)}
              options={getFieldOptions(condition.selectCondition)}
              onBlur={() => checkNode(id)}
            />
          </div>
          <div className="flex-1">
            <FlowSelect
              value={condition.selectCondition}
              onChange={value => handleConditionChange(value, condition)}
              options={getConditionOptions(condition.fieldType)}
              onBlur={() => {
                checkNode(id);
              }}
              virtual={false}
            />
          </div>
          <div className="flex-1">
            <FlowSelect
              disabled={['not null', 'null'].includes(
                condition.selectCondition
              )}
              value={curentInput(condition)?.schema?.value?.type}
              options={[
                {
                  label: t('workflow.nodes.databaseNode.literal'),
                  value: 'literal',
                },
                {
                  label: t('workflow.nodes.databaseNode.reference'),
                  value: 'ref',
                },
              ]}
              onChange={value =>
                handleChangeInputParam(
                  condition.varIndex,
                  (data, value) => {
                    data.schema.value.type = value;
                    if (value === 'literal') {
                      data.schema.value.content = '';
                    } else {
                      data.schema.value.content = {};
                    }
                  },
                  value
                )
              }
            />
          </div>
          <div className="w-1/4">
            {curentInput(condition)?.schema?.value?.type === 'literal' ? (
              ['in', 'not in'].includes(condition.selectCondition) ? (
                <label
                  onClick={() => handleNotInClick(condition)}
                  className="cursor-pointer"
                >
                  <Input
                    value={getTextArray(condition)}
                    style={{ pointerEvents: 'none' }}
                    placeholder={t('workflow.nodes.databaseNode.pleaseEnter')}
                    className="!border-[#e4eaff] h-[30px] !bg-[#fff]"
                    disabled
                  />
                </label>
              ) : (
                <FlowNodeInput
                  nodeId={id}
                  key={condition.selectCondition}
                  disabled={['not null', 'null'].includes(
                    condition.selectCondition
                  )}
                  value={curentInput(condition)?.schema?.value?.content}
                  onChange={value =>
                    handleChangeInputParam(
                      condition.varIndex,
                      (data, value) => {
                        data.schema.value.content = value;
                      },
                      value
                    )
                  }
                />
              )
            ) : (
              <FlowCascader
                value={
                  curentInput(condition)?.schema?.value?.content?.nodeId
                    ? [
                        curentInput(condition)?.schema?.value?.content?.nodeId,
                        curentInput(condition)?.schema?.value?.content?.name,
                      ]
                    : []
                }
                options={references}
                handleTreeSelect={node => {
                  handleChangeInputParam(
                    condition.varIndex,
                    (data, value) => {
                      data.schema.value.content = value.content;
                      // data.schema.type = value.type;
                    },
                    {
                      content: {
                        id: node.id,
                        nodeId: node.originId,
                        name: node.value,
                      },
                      type: node.type,
                    }
                  );
                }}
                onBlur={() => checkNode(id)}
              />
            )}
          </div>
          {(item?.conditions?.length > 1 || mode === 3) && (
            <img
              src={remove}
              className="w-[16px] h-[17px] cursor-pointer"
              alt=""
              onClick={() => handleRemoveLine(condition)}
            />
          )}
        </div>
        <div className="flex-1 flex items-center gap-2.5 text-xs overflow-hidden text-[#F74E43]">
          <div className="flex flex-col w-1/4">{condition.fieldErrMsg}</div>
          <div className="flex flex-col flex-1">
            {condition.compareOperatorErrMsg}
          </div>
          <div className="flex flex-col flex-1"></div>
          <div className="flex flex-col w-1/4">
            {curentInput(condition)?.schema?.value?.contentErrMsg}
          </div>
          {(item?.conditions?.length > 1 || mode === 3) && (
            <span className="flex-shrink-0 w-4"></span>
          )}
        </div>
      </div>
    </div>
  );
};

const ConditionList = ({
  item,
  setOperatorId,
  operatorRef,
  operatorId,
  handleOperatorChange,
  handleFieldChange,
  handleConditionChange,
  checkNode,
  id,
  getFieldOptions,
  getConditionOptions,
  handleChangeInputParam,
  references,
  mode,
  curentInput,
  handleNotInClick,
  getTextArray,
  handleRemoveLine,
}): React.ReactElement => {
  return (
    <div className="flex w-full">
      {item?.conditions.length > 1 && (
        <OperatorSelect
          item={item}
          setOperatorId={setOperatorId}
          operatorRef={operatorRef}
          operatorId={operatorId}
          handleOperatorChange={handleOperatorChange}
        />
      )}
      <div className="flex-1 overflow-hidden">
        {item?.conditions?.map(condition => (
          <ConditionRow
            key={condition.id}
            condition={condition}
            handleFieldChange={handleFieldChange}
            handleConditionChange={handleConditionChange}
            checkNode={checkNode}
            id={id}
            getFieldOptions={getFieldOptions}
            getConditionOptions={getConditionOptions}
            handleChangeInputParam={handleChangeInputParam}
            references={references}
            item={item}
            mode={mode}
            curentInput={curentInput}
            handleNotInClick={handleNotInClick}
            getTextArray={getTextArray}
            handleRemoveLine={handleRemoveLine}
          />
        ))}
      </div>
    </div>
  );
};

const useConditionActions = ({
  id,
  setNode,
  takeSnapshot,
  autoSaveCurrentFlow,
  canPublishSetNot,
  fieldOptions,
}): UseConditionActionsReturnProps => {
  const handleAddLine = useCallback(() => {
    takeSnapshot();
    setNode(id, old => {
      const uid = uuid();
      old.data.inputs = [
        ...old.data.inputs,
        {
          id: uid,
          type: 'range',
          name: uid,
          schema: {
            type: 'string',
            value: {
              type: 'ref',
              content: {
                nodeId: '',
                name: '',
              },
            },
          },
        },
      ];
      const currentCase = old?.data?.nodeParam?.cases[0];
      currentCase.conditions.push({
        id: uuid(),
        fieldName: null,
        varIndex: uid,
        selectCondition: null,
        fieldType: null,
      });
      return {
        ...cloneDeep(old),
      };
    });
    autoSaveCurrentFlow();
    canPublishSetNot();
  }, [takeSnapshot]);
  const handleRemoveLine = useCallback(
    (currentCondition): void => {
      takeSnapshot();
      setNode(id, old => {
        old.data.inputs = old.data.inputs?.filter(
          input => input.id !== currentCondition.varIndex
        );
        const currentCase = old?.data?.nodeParam?.cases[0];
        currentCase.conditions = currentCase.conditions.filter(
          condition => condition.varIndex !== currentCondition.varIndex
        );
        return {
          ...cloneDeep(old),
        };
      });
      canPublishSetNot();
    },
    [takeSnapshot]
  );
  const handleOperatorChange = useCallback(
    (value): void => {
      setNode(id, old => {
        const currentCase = old.data.nodeParam.cases[0];
        currentCase.logicalOperator = value;
        return {
          ...cloneDeep(old),
        };
      });
      autoSaveCurrentFlow();
    },
    [setNode, autoSaveCurrentFlow]
  );
  const handleConditionChange = useCallback(
    (value, currentCondition): void => {
      setNode(id, old => {
        currentCondition.selectCondition = value;
        const currentInput = old.data.inputs.find(
          input => input.id === currentCondition.varIndex
        );
        if (['not null', 'null'].includes(value)) {
          currentInput.schema.value.type = 'literal';
          currentInput.schema.value.content = '';
        }
        if (['not in', 'in'].includes(value)) {
          if (currentInput.schema.value.type === 'literal') {
            currentInput.schema.value.content = '';
          }
        }
        return {
          ...cloneDeep(old),
        };
      });
      autoSaveCurrentFlow();
      canPublishSetNot();
    },
    [setNode, canPublishSetNot, autoSaveCurrentFlow]
  );
  const handleFieldChange = useCallback(
    (value, currentCondition): void => {
      setNode(id, old => {
        const currentInput = old.data.inputs.find(
          input => input.id === currentCondition.varIndex
        );
        const item = fieldOptions.find(item => item.name === value);
        currentInput.schema.type = item.type.toLowerCase();
        currentCondition.fieldType = item.type;
        currentCondition.fieldName = value;
        if (['in', 'not in'].includes(currentCondition.selectCondition)) {
          if (currentInput.schema.value.type === 'literal') {
            currentInput.schema.value.content = '';
          }
        }
        return {
          ...cloneDeep(old),
        };
      });
    },
    [setNode, canPublishSetNot, autoSaveCurrentFlow, fieldOptions]
  );
  return {
    handleAddLine,
    handleConditionChange,
    handleFieldChange,
    handleRemoveLine,
    handleOperatorChange,
  };
};

const useInputHelpers = ({ inputs }): UseInputHelpersReturnProps => {
  const curentInput = useCallback(
    (activeCondition): unknown => {
      return inputs?.find(input => input.id === activeCondition.varIndex);
    },
    [inputs]
  );
  const getTextArray = (activeCondition): unknown => {
    const content = inputs?.find(input => input.id === activeCondition.varIndex)
      ?.schema?.value?.content;
    if (!Array.isArray(content) || !content.length) {
      return '';
    }
    return JSON.stringify(content);
  };
  return {
    curentInput,
    getTextArray,
  };
};

const useNotInModal = ({
  inputs,
  setValidateMsg,
  handleChangeInputParam,
  id,
  delayCheckNode,
  modal,
}): UseNotInModalReturnProps => {
  const { t } = useTranslation();
  const checkArrayElementsType = (arr, type): boolean => {
    if (!arr || arr.length === 0) return true;
    const validators = {
      string: (v): boolean => typeof v === 'string',
      number: (v): boolean => typeof v === 'number' && !Number.isNaN(v),
      integer: (v): boolean => Number.isInteger(v),
    };
    if (!Object.hasOwn(validators, type)) {
      throw new Error();
    }

    const validate = validators[type];
    return arr.every(validate);
  };
  const handleNotInClick = async (activeCondition): Promise<void> => {
    setValidateMsg('');
    const { fieldType } = activeCondition;
    let inputValue = inputs?.find(
      input => input.id === activeCondition.varIndex
    )?.schema?.value?.content;
    if (!inputValue) {
      inputValue = [];
    }
    const handleInputChange = (value): void => {
      setValidateMsg('');
      inputValue = value;
    };

    const handleDocumentPaste = (e: KeyboardEvent): void => {
      const isPasteShortcut =
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'v' || e.key === 'V' || e.keyCode === 86);
      const modalNode = document.querySelector('.modal-confirm-input');
      const activeElement = document.activeElement;
      if (modalNode && modalNode.contains(activeElement)) {
        if (isPasteShortcut) {
          e.stopPropagation();
        }
        return;
      }
      e.stopPropagation();
      e.preventDefault();
    };

    window.addEventListener('keydown', handleDocumentPaste, true);

    await modal.confirm({
      title: t('workflow.nodes.databaseNode.pleaseEnter'),
      icon: null,
      wrapClassName: 'modal-confirm-input',
      className: 'modal-confirm-input-content',
      content: (
        <>
          <ModalContext.Consumer>
            {errMsg => (
              <div>
                <JsonMonacoEditor
                  defaultValue={JSON.stringify(inputValue, null, 2)}
                  onChange={handleInputChange}
                  onValidate={markers => {
                    markers.forEach(m => {
                      if (m.message) {
                        setValidateMsg(
                          t('workflow.nodes.databaseNode.syntaxError')
                        );
                      }
                    });
                  }}
                />
                <div className="text-[#F74E43] text-xs">{errMsg}</div>
              </div>
            )}
          </ModalContext.Consumer>
        </>
      ),
      centered: true,
      onOk(): Promise<void> {
        try {
          const parsed =
            typeof inputValue === 'string'
              ? JSON.parse(inputValue)
              : inputValue;
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (fieldType) {
              const validateType = checkArrayElementsType(
                parsed,
                fieldType.toLowerCase()
              );
              if (!validateType) {
                throw new Error();
              }
            }
            handleChangeInputParam(
              activeCondition.varIndex,
              (data, value) => {
                data.schema.value.content = value;
                data.schema.type = fieldType
                  ? `array-${fieldType.toLowerCase()}`
                  : 'array';
              },
              parsed
            );
            delayCheckNode(id);
            return Promise.resolve();
          }
          throw new Error();
        } catch {
          setValidateMsg(t('workflow.nodes.databaseNode.pleaseCheckType'));
          return Promise.reject();
        }
      },
    });
    window.removeEventListener('keydown', handleDocumentPaste, true);
  };
  return {
    handleNotInClick,
  };
};

function index({ id, data, allFields = [], children }): React.ReactElement {
  const { t } = useTranslation();
  const { handleChangeInputParam, references, inputs } = useNodeCommon({
    id,
    data,
  });
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const setNode = currentStore(state => state.setNode);
  const checkNode = currentStore(state => state.checkNode);
  const delayCheckNode = currentStore(state => state.delayCheckNode);
  const takeSnapshot = currentStore(state => state.takeSnapshot);
  const [showParams, setShowParams] = useState(true);
  const historyVersion = useFlowsManager(state => state.historyVersion);
  const operatorRef = useRef<HTMLDivElement | null>(null);
  const [operatorId, setOperatorId] = useState('');
  const fieldOptions = useMemo(() => {
    return allFields.map((it: unknown) => {
      return {
        ...it,
        label: it.name,
        value: it.name,
      };
    });
  }, [allFields]);

  const mode = useMemo(() => {
    return data?.nodeParam?.mode;
  }, [data]);

  const cases = useMemo(() => {
    return data?.nodeParam?.cases || [];
  }, [data]);

  // 默认值
  useEffect(() => {
    if (!data?.nodeParam?.cases?.length && !historyVersion) {
      // 默认值
      const uid = uuid();
      const initCase = [
        {
          id: uuid(),
          logicalOperator: 'and',
          conditions: [
            {
              id: uuid(),
              fieldName: null,
              varIndex: uid,
              selectCondition: null,
              fieldType: null,
            },
          ],
        },
      ];
      const initInput = [
        {
          id: uid,
          name: uid,
          type: 'range',
          schema: {
            type: 'string',
            value: {
              type: 'ref',
              content: {
                nodeId: '',
                name: '',
              },
            },
          },
        },
      ];
      setNode(id, old => {
        old.data.nodeParam.cases = initCase;
        old.data.inputs = initInput;
        return {
          ...cloneDeep(old),
        };
      });
      autoSaveCurrentFlow();
      canPublishSetNot();
    }
  }, [cases]);

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

  const [modal, contextHolder] = Modal.useModal();
  const [validateMsg, setValidateMsg] = useState('');
  const {
    handleAddLine,
    handleConditionChange,
    handleFieldChange,
    handleRemoveLine,
    handleOperatorChange,
  } = useConditionActions({
    id,
    setNode,
    takeSnapshot,
    autoSaveCurrentFlow,
    canPublishSetNot,
    fieldOptions,
  });

  const { curentInput, getTextArray } = useInputHelpers({ inputs });

  const { handleNotInClick } = useNotInModal({
    inputs,
    setValidateMsg,
    handleChangeInputParam,
    id,
    delayCheckNode,
    modal,
  });

  const getConditionOptions = (type): unknown => {
    if (type === 'time' || type === 'boolean') {
      return conditions.filter(item => !['in', 'not in'].includes(item.value));
    }
    return conditions;
  };

  const getFieldOptions = (selectCondition): unknown => {
    if (['in', 'not in'].includes(selectCondition)) {
      return fieldOptions.filter(
        item => item.type !== 'time' && item.type !== 'boolean'
      );
    }
    return fieldOptions;
  };

  return (
    <ModalContext.Provider value={validateMsg}>
      <FLowCollapse
        label={
          <div
            className="flex items-center w-full gap-2 cursor-pointer"
            onClick={() => setShowParams(!showParams)}
          >
            {children}
          </div>
        }
        content={
          <div className="flex flex-col gap-2.5">
            {cases?.map((item, caseIndex) => (
              <div className="relative" key={caseIndex}>
                <div className="bg-[#F8FAFF] rounded-md p-4">
                  <CaseTitle item={item} mode={mode} />
                  <ConditionList
                    item={item}
                    setOperatorId={setOperatorId}
                    operatorRef={operatorRef}
                    operatorId={operatorId}
                    handleOperatorChange={handleOperatorChange}
                    handleFieldChange={handleFieldChange}
                    handleConditionChange={handleConditionChange}
                    checkNode={checkNode}
                    id={id}
                    getFieldOptions={getFieldOptions}
                    getConditionOptions={getConditionOptions}
                    handleChangeInputParam={handleChangeInputParam}
                    references={references}
                    mode={mode}
                    curentInput={curentInput}
                    handleNotInClick={handleNotInClick}
                    getTextArray={getTextArray}
                    handleRemoveLine={handleRemoveLine}
                  />
                </div>
              </div>
            ))}
            {!canvasesDisabled && (
              <div
                className="w-fit text-[#6356EA] text-xs font-medium inline-flex items-center gap-1.5 pl-4"
                onClick={handleAddLine}
              >
                <img src={inputAddIcon} className="w-3 h-3" alt="" />
                <span>{t('workflow.nodes.databaseNode.add')}</span>
              </div>
            )}
            {contextHolder}
          </div>
        }
      />
    </ModalContext.Provider>
  );
}

export default memo(index);
