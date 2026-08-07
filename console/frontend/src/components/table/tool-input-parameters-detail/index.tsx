import React, { FC, useCallback, useState } from 'react';
import { Table, Tooltip } from 'antd';

import { useTranslation } from 'react-i18next';

import expand from '@/assets/imgs/plugin/icon_fold.png';
import shrink from '@/assets/imgs/plugin/icon_shrink.png';
import { InputParamsData } from '@/types/resource';
import { ColumnsType } from 'antd/es/table';

const ToolInputParameters: FC<{ inputParamsData: InputParamsData[] }> = ({
  inputParamsData,
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

  const columns: ColumnsType<InputParamsData> = [
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
      render: description => (
        <Tooltip title={description}>
          <div
            className=""
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '90%',
            }}
          >
            {description}
          </div>
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
      title: t('workflow.nodes.toolNode.requestMethod'),
      dataIndex: 'location',
      key: 'location',
      width: '10%',
    },
    {
      title: t('workflow.nodes.toolNode.isRequired'),
      dataIndex: 'required',
      key: 'required',
      width: '7%',
      render: required => (
        <div
          className="inline-block px-4 py-0 rounded-md font-medium"
          style={{
            // background: required ? '#d0eeda' : '#FF6262',
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
      title: t('workflow.nodes.questionAnswerNode.defaultValue'),
      dataIndex: 'default',
      key: 'default',
      width: '10%',
      render: value => value !== undefined && <div>{`${value}`}</div>,
    },
  ];

  return (
    <Table
      className="tool-params-table"
      pagination={false}
      columns={columns}
      dataSource={inputParamsData}
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

export default ToolInputParameters;
