import { InputParamsData } from '@/types/resource';
import { useEffect, useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { cloneDeep } from 'lodash';
import expand from '@/assets/imgs/plugin/icon_fold.png';
import shrink from '@/assets/imgs/plugin/icon_shrink.png';
import React from 'react';

export const useTableLogic = ({
  outputParamsData,
  setOutputParamsData,
  checkParmas,
}: {
  outputParamsData: InputParamsData[];
  setOutputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>;
  checkParmas: (value: InputParamsData[], id: string, key: string) => void;
}): {
  handleAddData: () => void;
  handleInputParamsChange: (
    id: string,
    key: string,
    value: string | number | boolean
  ) => void;
  handleAddItem: (record: InputParamsData) => void;
  deleteNodeFromTree: (
    tree: InputParamsData[],
    id: string
  ) => InputParamsData[];
  handleExpand: (record: InputParamsData) => void;
  handleCollapse: (record: InputParamsData) => void;
  customExpandIcon: (params: {
    expanded: boolean;
    record: InputParamsData;
  }) => React.ReactNode;
  handleCheckInput: (record: InputParamsData, key: string) => void;
  expandedRowKeys: string[];
  setExpandedRowKeys: React.Dispatch<React.SetStateAction<string[]>>;
} => {
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  useEffect(() => {
    const allKeys: string[] = [];
    outputParamsData.forEach(item => {
      if (item.children) {
        allKeys.push(item.id);
      }
    });
    setExpandedRowKeys(allKeys);
  }, []);

  const handleAddData = useCallback(() => {
    const newData = {
      id: uuid(),
      name: '',
      description: '',
      type: 'string',
      open: true,
    } as unknown as InputParamsData;
    setOutputParamsData(outputParamsData => [...outputParamsData, newData]);
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

  const handleInputParamsChange = useCallback(
    (id: string, key: string, value: string | number | boolean) => {
      const currentNode =
        findNodeById(outputParamsData, id) || ({} as InputParamsData);
      currentNode[key] = value;
      if (key === 'type' && ['array', 'object'].includes(value as string)) {
        const newData = {
          id: uuid(),
          name: '',
          description: '',
          type: 'string',
          open: true,
        } as unknown as InputParamsData;
        newData.fatherType = value;
        if (currentNode.type === 'array') {
          newData.name = '[Array Item]';
        }
        if (currentNode?.type === 'array' || currentNode?.arraySon) {
          newData.arraySon = true;
        }
        currentNode.children = [newData];
        setExpandedRowKeys(expandedRowKeys => [...expandedRowKeys, id]);
      } else if (key === 'type') {
        delete currentNode.children;
      }
      setOutputParamsData(cloneDeep(outputParamsData));
    },
    [outputParamsData, setOutputParamsData, setExpandedRowKeys]
  );

  const handleAddItem = useCallback(
    (record: InputParamsData) => {
      const newData = {
        id: uuid(),
        name: '',
        description: '',
        type: 'string',
        open: true,
      } as unknown as InputParamsData;
      newData.fatherType = record.type;
      const currentNode =
        findNodeById(outputParamsData, record?.id) || ({} as InputParamsData);
      currentNode?.children?.push(newData);
      setOutputParamsData(cloneDeep(outputParamsData));
      if (!expandedRowKeys?.includes(record?.id)) {
        setExpandedRowKeys(expandedRowKeys => [...expandedRowKeys, record?.id]);
      }
    },
    [expandedRowKeys, setExpandedRowKeys, outputParamsData, setOutputParamsData]
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

  const handleCheckInput = useCallback(
    (record: InputParamsData, key: string) => {
      checkParmas(outputParamsData, record?.id, key);
      setOutputParamsData(cloneDeep(outputParamsData));
    },
    [outputParamsData, setOutputParamsData]
  );
  return {
    handleAddItem,
    deleteNodeFromTree,
    handleInputParamsChange,
    handleAddData,
    handleExpand,
    handleCollapse,
    customExpandIcon,
    handleCheckInput,
    expandedRowKeys,
    setExpandedRowKeys,
  };
};
