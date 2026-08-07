import React, { useCallback, useState, useEffect } from 'react';
import { Table, Tooltip, Input, Select, InputNumber } from 'antd';
import { cloneDeep } from 'lodash';
import { v4 as uuid } from 'uuid';
import { useTranslation } from 'react-i18next';
import { DebugInput, DebugInputBase } from '@/types/plugin-store';

import expand from '@/assets/imgs/tool-square/icon-fold.png';
import shrink from '@/assets/imgs/tool-square/icon-shrink.png';
import addItemIcon from '@/assets/imgs/workflow/add-item-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';
import inputErrorMsg from '@/assets/svgs/input-error-msg.svg';
import formSelect from '@/assets/imgs/workflow/icon-form-select.png';

function DebuggerTable({
  debuggerParamsData,
  setDebuggerParamsData,
  showTitle = true,
}: {
  debuggerParamsData: DebugInput[];
  setDebuggerParamsData: (data: DebugInput[]) => void;
  showTitle?: boolean;
}) {
  const { t } = useTranslation();
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  useEffect(() => {
    const allKeys: string[] = [];
    debuggerParamsData.forEach((item: DebugInput) => {
      if (item.children) {
        allKeys.push(item.id);
      }
    });
    setExpandedRowKeys(allKeys);
  }, []);

  const handleExpand = useCallback((record: DebugInput) => {
    setExpandedRowKeys(expandedRowKeys => [...expandedRowKeys, record.id]);
  }, []);

  const handleCollapse = useCallback((record: DebugInput) => {
    setExpandedRowKeys(expandedRowKeys =>
      expandedRowKeys.filter(id => id !== record.id)
    );
  }, []);

  const updateIds = useCallback((obj: DebugInput) => {
    const newObj = { ...obj, id: uuid(), default: '' };

    if (newObj.children && Array.isArray(newObj.children)) {
      newObj.children = newObj.children.map((child: DebugInput) =>
        updateIds(child)
      );
    }

    return newObj;
  }, []);

  const handleAddItem = useCallback(
    (record: DebugInput) => {
      const newData = updateIds(record?.children?.[0] as DebugInput);
      const currentNode = findNodeById(debuggerParamsData, record?.id);
      if (currentNode) {
        currentNode.children?.push(newData);
      }
      setDebuggerParamsData(cloneDeep(debuggerParamsData));
    },
    [debuggerParamsData, setDebuggerParamsData]
  );

  const deleteNodeFromTree = useCallback((tree: DebugInput[], id: string) => {
    return tree.reduce((acc: DebugInput[], node: DebugInput) => {
      if (node.id === id) {
        return acc;
      }

      if (node.children) {
        node.children = deleteNodeFromTree(node.children, id);
      }

      acc.push(node);
      return acc;
    }, []);
  }, []);

  const customExpandIcon = useCallback(
    ({
      expanded,
      onExpand,
      record,
    }: {
      expanded: boolean;
      onExpand: (
        record: DebugInput,
        e: React.MouseEvent<HTMLImageElement>
      ) => void;
      record: DebugInput;
    }) => {
      if (record?.children) {
        return expanded ? (
          <img
            src={shrink}
            className="w-4 h-4 inline-block mb-1 mr-1"
            onClick={e => {
              e.stopPropagation();
              handleCollapse(record);
            }}
          />
        ) : (
          <img
            src={expand}
            className="w-4 h-4 inline-block mb-1 mr-1"
            onClick={e => {
              e.stopPropagation();
              handleExpand(record);
            }}
          />
        );
      }
      return null;
    },
    []
  );

  const findNodeById = (tree: DebugInput[], id: string): DebugInput | null => {
    for (const node of tree) {
      if (node.id === id) {
        return node;
      }

      if (node.children && node.children.length > 0) {
        const result = findNodeById(node.children, id);
        if (result) {
          return result;
        }
      }
    }

    return null;
  };

  const handleInputParamsChange = useCallback(
    (id: string, value: string | boolean | number) => {
      const currentNode: DebugInput | null = findNodeById(
        debuggerParamsData,
        id
      );
      if (currentNode) {
        currentNode.default = value;
      }
      setDebuggerParamsData(cloneDeep(debuggerParamsData));
    },
    [debuggerParamsData, setDebuggerParamsData, setExpandedRowKeys]
  );

  const checkParmas = useCallback(
    (params: DebugInput[], id: string, key: string) => {
      let passFlag = true;
      const errEsg = t('workflow.nodes.toolNode.pleaseEnterParameterValue');
      const currentNode: DebugInput | null = findNodeById(params, id);
      if (currentNode && !currentNode?.[key as keyof DebugInput]) {
        currentNode[`${key as keyof DebugInputBase}ErrMsg`] = errEsg;
        passFlag = false;
      } else {
        if (currentNode) {
          currentNode[`${key as keyof DebugInputBase}ErrMsg`] = '';
        }
      }
      return passFlag;
    },
    []
  );

  const handleCheckInput = useCallback(
    (record: DebugInput, key: string) => {
      checkParmas(debuggerParamsData, record?.id, key);
      setDebuggerParamsData(cloneDeep(debuggerParamsData));
    },
    [debuggerParamsData, setDebuggerParamsData]
  );

  const renderInput = (record: DebugInput): React.ReactNode => {
    const type = record?.type;
    if (type === 'string') {
      return (
        <Input
          disabled={record?.defalutDisabled || false}
          placeholder={t('common.pleaseEnterDefaultValue')}
          className="global-input params-input"
          value={record?.default as string}
          onChange={e => {
            handleInputParamsChange(record?.id, e.target.value);
            handleCheckInput(record, 'default');
          }}
          onBlur={() => handleCheckInput(record, 'default')}
        />
      );
    } else if (type === 'boolean') {
      return (
        <Select
          placeholder={t('common.pleaseSelect')}
          suffixIcon={<img src={formSelect} className="w-4 h-4 " />}
          options={[
            {
              label: 'true',
              value: true,
            },
            {
              label: 'false',
              value: false,
            },
          ]}
          style={{
            lineHeight: '40px',
            height: '40px',
          }}
          value={record?.default}
          onChange={value => {
            handleInputParamsChange(record?.id, value);
            handleCheckInput(record, 'default');
          }}
          onBlur={() => handleCheckInput(record, 'default')}
        />
      );
    } else if (type === 'integer') {
      return (
        <InputNumber
          disabled={record?.defalutDisabled || false}
          placeholder={t('common.pleaseEnterDefaultValue')}
          step={1}
          precision={0}
          controls={false}
          style={{
            lineHeight: '40px',
            height: '40px',
          }}
          className="global-input params-input w-full"
          value={record?.default as number}
          onChange={value => {
            handleInputParamsChange(record?.id, value as number);
            handleCheckInput(record, 'default');
          }}
          onBlur={() => handleCheckInput(record, 'default')}
        />
      );
    } else if (type === 'number') {
      return (
        <InputNumber
          disabled={record?.defalutDisabled || false}
          placeholder={t('common.pleaseEnterDefaultValue')}
          className="global-input params-input w-full"
          controls={false}
          style={{
            lineHeight: '40px',
          }}
          value={record?.default as number}
          onChange={value => {
            handleInputParamsChange(record?.id, value as number);
            handleCheckInput(record, 'default');
          }}
          onBlur={() => handleCheckInput(record, 'default')}
        />
      );
    } else {
      return null;
    }
  };

  const columns = [
    {
      title: t('workflow.nodes.common.parameterName'),
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      render: (name: string, record: DebugInput) => (
        <Tooltip
          title={record?.description}
          overlayClassName="black-tooltip config-secret"
        >
          {name}
        </Tooltip>
      ),
    },
    {
      title: t('workflow.nodes.common.variableType'),
      dataIndex: 'type',
      key: 'type',
      width: '10%',
    },
    {
      title: t('workflow.nodes.toolNode.isRequired'),
      dataIndex: 'required',
      key: 'required',
      width: '10%',
      render: (required: boolean) => (
        <div
          style={{
            color: required ? '#6356EA' : '#F74E43',
          }}
        >
          {required
            ? t('workflow.nodes.toolNode.yes')
            : t('workflow.nodes.toolNode.no')}
        </div>
      ),
    },
    {
      title: t('workflow.nodes.toolNode.parameterValue'),
      dataIndex: 'default',
      key: 'default',
      width: '40%',
      render: (_: unknown, record: DebugInput) => (
        <div className="w-full flex flex-col gap-1">
          {record?.type === 'object' || record?.type === 'array'
            ? null
            : renderInput(record)}
          {record?.defaultErrMsg && (
            <div className="flex items-center gap-1">
              <img src={inputErrorMsg} className="w-[14px] h-[14px]" alt="" />
              <p className="text-[#F74E43] text-sm">{record?.defaultErrMsg}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('workflow.nodes.toolNode.operation'),
      key: 'operation',
      width: '5%',
      render: (_: unknown, record: DebugInput) => (
        <div className=" flex items-center gap-2">
          {record?.type === 'array' && (
            <Tooltip
              title={t('workflow.nodes.toolNode.addSubItem')}
              overlayClassName="black-tooltip config-secret"
            >
              <img
                src={addItemIcon}
                className="w-4 h-4 mt-1.5 cursor-pointer"
                onClick={() => handleAddItem(record)}
              />
            </Tooltip>
          )}
          {record?.fatherType === 'array' && (
            <Tooltip title="" overlayClassName="black-tooltip config-secret">
              <img
                className="w-4 h-4 cursor-pointer"
                src={remove}
                onClick={() => {
                  setDebuggerParamsData(
                    cloneDeep(deleteNodeFromTree(debuggerParamsData, record.id))
                  );
                }}
                alt=""
              />
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="w-full flex items-center gap-1 justify-between">
        {showTitle && (
          <span className="text-base font-medium">
            {t('workflow.nodes.toolNode.parameterConfiguration')}
          </span>
        )}
      </div>
      <Table
        className="tool-params-table tool-debugger-table mt-6"
        pagination={false}
        columns={columns}
        dataSource={debuggerParamsData}
        expandable={{
          expandIcon: customExpandIcon,
          expandedRowKeys,
        }}
        rowKey={record => record?.id}
        locale={{
          emptyText: (
            <div style={{ padding: '20px' }}>
              <p className="text-[#333333]">
                {t('workflow.nodes.toolNode.noData')}
              </p>
            </div>
          ),
        }}
      />
    </div>
  );
}

export default DebuggerTable;
