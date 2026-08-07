import React, { useMemo, useCallback, useState, memo, useEffect } from 'react';
import { cloneDeep, isEqual } from 'lodash';
import { v4 as uuid } from 'uuid';
import { useTranslation } from 'react-i18next';
import {
  FlowNodeInput,
  FlowSelect,
  FlowCascader,
  FLowCollapse,
} from '@/components/workflow/ui';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';

import desciptionIcon from '@/assets/imgs/workflow/desciption-icon.png';
import { capitalizeFirstLetter } from '@/components/workflow/utils/reactflowUtils';
import { Tooltip, Select } from 'antd';
import { cn } from '@/utils';

const RenderNameCell = ({ item }): React.ReactElement => {
  return (
    <div className="flex flex-col flex-shrink-0 w-1/3">
      <div className="flex items-center w-[204px] relative gap-2.5 overflow-hidden">
        <span className="relative flex items-center gap-1.5 max-w-[100px]">
          <span className="flex-1 text-overflow" title={item?.name}>
            {item.name}
          </span>
          {item?.required && (
            <span className="text-[#F74E43] flex-shrink-0">*</span>
          )}
          {item?.description && (
            <Tooltip title={item?.description} overlayClassName="white-tooltip">
              <img src={desciptionIcon} className="w-[10px] h-[10px]" alt="" />
            </Tooltip>
          )}
        </span>
        <div className="bg-[#F0F0F0] py-1 px-2.5 rounded text-xs ml-1 flex-shrink-0">
          {capitalizeFirstLetter(item?.schema?.type)}
        </div>
      </div>
    </div>
  );
};

const RenderTypeCell = ({
  item,
  handleChangeInputParam,
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col flex-shrink-0 w-1/4">
      <FlowSelect
        value={item?.schema?.value?.type}
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
            item.id,
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
  );
};

const RenderValueCell = ({
  item,
  handleChangeInputParam,
  id,
  references,
  checkNode,
}): React.ReactElement => {
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {item?.schema?.value?.type === 'literal' ? (
        <FlowNodeInput
          nodeId={id}
          value={item?.schema?.value?.content}
          onChange={value =>
            handleChangeInputParam(
              item.id,
              (data, value) => (data.schema.value.content = value),
              value
            )
          }
        />
      ) : (
        <FlowCascader
          value={
            item?.schema?.value?.content?.nodeId
              ? [
                  item?.schema?.value?.content?.nodeId,
                  item?.schema?.value?.content?.name,
                ]
              : []
          }
          options={references}
          handleTreeSelect={node =>
            handleChangeInputParam(
              item.id,
              (data, value) => {
                data.schema.value.content = value.content;
                data.fileType = value.fileType;
              },
              {
                content: {
                  id: node.id,
                  nodeId: node.originId,
                  name: node.value,
                },
                type:
                  node?.parentType === 'array-object'
                    ? `array-${node.type}`
                    : node.type,
                fileType: node?.fileType,
              }
            )
          }
          onBlur={() => {
            checkNode(id);
            autoSaveCurrentFlow();
          }}
        />
      )}
    </div>
  );
};

