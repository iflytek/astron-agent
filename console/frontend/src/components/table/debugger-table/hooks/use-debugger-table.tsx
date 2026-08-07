import { InputParamsData } from '@/types/resource';
import { cloneDeep } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import expand from '@/assets/imgs/plugin/icon_fold.png';
import shrink from '@/assets/imgs/plugin/icon_shrink.png';
import { useTranslation } from 'react-i18next';

export const useDebuggerTable = ({
  debuggerParamsData,
  setDebuggerParamsData,
}: {
  debuggerParamsData: InputParamsData[];
  setDebuggerParamsData: React.Dispatch<
    React.SetStateAction<InputParamsData[]>
  >;
}): {
  expandedRowKeys: string[];
  setExpandedRowKeys: (data: string[]) => void;
  handleExpand: (record: InputParamsData) => void;
  handleCollapse: (record: InputParamsData) => void;
  handleAddItem: (record: InputParamsData) => void;
  deleteNodeFromTree: (
    tree: InputParamsData[],
    id: string
  ) => InputParamsData[];
  customExpandIcon: (params: {
    expanded: boolean;
    record: InputParamsData;
  }) => React.ReactNode;
  handleInputParamsChange: (id: string, value: string) => void;
  handleCheckInput: (record: InputParamsData, key: string) => void;
} => {
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const { t } = useTranslation();
  useEffect(() => {
    const allKeys: string[] = [];
    debuggerParamsData.forEach((item: InputParamsData) => {
      if (item.children) {
        allKeys.push(item.id);
      }
    });
    setExpandedRowKeys(allKeys);
  }, []);

  const handleExpand = useCallback((record: InputParamsData) => {
    setExpandedRowKeys(expandedRowKeys => [...expandedRowKeys, record.id]);
  }, []);

  const handleCollapse = useCallback((record: InputParamsData) => {
    setExpandedRowKeys(expandedRowKeys =>
      expandedRowKeys.filter(id => id !== record.id)
    );
  }, []);

  const updateIds = useCallback((obj: InputParamsData) => {
    const newObj = { ...obj, id: uuid(), default: '' };

    if (newObj.children && Array.isArray(newObj.children)) {
      newObj.children = newObj.children.map(child => updateIds(child));
    }

    return newObj;
  }, []);

  const handleAddItem = useCallback(
    (record: InputParamsData) => {
      const newData = updateIds(
        record?.children?.[0] || ({} as InputParamsData)
      );
      const currentNode =
        findNodeById(debuggerParamsData, record?.id) || ({} as InputParamsData);
      currentNode.children?.push(newData);
      setDebuggerParamsData(cloneDeep(debuggerParamsData));
    },
    [debuggerParamsData, setDebuggerParamsData]
  );

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

  const customExpandIcon = useCallback(
    ({ expanded, record }: { expanded: boolean; record: InputParamsData }) => {
      if (record.children) {
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

  const handleInputParamsChange = useCallback(
    (id: string, value: string) => {
      const currentNode =
        findNodeById(debuggerParamsData, id) || ({} as InputParamsData);
      currentNode.default = value;
      setDebuggerParamsData(cloneDeep(debuggerParamsData));
    },
    [debuggerParamsData, setDebuggerParamsData, setExpandedRowKeys]
  );

  const checkParmas = useCallback(
    (params: InputParamsData[], id: string, key: string) => {
      let passFlag = true;
      const errEsg = t('workflow.nodes.toolNode.pleaseEnterParameterValue');
      const currentNode = findNodeById(params, id) || ({} as InputParamsData);
      if (!currentNode[key]) {
        currentNode[`${key}ErrMsg`] = errEsg;
        passFlag = false;
      } else {
        currentNode[`${key}ErrMsg`] = '';
      }
      return passFlag;
    },
    []
  );

  const handleCheckInput = useCallback(
    (record: InputParamsData, key: string) => {
      checkParmas(debuggerParamsData, record?.id, key);
      setDebuggerParamsData(cloneDeep(debuggerParamsData));
    },
    [debuggerParamsData, setDebuggerParamsData]
  );
  return {
    expandedRowKeys,
    setExpandedRowKeys,
    handleExpand,
    handleCollapse,
    handleAddItem,
    deleteNodeFromTree,
    customExpandIcon,
    handleInputParamsChange,
    handleCheckInput,
  };
};
