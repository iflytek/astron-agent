import { InputParamsData } from '@/types/resource';
import {
  extractAllIdsOptimized,
  generateTypeDefault,
  transformJsonToArray,
} from '@/utils/utils';
import { cloneDeep, uniq } from 'lodash';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import formSelect from '@/assets/imgs/workflow/icon_form_select.png';

import expand from '@/assets/imgs/plugin/icon_fold.png';
import shrink from '@/assets/imgs/plugin/icon_shrink.png';
import { Input, InputNumber, Select } from 'antd';
import { useTranslation } from 'react-i18next';

// 节点查找相关 Hook
const useNodeFinders = (): {
  findNodeById: (tree: InputParamsData[], id: string) => InputParamsData | null;
  findTopAncestorById: (
    nodes: InputParamsData[],
    id: string
  ) => InputParamsData | null;
} => {
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

  const findTopAncestorById = useCallback(
    (nodes: InputParamsData[], id: string) => {
      function recursiveSearch(
        node: InputParamsData
      ): InputParamsData | undefined | void {
        if (node?.id === id) {
          return node;
        }
        if (node?.children && Array.isArray(node?.children)) {
          for (const childNode of node?.children || []) {
            const resultNode = recursiveSearch(childNode);
            if (resultNode) return resultNode;
          }
        }
      }

      for (const node of nodes) {
        const result = recursiveSearch(node);
        if (result) return node;
      }
      return null;
    },
    []
  );

  return {
    findNodeById,
    findTopAncestorById,
  };
};

// 数据添加相关 Hook
const useDataAdders = (
  inputParamsData: InputParamsData[],
  setInputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>,
  setExpandedRowKeys: React.Dispatch<React.SetStateAction<string[]>>,
  findNodeById: (tree: InputParamsData[], id: string) => InputParamsData | null
): {
  handleAddData: () => void;
  handleAddItem: (record: InputParamsData, expandedRowKeys: string[]) => void;
} => {
  const handleAddData = useCallback(() => {
    const newData = {
      id: uuid(),
      name: '',
      description: '',
      type: 'string',
      location: 'query',
      required: true,
      default: '',
      open: true,
      from: 2,
      startDisabled: true,
    };
    setInputParamsData(inputParamsData => [
      ...inputParamsData,
      newData as InputParamsData,
    ]);
  }, [setInputParamsData]);

  const handleAddItem = useCallback(
    (record: InputParamsData, expandedRowKeys: string[]) => {
      const newData = {
        id: uuid(),
        name: '',
        description: '',
        type: 'string',
        location: 'query',
        required: true,
        default: '',
        open: true,
        from: 2,
        startDisabled: true,
      } as InputParamsData;
      newData.fatherType = record.type;
      const currentNode = findNodeById(inputParamsData, record?.id);
      currentNode?.children?.push(newData);
      if (currentNode?.arraySon) {
        newData.arraySon = true;
      }
      setInputParamsData(cloneDeep(inputParamsData));
      if (!expandedRowKeys?.includes(record?.id)) {
        setExpandedRowKeys(expandedRowKeys => [...expandedRowKeys, record?.id]);
      }
    },
    [inputParamsData, setInputParamsData, setExpandedRowKeys, findNodeById]
  );

  return {
    handleAddData,
    handleAddItem,
  };
};