const InputRow = ({
  item,
  handleChangeInputParam,
  id,
  references,
  checkNode,
  mode,
  setAddDataOptions,
  handleRemoveInputLine,
}): React.ReactElement => {
  return (
    <div key={item.id} className="flex flex-col gap-1">
      <div className="flex items-start gap-3 overflow-hidden">
        <RenderNameCell item={item} />
        <RenderTypeCell
          item={item}
          handleChangeInputParam={handleChangeInputParam}
        />
        <RenderValueCell
          item={item}
          handleChangeInputParam={handleChangeInputParam}
          id={id}
          references={references}
          checkNode={checkNode}
        />
        {(mode == 2 || (mode == 1 && !item.required)) && (
          <img
            src={remove}
            className="w-[16px] h-[17px] flex-shrink-0 mt-1.5"
            style={{
              cursor:
                item?.customParameterType === 'image_understanding'
                  ? 'not-allowed'
                  : 'pointer',
              opacity:
                item?.customParameterType === 'image_understanding' ? 0.5 : 1,
            }}
            onClick={() => {
              setAddDataOptions(addDataOptions => [
                ...addDataOptions,
                {
                  value: uuid(),
                  name: item.name,
                  label: `${item.name}(${item?.schema?.type})`,
                },
              ]);
              handleRemoveInputLine(item.id);
            }}
            alt=""
          />
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-[#F74E43]">
        <div className="flex flex-col w-1/3">{item?.nameErrMsg}</div>
        <div className="flex flex-col w-1/4"></div>
        <div className="flex flex-col flex-1">
          {item?.schema?.value?.contentErrMsg}
        </div>
      </div>
    </div>
  );
};

function index({ id, data, fields, children }): React.ReactElement {
  const {
    references,
    handleChangeInputParam,
    handleChangeNodeParam,
    handleRemoveInputLine,
  } = useNodeCommon({
    id,
    data,
  });
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const historyVersion = useFlowsManager(state => state.historyVersion);
  const setNode = currentStore(state => state.setNode);
  const checkNode = currentStore(state => state.checkNode);
  const delayCheckNode = currentStore(state => state.delayCheckNode);
  const takeSnapshot = currentStore(state => state.takeSnapshot);
  const [showParams, setShowParams] = useState(true);
  const [addDataOptions, setAddDataOptions] = useState<unknown[]>([]);

  const handleAddLine = useCallback(
    (it): void => {
      takeSnapshot();
      setNode(id, old => {
        old.data.inputs.push({
          id: uuid(),
          name: it.name || '',
          required: it.required,
          description: it.description,
          schema: {
            type: it.type,
            value: {
              type: 'ref',
              content: {},
            },
          },
        });
        return {
          ...cloneDeep(old),
        };
      });
      canPublishSetNot();
    },
    [setNode, canPublishSetNot, takeSnapshot]
  );

  const mode = useMemo(() => {
    return data?.nodeParam?.mode;
  }, []);

  const inputs = useMemo(() => {
    const inputList = [];
    if (data.inputs.length) {
      return data.inputs.filter(item => {
        return !isUUIDv4(item.name);
      });
    }
    return inputList;
  }, [data]);

  useEffect(() => {
    if (mode === 1) {
      const tempAdd = fields
        .filter(field => {
          const isExit = inputs.some(input => input.name === field.name);
          return !isExit;
        })
        .map(it => {
          if (!it.required) {
            return {
              value: uuid(),
              name: it.name,
              label: `${it.name}(${it.type})`,
              description: it.description,
              type: it.type,
            };
          }
        })
        .filter(Boolean);
      setAddDataOptions([...tempAdd]);
    }
    if (mode === 2) {
      const tempAdd = fields
        .filter(field => {
          const isExit = inputs.some(input => input.name === field.name);
          return !isExit;
        })
        .map(it => {
          return {
            value: uuid(),
            name: it.name,
            required: it.required,
            label: `${it.name}(${it.type})`,
            description: it.description,
            type: it.type,
          };
        });
      setAddDataOptions([...tempAdd]);
    }
  }, [fields, inputs]);

  function isUUIDv4(id): boolean {
    const uuidV4Pattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Pattern.test(id);
  }

  const handleAddSelect = (value): void => {
    handleAddLine(addDataOptions.find(it => it.value == value));
    addDataOptions.splice(
      addDataOptions.findIndex(it => it.value == value),
      1
    );
    setAddDataOptions([...addDataOptions]);
    delayCheckNode(id);
  };

  useEffect(() => {
    const prevList = data.nodeParam.assignmentList;
    const list = data.inputs
      .filter(it => !isUUIDv4(it.name))
      .map(it => it.name);
    const isRefresh = isEqual(list, prevList);
    if (data?.nodeParam?.mode == 2 && !isRefresh && !historyVersion) {
      handleChangeNodeParam((data, value) => {
        data.assignmentList = value;
      }, list);
    }
  }, [addDataOptions]);

  return (
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
        <div className="px-[18px] rounded-lg overflow-hidden">
          <div className="flex items-center gap-3 text-desc">
            <h4 className="w-1/3">
              {t('workflow.nodes.databaseNode.parameterName')}
            </h4>
            <h4 className="w-1/4">
              {t('workflow.nodes.databaseNode.fieldType')}
            </h4>
            <h4 className="flex-1">
              {t('workflow.nodes.databaseNode.fieldValue')}
            </h4>
            <span className="w-5 h-5"></span>
          </div>
          <div className="flex flex-col gap-3 mt-4">
            {inputs.map(item => {
              return (
                <InputRow
                  item={item}
                  handleChangeInputParam={handleChangeInputParam}
                  id={id}
                  references={references}
                  checkNode={checkNode}
                  mode={mode}
                  setAddDataOptions={setAddDataOptions}
                  handleRemoveInputLine={handleRemoveInputLine}
                />
              );
            })}
          </div>
          <Select
            value={null}
            disabled={!addDataOptions.length}
            style={{ width: 220 }}
            className={cn('flow-select nodrag w-full')}
            dropdownAlign={{ offset: [0, 0] }}
            placeholder={
              <div className="text-[#6356EA] text-xs font-medium mt-1 inline-flex items-center cursor-pointer gap-1.5">
                <img src={inputAddIcon} className="w-3 h-3" alt="" />
                <span>{t('workflow.nodes.databaseNode.add')}</span>
              </div>
            }
            options={addDataOptions}
            onChange={value => handleAddSelect(value)}
          />
          {mode === 2 && (
            <div className="flex items-center mt-1 text-xs text-[#F74E43]">
              {data?.nodeParam?.fieldNameErrMsg}
            </div>
          )}
        </div>
      }
    />
  );
}

export default memo(index);
