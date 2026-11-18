import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, message, Popconfirm, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
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

function WorkflowFiles({ id }: { id: string }): React.ReactElement {
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [artifacts, setArtifacts] = useState<WorkflowArtifact[]>([]);
  const [loading, setLoading] = useState(false);

  const loadArtifacts = (): void => setRevision(value => value + 1);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    setArtifacts([]);
    void listWorkflowArtifacts(id)
      .then(data => {
        if (!ignore) setArtifacts(data || []);
      })
      .catch(() => {
        if (!ignore) setError('文件加载失败，请重试。');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [id, revision]);

  const handleDownload = async (artifact: WorkflowArtifact): Promise<void> => {
    let data;
    try {
      data = await getWorkflowArtifactDownload(artifact.id);
    } catch {
      message.error('无法获取下载链接，请重试。');
      return;
    }
    if (!data.downloadUrl) {
      message.warning('文件暂不可下载');
      return;
    }
    window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (artifact: WorkflowArtifact): Promise<void> => {
    try {
      await deleteWorkflowArtifact(artifact.id);
      message.success('文件已删除');
      loadArtifacts();
    } catch {
      message.error('文件删除失败，请重试。');
    }
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
    <section className="workflow-files-dialog">
      <div className="workflow-dialog-toolbar">
        <p>工作流运行生成的文件，可下载或删除。</p>
        <Button loading={loading} onClick={loadArtifacts}>
          刷新
        </Button>
      </div>
      {error && (
        <Alert
          showIcon
          type="error"
          message={error}
          action={<Button onClick={loadArtifacts}>重试</Button>}
        />
      )}
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={artifacts}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 980 }}
        locale={{
          emptyText: (
            <Empty
              description={
                error
                  ? '文件未加载'
                  : '还没有生成文件。工作流运行产生的文件会显示在这里。'
              }
            />
          ),
        }}
      />
    </section>
  );
}

export default WorkflowFiles;
