import React, { useState, FC } from 'react';
import { Form, Table, Dropdown } from 'antd';

import { uniq } from 'lodash';
import { useTranslation } from 'react-i18next';
import JsonEditorModal from '@/components/modal/json-modal';
import { convertToDesiredFormat, extractAllIdsOptimized } from '@/utils/utils';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';

import { InputParamsData, ToolItem } from '@/types/resource';

import { useTableLogic } from './hooks/use-table-logic';
import { useColumns } from './hooks/use-columns';

const typeOptions = [
  {
    label: 'String',
    value: 'string',
  },
  {
    label: 'Number',
    value: 'number',
  },
  {
    label: 'Integer',
    value: 'integer',
  },
  {
    label: 'Boolean',
    value: 'boolean',
  },
  {
    label: 'Array',
    value: 'array',
  },
  {
    label: 'Object',
    value: 'object',
  },
];

const ToolOutputParameters: FC<{
  outputParamsData: InputParamsData[];
  setOutputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>;
  checkParmas: (value: InputParamsData[], id: string, key: string) => void;
  selectedCard: ToolItem;
}> = ({
  outputParamsData,
  setOutputParamsData,
  checkParmas,
  selectedCard = {} as ToolItem,
}) => {
  const { t } = useTranslation();
  const {
    handleInputParamsChange,

    handleAddItem,
    deleteNodeFromTree,
    handleAddData,
    expandedRowKeys,
    customExpandIcon,
    setExpandedRowKeys,
    handleCheckInput,
  } = useTableLogic({
    outputParamsData,
    setOutputParamsData,
    checkParmas,
  });
  const { columns } = useColumns({
    handleInputParamsChange,
    handleCheckInput,
    handleAddItem,
    deleteNodeFromTree,
    outputParamsData,
    setOutputParamsData,
    typeOptions,
  });

  const [modalVisible, setModalVisible] = useState(false);
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

  const handleJsonSubmit = (jsonData: string): void => {
    try {
      const jsonDataArray = convertToDesiredFormat(
        JSON.parse(jsonData)
      ) as InputParamsData[];
      setOutputParamsData(outputParamsData => [
        ...outputParamsData,
        ...jsonDataArray,
      ]);
      setModalVisible(false);
      const ids = extractAllIdsOptimized(jsonDataArray);
      setExpandedRowKeys(expandedRowKeys => uniq([...expandedRowKeys, ...ids]));
    } catch (error) {
      console.error('JSON parsing Error:', error);
    }
  };

  return (
    <>
      <Form.Item
        name="aa"
        className="label-full"
        label={
          <div className="flex items-center justify-between w-full gap-1">
            <span className="text-base font-medium">
              {t('workflow.nodes.toolNode.configureOutputParameters')}
            </span>
            {!selectedCard?.id && (
              <Dropdown
                menu={{
                  items,
                }}
                placement="bottomLeft"
              >
                <div className="flex items-center gap-1.5 text-[#6356EA] cursor-pointer">
                  <img src={inputAddIcon} className="w-2.5 h-2.5" alt="" />
                  <span>{t('workflow.nodes.common.add')}</span>
                </div>
              </Dropdown>
            )}
          </div>
        }
      >
        <Table
          className="mt-4 tool-params-table"
          pagination={false}
          columns={columns}
          dataSource={outputParamsData}
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
      </Form.Item>
      <JsonEditorModal
        visible={modalVisible}
        onConfirm={handleJsonSubmit}
        onCancel={() => setModalVisible(false)}
      />
    </>
  );
};

export default ToolOutputParameters;
