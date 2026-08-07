import React, { FC } from 'react';
import { Table } from 'antd';

import { useTranslation } from 'react-i18next';

import { InputParamsData } from '@/types/resource';

import { useDebuggerTable } from './hooks/use-debugger-table';
import { useRenderInput } from './hooks/use-render-input';
import { useColumns } from './hooks/use-columns';

const DebuggerTable: FC<{
  debuggerParamsData: InputParamsData[];
  setDebuggerParamsData: React.Dispatch<
    React.SetStateAction<InputParamsData[]>
  >;
  showTitle?: boolean;
}> = ({ debuggerParamsData, setDebuggerParamsData, showTitle = true }) => {
  const { t } = useTranslation();
  const {
    handleInputParamsChange,
    handleCheckInput,
    handleAddItem,
    deleteNodeFromTree,
    customExpandIcon,
    expandedRowKeys,
  } = useDebuggerTable({ debuggerParamsData, setDebuggerParamsData });
  const { renderInput } = useRenderInput({
    handleInputParamsChange,
    handleCheckInput,
  });
  const { columns } = useColumns({
    renderInput,
    handleAddItem,
    deleteNodeFromTree,
    debuggerParamsData,
    setDebuggerParamsData,
  });

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
};

export default DebuggerTable;
