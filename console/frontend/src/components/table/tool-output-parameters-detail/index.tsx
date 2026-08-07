import { useState, useCallback, FC } from 'react';
import { Table } from 'antd';

import { useTranslation } from 'react-i18next';

import expand from '@/assets/imgs/plugin/icon_fold.png';
import shrink from '@/assets/imgs/plugin/icon_shrink.png';
import { InputParamsData } from '@/types/resource';

const ToolOutputParameters: FC<{ outputParamsData: InputParamsData[] }> = ({
  outputParamsData,
}) => {
  const { t } = useTranslation();
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

  const columns = [
    {
      title: t('workflow.nodes.common.parameterName'),
      dataIndex: 'name',
      key: 'name',
      width: '20%',
    },
    {
      title: t('workflow.nodes.common.description'),
      dataIndex: 'description',
      key: 'description',
      width: '25%',
    },
    {
      title: t('workflow.nodes.common.variableType'),
      dataIndex: 'type',
      key: 'type',
      width: '10%',
    },
  ];

  return (
    <Table
      className="tool-params-table"
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
  );
};

export default ToolOutputParameters;