// 参数变更相关 Hook
const useParamsChanger = (
  inputParamsData: InputParamsData[],
  setInputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>,
  setExpandedRowKeys: React.Dispatch<React.SetStateAction<string[]>>,
  findNodeById: (tree: InputParamsData[], id: string) => InputParamsData | null,
  findTopAncestorById: (
    nodes: InputParamsData[],
    id: string
  ) => InputParamsData | null
): {
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void;
} => {
  const handleInputParamsChange = useCallback(
    (id: string, key: string, value: string | number | boolean) => {
      const currentNode =
        findNodeById(inputParamsData, id) || ({} as InputParamsData);

      // Save previous value, don't update if no actual change
      const oldValue = currentNode[key];
      if (oldValue === value) return;

      currentNode[key] = value;

      if (key === 'type' && ['array', 'object'].includes(value as string)) {
        const newData = {
          id: uuid(),
          name: '',
          description: '',
          type: 'string',
          location: 'query',
          required: true,
          default: '',
          open: true,
          from: 2,
        } as InputParamsData;
        newData.fatherType = value;
        if (currentNode.type === 'array') {
          newData.name = '[Array Item]';
          currentNode.default = [];
        } else if (currentNode.type === 'object') {
          delete currentNode.default;
        }
        if (currentNode?.type === 'array' || currentNode?.arraySon) {
          newData.arraySon = true;
        }
        currentNode.children = [newData];
        setExpandedRowKeys(expandedRowKeys => [...expandedRowKeys, id]);
      } else if (key === 'type') {
        currentNode.default = generateTypeDefault(
          value as string
        ) as unknown as InputParamsData;
        delete currentNode.children;
      }

      if (key === 'required' && value && !currentNode?.default) {
        currentNode.open = true;
        currentNode.startDisabled = true;
        currentNode.defalutDisabled = false;
      } else if (key === 'required' && value && currentNode?.default) {
        currentNode.defalutDisabled = true;
      } else if (key === 'required') {
        currentNode.startDisabled = false;
        currentNode.defalutDisabled = false;
      }

      if (key === 'open' && !value) {
        currentNode.defalutDisabled = true;
      } else if (key === 'open') {
        currentNode.defalutDisabled = false;
      }

      if (key === 'default' && !value) {
        currentNode.startDisabled = true;
      } else if (key === 'default') {
        currentNode.startDisabled = false;
      }

      if (key === 'from') {
        if (value === 2) {
          if (currentNode.type === 'array') {
            currentNode.default = [];
          } else if (currentNode.type === 'object') {
            delete currentNode.default;
          } else {
            currentNode.default = '';
          }
        } else {
          delete currentNode.default;
        }
        currentNode.default = '';
      }

      if (key === 'type' && currentNode.arraySon) {
        const topLevelNode = findTopAncestorById(inputParamsData, id);
        if (topLevelNode?.from === 2) {
          topLevelNode.default = [];
        }
      }

      // Use functional update to avoid unnecessary re-renders
      setInputParamsData(prevData => {
        const newData = cloneDeep(prevData);
        return newData;
      });
    },
    [
      inputParamsData,
      setInputParamsData,
      setExpandedRowKeys,
      findNodeById,
      findTopAncestorById,
    ]
  );

  return {
    handleInputParamsChange,
  };
};

// 节点删除相关 Hook
const useNodeDeleter = (): {
  deleteNodeFromTree: (
    tree: InputParamsData[],
    id: string
  ) => InputParamsData[];
} => {
  const deleteNodeFromTree = useCallback(
    (tree: InputParamsData[], id: string) => {
      return tree.reduce((acc: InputParamsData[], node: InputParamsData) => {
        if (node.id === id) {
          return acc;
        }
        if (node.children) {
          node.children = deleteNodeFromTree(node.children, id);
        }
        acc.push(node);
        return acc;
      }, []);
    },
    []
  );

  return {
    deleteNodeFromTree,
  };
};

// 树形展开折叠相关 Hook
const useTreeExpansion = (
  inputParamsData: InputParamsData[]
): {
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

  const collectExpandableKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const collectExpandableKeys = (items: InputParamsData[]): string[] => {
      const keys: string[] = [];
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          keys.push(item.id);
          // Recursively collect keys from nested items
          keys.push(...collectExpandableKeys(item.children));
        }
      });
      return keys;
    };

    const allKeys = collectExpandableKeys(inputParamsData);
    const allKeysSet = new Set(allKeys);

    // Check if structure has actually changed
    const prevKeysSet = collectExpandableKeysRef.current;
    const hasStructuralChange =
      allKeysSet.size !== prevKeysSet.size ||
      [...allKeysSet].some(key => !prevKeysSet.has(key)) ||
      [...prevKeysSet].some(key => !allKeysSet.has(key));

    if (hasStructuralChange) {
      collectExpandableKeysRef.current = allKeysSet;

      setExpandedRowKeys(prevKeys => {
        // Keep expanded keys and add new expandable items
        const validPrevKeys = prevKeys.filter(key => allKeys.includes(key));
        const newKeys = [...new Set([...validPrevKeys, ...allKeys])];
        return newKeys;
      });
    }
  }, [inputParamsData]);

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
    [handleExpand, handleCollapse]
  );

  return {
    expandedRowKeys,
    setExpandedRowKeys,
    handleExpand,
    handleCollapse,
    customExpandIcon,
  };
};

