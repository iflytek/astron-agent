import { InputParamsData, RecurseData } from '@/types/resource';
import React, { useCallback, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { cloneDeep } from 'lodash';
import { message } from 'antd';
import expand from '@/assets/imgs/plugin/icon_fold.png';
import shrink from '@/assets/imgs/plugin/icon_shrink.png';

const useTreeOperations = (): {
  updateIds: (obj: InputParamsData) => InputParamsData;
  findNodeById: (tree: InputParamsData[], id: string) => InputParamsData | null;
  deleteNodeFromTree: (
    tree: InputParamsData[],
    id: string
  ) => InputParamsData[];
  addTestProperty: (dataArray: InputParamsData[]) => void;
} => {
  const updateIds = useCallback((obj: InputParamsData) => {
    const newObj = { ...obj, id: uuid() };

    if (newObj.children && Array.isArray(newObj.children)) {
      newObj.children = newObj.children.map(child => updateIds(child));
    }

    return newObj;
  }, []);

  const findNodeById = (
    tree: InputParamsData[],
    id: string
  ): InputParamsData | null => {
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

  const deleteNodeFromTree = useCallback(
    (tree: InputParamsData[], id: string) => {
      return tree.reduce((acc, node) => {
        if (node.id === id) {
          return acc;
        }

        if (node.children) {
          node.children = deleteNodeFromTree(node.children, id);
        }

        acc.push(node);
        return acc;
      }, [] as InputParamsData[]);
    },
    []
  );

  function addTestProperty(dataArray: InputParamsData[]): void {
    function addTest(obj: InputParamsData): void {
      obj.subChild = obj?.children?.[0] as InputParamsData;
      obj.id = uuid();

      if (obj.children && Array.isArray(obj.children)) {
        obj.children.forEach(child => addTest(child));
      }
    }

    dataArray.forEach(item => addTest(item));
  }

  return {
    updateIds,
    findNodeById,
    deleteNodeFromTree,
    addTestProperty,
  };
};

const useExpandOperations = (): {
  expandedRowKeys: string[];
  setExpandedRowKeys: React.Dispatch<React.SetStateAction<string[]>>;
  handleExpand: (record: InputParamsData) => void;
  handleCollapse: (record: InputParamsData) => void;
  customExpandIcon: (params: {
    expanded: boolean;
    record: InputParamsData;
  }) => React.ReactNode;
} => {
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const handleExpand = useCallback((record: InputParamsData) => {
    setExpandedRowKeys(expandedRowKeys => [...expandedRowKeys, record.id]);
  }, []);

  const handleCollapse = useCallback((record: InputParamsData) => {
    setExpandedRowKeys(expandedRowKeys =>
      expandedRowKeys.filter(id => id !== record.id)
    );
  }, []);

  const customExpandIcon = useCallback(
    ({ expanded, record }: { expanded: boolean; record: InputParamsData }) => {
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

  return {
    expandedRowKeys,
    setExpandedRowKeys,
    handleExpand,
    handleCollapse,
    customExpandIcon,
  };
};

const useDataTransform = (): {
  transformInputDataToDefaultParamsData: (
    data: InputParamsData[]
  ) => InputParamsData[];
  applyDefaults: (
    child: InputParamsData,
    defaultValue: RecurseData
  ) => InputParamsData;
  transformDefaultParamsDataToDefaultData: (
    data: InputParamsData[]
  ) => InputParamsData[];
} => {
  const transformInputDataToDefaultParamsData = useCallback(
    (data: InputParamsData[]) => {
      // 递归函数：处理嵌套的对象和数组
      function recurse(
        node: InputParamsData,
        defaultVal: RecurseData | undefined,
        parentId: string
      ): void {
        node.id = parentId ? `${parentId}-${uuid()}` : uuid();
        if (node.type === 'object') {
          (node.children || []).forEach(child => {
            const childDefaultValue =
              defaultVal && typeof defaultVal === 'object'
                ? defaultVal[child.name]
                : undefined;
            recurse(child, childDefaultValue, node.id);
          });
        } else if (node.type === 'array') {
          const arrayDefault = Array.isArray(defaultVal) ? defaultVal : [];

          if (arrayDefault.length > 0) {
            // If there are saved default values, create children based on saved data
            const template = node.children?.[0] || node.subChild;
            if (template) {
              node.children = arrayDefault.map((savedValue, index) => {
                const newChild = cloneDeep(template);
                newChild.id = `${node.id}-${uuid()}`; // Ensure unique ID
                newChild.default = savedValue;
                recurse(newChild, savedValue, node.id);
                return newChild;
              });
            }
          } else if (node.children) {
            // If no saved values but has template children, keep original logic
            node.children = node.children.map((childNode, index) => {
              childNode.default = arrayDefault[index];
              recurse(childNode, arrayDefault[index], node.id);
              return childNode;
            });
          }
        } else {
          // For basic types, directly set default value
          node.default = defaultVal !== undefined ? defaultVal : node.default;
        }
      }

      data.forEach(node => {
        recurse(node, node.default as RecurseData, node.id);
      });

      return data;
    },
    []
  );

  const applyDefaults = useCallback(
    (child: InputParamsData, defaultValue: RecurseData) => {
      const newChild = { ...child };

      if (
        Array.isArray(defaultValue) &&
        newChild.type === 'array' &&
        newChild.children
      ) {
        newChild.children = defaultValue.map((value, i) => {
          const childTemplate = newChild.children?.[0]
            ? { ...newChild.children[0] }
            : ({} as InputParamsData);
          return applyDefaults(childTemplate, value);
        });
      } else if (typeof defaultValue !== 'undefined') {
        newChild.default = defaultValue;
      }

      return newChild;
    },
    []
  );

  const transformDefaultParamsDataToDefaultData = useCallback(
    (data: InputParamsData[]) => {
      function recurse(
        node: InputParamsData
      ): InputParamsData[] | InputParamsData {
        if (node.type === 'object') {
          const obj = {} as Record<string, InputParamsData>;
          (node.children || []).forEach(child => {
            obj[child.name] = recurse(child) as InputParamsData;
          });
          return obj as unknown as InputParamsData;
        } else if (node.type === 'array') {
          return node.children && node.children.length > 0
            ? (node.children.map(recurse) as InputParamsData[])
            : ([
                recurse(node.subChild || ({} as InputParamsData)),
              ] as InputParamsData[]);
        } else {
          return node.default !== undefined
            ? (node.default as unknown as InputParamsData)
            : (null as unknown as InputParamsData);
        }
      }

      return data.map(recurse).flat();
    },
    []
  );

  return {
    transformInputDataToDefaultParamsData,
    applyDefaults,
    transformDefaultParamsDataToDefaultData,
  };
};

const useValidation = (): {
  validateTransformedData: (data: InputParamsData[]) => {
    validatedData: InputParamsData[];
    flag: boolean;
  };
  checkParmas: (params: InputParamsData[], id: string, key: string) => boolean;
} => {
  const validateTransformedData = (
    data: InputParamsData[]
  ): { validatedData: InputParamsData[]; flag: boolean } => {
    let flag = true;

    const validate = (items: InputParamsData[]): InputParamsData[] => {
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

  const checkParmas = useCallback(
    (params: InputParamsData[], id: string, key: string) => {
      let passFlag = true;
      const errEsg = '请输入参数值';
      const findNodeById = (
        tree: InputParamsData[],
        id: string
      ): InputParamsData | null => {
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

      const currentNode = findNodeById(params, id) || ({} as InputParamsData);
      if (currentNode?.required && !currentNode[key as keyof InputParamsData]) {
        currentNode[`${key}ErrMsg` as keyof InputParamsData] = errEsg;
        passFlag = false;
      } else {
        currentNode[`${key}ErrMsg` as keyof InputParamsData] = '';
      }
      return passFlag;
    },
    []
  );

  return {
    validateTransformedData,
    checkParmas,
  };
};

export const useArrayDefault = ({
  currentArrayDefaultId,
  inputParamsData,
  setInputParamsData,
  setArrayDefaultModal,
}: {
  currentArrayDefaultId: string;
  inputParamsData: InputParamsData[];
  setInputParamsData: (data: InputParamsData[]) => void;
  setArrayDefaultModal: (data: boolean) => void;
}): {
  handleAddItem: (record: InputParamsData) => void;
  handleExpand: (record: InputParamsData) => void;
  handleCollapse: (record: InputParamsData) => void;
  customExpandIcon: (params: {
    expanded: boolean;
    record: InputParamsData;
  }) => React.ReactNode;
  handleInputParamsChange: (
    id: string,
    value: string | number | boolean
  ) => void;
  handleCheckInput: (record: InputParamsData, key: string) => void;
  handleSaveData: () => void;
  deleteNodeFromTree: (
    tree: InputParamsData[],
    id: string
  ) => InputParamsData[];
  defaultParamsData: InputParamsData[];
  setDefaultParamsData: (data: InputParamsData[]) => void;
  expandedRowKeys: string[];
} => {
  const [defaultParamsData, setDefaultParamsData] = useState<InputParamsData[]>(
    []
  );

  const { updateIds, findNodeById, addTestProperty, deleteNodeFromTree } =
    useTreeOperations();

  const {
    expandedRowKeys,
    setExpandedRowKeys,
    handleExpand,
    handleCollapse,
    customExpandIcon,
  } = useExpandOperations();

  const {
    transformInputDataToDefaultParamsData,
    transformDefaultParamsDataToDefaultData,
  } = useDataTransform();

  const { validateTransformedData, checkParmas } = useValidation();

  const handleAddItem = useCallback(
    (record: InputParamsData) => {
      const newData = updateIds(record?.subChild || ({} as InputParamsData));
      const currentNode = findNodeById(defaultParamsData, record?.id);
      currentNode?.children?.push(newData);
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

  const handleInputParamsChange = useCallback(
    (id: string, value: string | number | boolean) => {
      const currentNode =
        findNodeById(defaultParamsData, id) || ({} as InputParamsData);
      currentNode.default = value as string;
      setDefaultParamsData(cloneDeep(defaultParamsData));
    },
    [defaultParamsData, setDefaultParamsData, setExpandedRowKeys]
  );

  const checkParmasTable = useCallback(() => {
    const { validatedData, flag } = validateTransformedData(defaultParamsData);
    setDefaultParamsData(cloneDeep(validatedData));
    return flag;
  }, [defaultParamsData, setDefaultParamsData]);

  const handleSaveData = useCallback(() => {
    const flag = checkParmasTable();
    if (!flag) {
      message.warning('存在未填写的必填参数，请检查后再试');
      return;
    }
    const currentNode =
      findNodeById(inputParamsData, currentArrayDefaultId) ||
      ({} as InputParamsData);
    const defaultArr =
      transformDefaultParamsDataToDefaultData(defaultParamsData);

    currentNode.default = defaultArr as unknown as InputParamsData;
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

  const handleCheckInput = useCallback(
    (record: InputParamsData, key: string) => {
      checkParmas(defaultParamsData, record?.id, key);
      setDefaultParamsData(cloneDeep(defaultParamsData));
    },
    [defaultParamsData, setDefaultParamsData]
  );

  useEffect(() => {
    if (currentArrayDefaultId) {
      const currentNode = findNodeById(inputParamsData, currentArrayDefaultId);

      if (!currentNode) {
        console.warn(`Node with ID ${currentArrayDefaultId} not found`);
        return;
      }

      const copyCurrentNode = cloneDeep([currentNode]) as InputParamsData[];
      addTestProperty(copyCurrentNode);
      const defaultParamsData =
        transformInputDataToDefaultParamsData(copyCurrentNode);

      setDefaultParamsData(defaultParamsData);
      const allKeys: string[] = [];
      defaultParamsData[0]?.children?.forEach(item => {
        allKeys.push(item.id);
      });
      setExpandedRowKeys([defaultParamsData[0]?.id || '', ...allKeys]);
    }
  }, [currentArrayDefaultId, inputParamsData]);

  return {
    handleAddItem,
    handleExpand,
    handleCollapse,
    customExpandIcon,
    handleInputParamsChange,
    handleCheckInput,
    handleSaveData,
    deleteNodeFromTree,
    defaultParamsData,
    setDefaultParamsData,
    expandedRowKeys,
  };
};
