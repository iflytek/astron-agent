import React, { useState, useCallback, useEffect } from 'react';
import { Tooltip, Table, Input, Button, message } from 'antd';
import { v4 as uuid } from 'uuid';
import { cloneDeep } from 'lodash';
import { capitalizeFirstLetter } from '@/components/workflow/utils/reactflowUtils';

import close from '@/assets/imgs/workflow/modal-close.png';
import addItemIcon from '@/assets/imgs/workflow/add-item-icon.png';
import expand from '@/assets/imgs/plugin/icon_fold.png';
import shrink from '@/assets/imgs/plugin/icon_shrink.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';

function ArrayDefault({
  setArrayDefaultModal,
  currentArrayDefaultId,
  inputParamsData,
  setInputParamsData,
}): React.ReactElement {
  const [defaultParamsData, setDefaultParamsData] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const updateIds = useCallback((obj): unknown => {
    const newObj = { ...obj, id: uuid() };

    if (newObj.children && Array.isArray(newObj.children)) {
      newObj.children = newObj.children.map(child => updateIds(child));
    }

    return newObj;
  }, []);

  const handleAddItem = useCallback(
    (record): void => {
      const newData = updateIds(record?.subChild);
      const currentNode = findNodeById(defaultParamsData, record?.id);
      currentNode.children.push(newData);
      setDefaultParamsData(cloneDeep(defaultParamsData));
      if (!expandedRowKeys?.includes(newData?.id)) {
        setExpandedRowKeys(expandedRowKeys => [
          ...expandedRowKeys,
          newData?.id,
        ]);
      }
    },
    [expandedRowKeys, defaultParamsData, setDefaultParamsData]
  );

  const handleExpand = useCallback(record => {
    setExpandedRowKeys(expandedRowKeys => [...expandedRowKeys, record.id]);
  }, []);

  const handleCollapse = useCallback(record => {
    setExpandedRowKeys(expandedRowKeys =>
      expandedRowKeys.filter(id => id !== record.id)
    );
  }, []);

  const customExpandIcon = useCallback(
    ({ expanded, onExpand, record }): React.ReactElement => {
      if (record.children) {
        return expanded ? (
          <img
            src={shrink}
            className="inline-block w-4 h-4 mb-1 mr-1"
            onClick={e => {
              e.stopPropagation();
              handleCollapse(record);
            }}
          />
        ) : (
          <img
            src={expand}
            className="inline-block w-4 h-4 mb-1 mr-1"
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

  const findNodeById = (tree, id): unknown => {
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
    (id, value): void => {
      const currentNode = findNodeById(defaultParamsData, id);
      currentNode.default = value;
      setDefaultParamsData(cloneDeep(defaultParamsData));
    },
    [defaultParamsData, setDefaultParamsData, setExpandedRowKeys]
  );

  function addTestProperty(dataArray): void {
    function addTest(obj): void {
      obj.subChild = obj?.children?.[0];
      obj.id = uuid();

      if (obj.children && Array.isArray(obj.children)) {
        obj.children.forEach(child => addTest(child));
      }
    }

    dataArray.forEach(item => addTest(item));
  }

  const transformInputDataToDefaultParamsData = useCallback((data): unknown => {
    // 递归函数：处理嵌套的对象和数组
    function recurse(node, defaultVal, parentId): void {
      // 为每个节点生成唯一的ID
      node.id = parentId ? `${parentId}-${uuid()}` : uuid();
      // 如果节点是对象类型，递归处理其子节点
      if (node.type === 'object') {
        // 对象类型只需要遍历子节点，给每个子节点分配ID
        (node.children || []).forEach(child => {
          // 递归处理每个子节点，default值从父节点传递
          recurse(
            child,
            defaultVal ? defaultVal[child.name] : undefined,
            node.id
          );
        });
      } else if (node.type === 'array') {
        // 数组类型，递归处理数组中的每一项
        const arrayDefault = Array.isArray(defaultVal) ? defaultVal : [];

        // 确保children是数组，并且处理每个数组项
        // node.children = arrayDefault.map((defaultItem, index) => {
        //   const newChild = {
        //     ...cloneDeep(node.children?.[0]), // 使用模板子节点
        //     default: defaultItem, // 这里赋值给每个数组项的默认值
        //     id: `${node.id}-${index}`, // 为每个数组项生成唯一ID
        //   };

        //   // 递归处理每个数组项的子节点
        //   recurse(newChild, defaultItem, newChild.id);

        //   return newChild;
        // });

        node.children = node.children.map((node, index) => {
          node.default = arrayDefault[index];
          // 递归处理每个数组项的子节点
          recurse(node, arrayDefault[index], node.id);

          return node;
        });
      } else {
        // 对于基本类型，直接设置默认值
        node.default = defaultVal !== undefined ? defaultVal : node.default;
      }
    }

    // 遍历所有根节点并开始递归处理
    data.forEach(node => {
      recurse(node, node.default, node.id); // 顶级节点会从自己的default中获取值
    });

    return data;
  }, []);

  const applyDefaults = useCallback((child, defaultValue): unknown => {
    const newChild = { ...child };

    if (
      Array.isArray(defaultValue) &&
      newChild.type === 'array' &&
      newChild.children
    ) {
      newChild.children = defaultValue.map((value, i) => {
        const childTemplate = newChild.children[0]
          ? { ...newChild.children[0] }
          : {};
        return applyDefaults(childTemplate, value);
      });
    } else if (typeof defaultValue !== 'undefined') {
      newChild.default = defaultValue;
    }

    return newChild;
  }, []);

  useEffect(() => {
    if (currentArrayDefaultId) {
      const currentNode = findNodeById(inputParamsData, currentArrayDefaultId);
      const copyCurrentNode = cloneDeep([currentNode]);
      addTestProperty(copyCurrentNode);
      const defaultParamsData =
        transformInputDataToDefaultParamsData(copyCurrentNode);
      setDefaultParamsData(defaultParamsData);
      const allKeys = [];
      defaultParamsData[0]?.children?.forEach(item => {
        allKeys.push(item.id);
      });
      setExpandedRowKeys([defaultParamsData[0]?.id, ...allKeys]);
    }
  }, [currentArrayDefaultId, inputParamsData]);

  const deleteNodeFromTree = useCallback((tree, id): unknown => {
    return tree.reduce((acc, node) => {
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

  const validateTransformedData = (data): unknown => {
    let flag = true;

    const validate = (items): unknown => {
      const newItems = items.map((item, index) => {
        // 校验当前项的 name 字段是否为空
        if (item?.type !== 'object' && item?.type !== 'array') {
          if (item?.required && !item?.default?.toString()?.trim()) {
            item.defaultErrMsg = '值不能为空';
            flag = false;
          } else {
            item.defaultErrMsg = '';
          }
        }
        return item;
      });

      return newItems?.map(item => {
        if (Array.isArray(item.children)) {
          item.children = validate(item.children);
        }
        return item;
      });
    };

    const validatedData = validate(data);
    return { validatedData, flag };
  };

  const transformDefaultParamsDataToDefaultData = useCallback(
    (data): unknown => {
      function recurse(node): unknown {
        if (node.type === 'object') {
          const obj = {};
          (node.children || []).forEach(child => {
            obj[child.name] = recurse(child);
          });
          return obj;
        } else if (node.type === 'array') {
          return node.children && node.children.length > 0
            ? node.children.map(recurse)
            : [recurse(node.subChild)];
        } else {
          return node.default !== undefined ? node.default : null;
        }
      }

      return data.map(recurse).flat();
    },
    []
  );

  const checkParmasTable = useCallback((): void => {
    const { validatedData, flag } = validateTransformedData(defaultParamsData);
    setDefaultParamsData(cloneDeep(validatedData));
    return flag;
  }, [defaultParamsData, setDefaultParamsData]);

  const handleSaveData = useCallback((): void => {
    const flag = checkParmasTable();
    if (!flag) {
      message.warning('存在未填写的必填参数，请检查后再试');
      return;
    }
    const currentNode = findNodeById(inputParamsData, currentArrayDefaultId);
    const defaultArr =
      transformDefaultParamsDataToDefaultData(defaultParamsData);
    currentNode.default = defaultArr;
    setInputParamsData(cloneDeep(inputParamsData));
    setArrayDefaultModal(false);
  }, [
    defaultParamsData,
    setDefaultParamsData,
    inputParamsData,
    setInputParamsData,
    currentArrayDefaultId,
    setArrayDefaultModal,
  ]);

  const checkParmas = useCallback((params, id, key): boolean => {
    let passFlag = true;
    const errEsg = '请输入参数值';
    const currentNode = findNodeById(params, id);
    if (currentNode?.required && !currentNode[key]) {
      currentNode[`${key}ErrMsg`] = errEsg;
      passFlag = false;
    } else {
      currentNode[`${key}ErrMsg`] = '';
    }
    return passFlag;
  }, []);

  const handleCheckInput = useCallback(
    (record, key: string): void => {
      checkParmas(defaultParamsData, record?.id, key);
      setDefaultParamsData(cloneDeep(defaultParamsData));
    },
    [defaultParamsData, setDefaultParamsData]
  );

  const columns = [
    {
      title: '参数名称',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      render: (name: string, record): React.ReactElement => (
        <Tooltip
          title={record?.description}
          overlayClassName="black-tooltip config-secret"
        >
          <div className="flex items-center gap-1">
            <span>{name}</span>
            {record?.required && (
              <span className="text-[#F74E43] flex-shrink-0">*</span>
            )}
            <div className="bg-[#F0F0F0] py-1 px-2.5 rounded text-xs ml-1 flex-shrink-0">
              {capitalizeFirstLetter(record.type)}
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: '参数值',
      dataIndex: 'default',
      key: 'default',
      width: '40%',
      render: (_, record: unknown): React.ReactElement => (
        <div className="w-full">
          {record?.type === 'object' || record?.type === 'array' ? null : (
            <Input
              placeholder="请输入参数值"
              className="global-input inline-input"
              value={record?.default}
              onChange={e => {
                handleInputParamsChange(record?.id, e.target.value);
                handleCheckInput(record, 'default');
              }}
              onBlur={() => handleCheckInput(record, 'default')}
            />
          )}
          <p className="text-[#F74E43] text-xs absolute bottom-0 left-0">
            {record?.defaultErrMsg}
          </p>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'operation',
      width: '5%',
      render: (_, record: unknown): React.ReactElement => (
        <div className="flex items-center gap-2 ">
          {record?.type === 'array' && (
            <Tooltip
              title="添加子项"
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
                onClick={(): void => {
                  setDefaultParamsData(
                    cloneDeep(deleteNodeFromTree(defaultParamsData, record.id))
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
    <div className="mask">
      <div className="modalContent min-w-[624px] flex flex-col min-h-[350px] pr-0">
        <div className="flex items-center justify-between pr-6">
          <div className="text-base font-medium">默认值设置</div>
          <img
            src={close}
            className="w-3 h-3 cursor-pointer"
            alt=""
            onClick={(): void => setArrayDefaultModal(false)}
          />
        </div>
        <div
          className="flex-1 pr-6 overflow-auto"
          style={{
            maxHeight: '50vh',
          }}
        >
          <Table
            className="tool-params-table"
            pagination={false}
            columns={columns}
            dataSource={defaultParamsData}
            expandable={{
              expandIcon: customExpandIcon,
              expandedRowKeys,
            }}
            rowKey={record => record?.id}
            locale={{
              emptyText: (
                <div style={{ padding: '20px' }}>
                  <p className="text-[#333333]">暂无数据</p>
                </div>
              ),
            }}
          />
        </div>
        <div className="flex justify-end pr-6">
          <Button
            type="primary"
            className="px-[40px]"
            onClick={(): void => handleSaveData()}
          >
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ArrayDefault;