// 输入验证相关 Hook
const useInputValidation = (
  inputParamsData: InputParamsData[],
  setInputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>,
  checkParmas: (value: InputParamsData[], id: string, key: string) => void
): {
  handleCheckInput: (record: InputParamsData, key: string) => void;
} => {
  const handleCheckInput = useCallback(
    (record: InputParamsData, key: string) => {
      checkParmas(inputParamsData, record?.id, key);
      setInputParamsData(cloneDeep(inputParamsData));
    },
    [inputParamsData, setInputParamsData, checkParmas]
  );

  return {
    handleCheckInput,
  };
};

// 输入渲染相关 Hook
const useInputRenderer = (
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void
): {
  renderInput: (record: InputParamsData) => React.ReactNode;
} => {
  const { t } = useTranslation();

  const renderInput = (record: InputParamsData): React.ReactNode => {
    const type = record?.type;
    if (type === 'string') {
      return (
        <Input
          disabled={!!record?.defalutDisabled}
          placeholder={t('common.pleaseEnterDefaultValue')}
          className="global-input params-input"
          value={record?.default as string}
          onChange={e =>
            handleInputParamsChange(record?.id, 'default', e.target.value)
          }
        />
      );
    } else if (type === 'boolean') {
      return (
        <Select
          placeholder={t('common.pleaseSelect')}
          suffixIcon={<img src={formSelect} className="w-4 h-4 " />}
          options={[
            { label: 'true', value: true },
            { label: 'false', value: false },
          ]}
          style={{ lineHeight: '40px', height: '40px' }}
          value={record?.default}
          onChange={value =>
            handleInputParamsChange(record?.id, 'default', value as string)
          }
        />
      );
    } else if (type === 'integer') {
      return (
        <InputNumber
          disabled={!!record?.defalutDisabled}
          placeholder={t('common.pleaseEnterDefaultValue')}
          step={1}
          precision={0}
          controls={false}
          style={{ lineHeight: '40px', height: '40px' }}
          className="w-full global-input params-input"
          value={record?.default as string}
          onChange={value =>
            handleInputParamsChange(record?.id, 'default', value as string)
          }
        />
      );
    } else if (type === 'number') {
      return (
        <InputNumber
          disabled={!!record?.defalutDisabled}
          placeholder={t('common.pleaseEnterDefaultValue')}
          className="w-full global-input params-input"
          controls={false}
          style={{ lineHeight: '40px' }}
          value={record?.default as string}
          onChange={value =>
            handleInputParamsChange(record?.id, 'default', value as string)
          }
        />
      );
    }
    return null;
  };

  return {
    renderInput,
  };
};

// 模态框状态管理 Hook
const useModalStates = (): {
  arrayDefaultModal: boolean;
  setArrayDefaultModal: React.Dispatch<React.SetStateAction<boolean>>;
  currentArrayDefaultId: string;
  setCurrentArrayDefaultId: React.Dispatch<React.SetStateAction<string>>;
  modalVisible: boolean;
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
} => {
  const [arrayDefaultModal, setArrayDefaultModal] = useState(false);
  const [currentArrayDefaultId, setCurrentArrayDefaultId] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  return {
    arrayDefaultModal,
    setArrayDefaultModal,
    currentArrayDefaultId,
    setCurrentArrayDefaultId,
    modalVisible,
    setModalVisible,
  };
};

// JSON processing related Hook
const useJsonProcessor = (
  setInputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>,
  setModalVisible: (value: boolean) => void,
  setExpandedRowKeys: React.Dispatch<React.SetStateAction<string[]>>
): {
  handleJsonSubmit: (jsonData: string) => void;
} => {
  const handleJsonSubmit = (jsonData: string): void => {
    try {
      const jsonDataArray = transformJsonToArray(
        JSON.parse(jsonData)
      ) as InputParamsData[];
      setInputParamsData(inputParamsData => [
        ...inputParamsData,
        ...jsonDataArray,
      ]);
      setModalVisible(false);
      const ids = extractAllIdsOptimized(jsonDataArray);
      setExpandedRowKeys(expandedRowKeys => uniq([...expandedRowKeys, ...ids]));
    } catch (error) {
      console.error('JSON parsing Error:', error);
    }
  };

  return {
    handleJsonSubmit,
  };
};

