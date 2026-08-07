import React, { FC } from 'react';
import { Table, Form, Dropdown } from 'antd';

import { useTranslation } from 'react-i18next';
import ArrayDefault from '@/components/modal/workflow/array-default';

import JsonEditorModal from '@/components/modal/json-modal';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';

import { InputParamsData, ToolItem } from '@/types/resource';
import { useToolInputParameters } from './hooks/use-tool-input-parameters';
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

const methodsOptions = [
  {
    label: 'Body',
    value: 'body',
  },
  {
    label: 'Path',
    value: 'path',
  },
  {
    label: 'Query',
    value: 'query',
  },
  {
    label: 'Header',
    value: 'header',
  },
];

const ToolInputParameters: FC<{
  inputParamsData: InputParamsData[];
  setInputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>;
  checkParmas: (value: InputParamsData[], id: string, key: string) => void;
  selectedCard: ToolItem;
}> = ({
  inputParamsData,
  setInputParamsData,
  checkParmas,
  selectedCard = {} as ToolItem,
}) => {
  const { t } = useTranslation();
  const {
    items,
    handleJsonSubmit,
    renderInput,
    customExpandIcon,
    handleAddItem,
    deleteNodeFromTree,
    expandedRowKeys,
    arrayDefaultModal,
    setArrayDefaultModal,
    currentArrayDefaultId,
    setCurrentArrayDefaultId,
    modalVisible,
    setModalVisible,
    handleInputParamsChange,
    handleCheckInput,
  } = useToolInputParameters({
    inputParamsData,
    setInputParamsData,
    checkParmas,
  });
  const { columns } = useColumns({
    handleInputParamsChange,
    handleCheckInput,
    renderInput,
    handleAddItem,
    deleteNodeFromTree,
    inputParamsData,
    setInputParamsData,
    typeOptions,
    methodsOptions,
    setArrayDefaultModal,
    setCurrentArrayDefaultId,
  });
  return (
    <>
      {arrayDefaultModal && (
        <ArrayDefault
          currentArrayDefaultId={currentArrayDefaultId}
          inputParamsData={inputParamsData}
          setInputParamsData={setInputParamsData}
          setArrayDefaultModal={setArrayDefaultModal}
        />
      )}
      <Form.Item
        name="aa"
        className="label-full"
        label={
          <div className="flex items-center justify-between w-full gap-1">
            <span className="text-base font-medium">
              {t('workflow.nodes.toolNode.configureInputParameters')}
            </span>
            {/* {!selectedCard?.id && <div
              className='flex items-center gap-1.5 text-[#6356EA] cursor-pointer'
              onClick={handleAddData}
            >
              <img src={inputAddIcon} className='w-2.5 h-2.5' alt="" />
              <span>{t('workflow.nodes.common.add')}</span>
            </div>} */}
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
          dataSource={inputParamsData}
          expandable={{
            expandIconColumnIndex: 0,
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

export default ToolInputParameters;
