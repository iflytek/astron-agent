import React, { useEffect, useMemo, useState } from 'react';
import { Button, Empty, message, Popconfirm, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useParams } from 'react-router-dom';
import FlowHeader from '../components/flow-header';
import { getFlowDetailAPI } from '@/services/flow';
import {
  deleteWorkflowArtifact,
  getWorkflowArtifactDownload,
  listWorkflowArtifacts,
} from '@/services/sandbox';
import type { WorkflowArtifact } from '@/types/sandbox';

const formatFileSize = (value?: number): string => {
  if (!value) {
    return '-';
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

function WorkflowFiles(): React.ReactElement {
  const { id } = useParams();
  const [currentFlow, setCurrentFlow] = useState({});
  const [artifacts, setArtifacts] = useState<WorkflowArtifact[]>([]);
  const [loading, setLoading] = useState(false);

  const loadArtifacts = async (): Promise<void> => {
    if (!id) {
      return;
    }
    setLoading(true);
    try {
      const data = await listWorkflowArtifacts(id);
      setArtifacts(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      return;
    }
    getFlowDetailAPI(id).then(data => {
      setCurrentFlow({ ...(data as Record<string, unknown>) });
    });
    loadArtifacts();
  }, [id]);

  const handleDownload = async (artifact: WorkflowArtifact): Promise<void> => {
    const data = await getWorkflowArtifactDownload(artifact.id);
    if (!data.downloadUrl) {
      message.warning('文件暂不可下载');
      return;
    }
    window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (artifact: WorkflowArtifact): Promise<void> => {
    await deleteWorkflowArtifact(artifact.id);
    message.success('文件已删除');
    await loadArtifacts();
  };

  const columns = useMemo<ColumnsType<WorkflowArtifact>>(
    () => [
      {
        title: '文件名',
        dataIndex: 'fileName',
        ellipsis: true,
        render: (value): React.ReactNode => (
          <span className="font-medium text-[#222529]">{value}</span>
        ),
      },
      {
        title: '来源',
        dataIndex: 'source',
        width: 120,
        render: (value): React.ReactNode => (
          <Tag color="blue">{value || 'skill'}</Tag>
        ),
      },
      {
        title: 'Skill',
        dataIndex: 'skillId',
        width: 180,
        ellipsis: true,
        render: (value): React.ReactNode => value || '-',
      },
      {
        title: '节点',
        dataIndex: 'nodeId',
        width: 180,
        ellipsis: true,
        render: (value): React.ReactNode => value || '-',
      },
      {
        title: '大小',
        dataIndex: 'fileSize',
        width: 110,
        render: formatFileSize,
      },
      {
        title: '生成时间',
        dataIndex: 'createTime',
        width: 180,
        render: (value): React.ReactNode => value || '-',
      },
      {
        title: '操作',
        key: 'action',
        width: 140,
        fixed: 'right',
        render: (_, record): React.ReactNode => (
          <div className="flex items-center gap-3">
            <Button
              type="link"
              className="h-auto p-0"
              onClick={() => handleDownload(record)}
            >
              下载
            </Button>
            <Popconfirm
              title="删除文件"
              description="删除后工作流中不再展示该文件。"
              okText="删除"
              cancelText="取消"
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" danger className="h-auto p-0">
                删除
              </Button>
            </Popconfirm>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      <FlowHeader currentFlow={currentFlow} />
      <div className="px-8 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="m-0 text-[20px] font-medium text-[#222529]">
              工作流文件
            </h1>
            <p className="mt-2 mb-0 text-[13px] text-[#676773]">
              展示当前工作流运行过程中由 Skill 脚本产生并归档的文件。
            </p>
          </div>
          <Button onClick={loadArtifacts}>刷新</Button>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={artifacts}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 980 }}
          locale={{ emptyText: <Empty description="暂无文件" /> }}
        />
      </div>
    </div>
  );
}

export default WorkflowFiles;