// 菜单项相关 Hook
const useMenuItems = (
  handleAddData: () => void,
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>
): {
  items: { key: string; label: React.ReactNode; onClick: () => void }[];
} => {
  const { t } = useTranslation();

  const items = [
    {
      key: '1',
      label: (
        <span className="hover:text-[#6356EA]">
          {t('workflow.nodes.common.manuallyAdd')}
        </span>
      ),
      onClick: handleAddData,
    },
    {
      key: '2',
      label: (
        <span className="hover:text-[#6356EA]">
          {t('workflow.nodes.common.jsonExtract')}
        </span>
      ),
      onClick: (): void => {
        setModalVisible(true);
      },
    },
  ];

  return {
    items,
  };
};

export const useToolInputParameters = ({
  inputParamsData,
  setInputParamsData,
  checkParmas,
}: {
  inputParamsData: InputParamsData[];
  setInputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>;
  checkParmas: (value: InputParamsData[], id: string, key: string) => void;
}): {
  items: { key: string; label: React.ReactNode; onClick: () => void }[];
  handleJsonSubmit: (jsonData: string) => void;
  renderInput: (record: InputParamsData) => React.ReactNode;
  customExpandIcon: (params: {
    expanded: boolean;
    record: InputParamsData;
  }) => React.ReactNode;
  handleAddData: () => void;
  handleAddItem: (record: InputParamsData) => void;
  deleteNodeFromTree: (
    tree: InputParamsData[],
    id: string
  ) => InputParamsData[];
  handleExpand: (record: InputParamsData) => void;
  handleCollapse: (record: InputParamsData) => void;
  handleCheckInput: (record: InputParamsData, key: string) => void;
  setExpandedRowKeys: React.Dispatch<React.SetStateAction<string[]>>;
  setInputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>;
  setArrayDefaultModal: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentArrayDefaultId: React.Dispatch<React.SetStateAction<string>>;
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  expandedRowKeys: string[];
  arrayDefaultModal: boolean;
  currentArrayDefaultId: string;
  modalVisible: boolean;
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void;
} => {
  const treeExpansion = useTreeExpansion(inputParamsData);
  const modalStates = useModalStates();
  const nodeFinders = useNodeFinders();
  const dataAdders = useDataAdders(
    inputParamsData,
    setInputParamsData,
    treeExpansion.setExpandedRowKeys,
    nodeFinders.findNodeById
  );
  const paramsChanger = useParamsChanger(
    inputParamsData,
    setInputParamsData,
    treeExpansion.setExpandedRowKeys,
    nodeFinders.findNodeById,
    nodeFinders.findTopAncestorById
  );
  const nodeDeleter = useNodeDeleter();
  const inputValidation = useInputValidation(
    inputParamsData,
    setInputParamsData,
    checkParmas
  );
  const inputRenderer = useInputRenderer(paramsChanger.handleInputParamsChange);
  const jsonProcessor = useJsonProcessor(
    setInputParamsData,
    modalStates.setModalVisible,
    treeExpansion.setExpandedRowKeys
  );
  const menuItems = useMenuItems(
    dataAdders.handleAddData,
    modalStates.setModalVisible
  );

  const handleAddItem = useCallback(
    (record: InputParamsData) => {
      dataAdders.handleAddItem(record, treeExpansion.expandedRowKeys);
    },
    [dataAdders, treeExpansion.expandedRowKeys]
  );

  return {
    // 菜单项
    items: menuItems.items,
    // JSON processing
    handleJsonSubmit: jsonProcessor.handleJsonSubmit,
    // 输入渲染
    renderInput: inputRenderer.renderInput,
    // 树形展开
    customExpandIcon: treeExpansion.customExpandIcon,
    handleExpand: treeExpansion.handleExpand,
    handleCollapse: treeExpansion.handleCollapse,
    expandedRowKeys: treeExpansion.expandedRowKeys,
    setExpandedRowKeys: treeExpansion.setExpandedRowKeys,
    // 数据操作
    handleAddData: dataAdders.handleAddData,
    handleAddItem,
    deleteNodeFromTree: nodeDeleter.deleteNodeFromTree,
    // 输入验证
    handleCheckInput: inputValidation.handleCheckInput,
    // 状态
    setInputParamsData,
    // 模态框状态
    ...modalStates,
    handleInputParamsChange: paramsChanger.handleInputParamsChange,
  };
};
