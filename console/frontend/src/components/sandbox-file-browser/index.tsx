import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Alert, Breadcrumb, Button, Empty, Skeleton, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DownloadOutlined,
  FileOutlined,
  FolderOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { downloadSandboxFile, listSandboxFiles } from '@/services/sandbox';
import type { SandboxFileEntry, SandboxFileListing } from '@/types/sandbox';
import { formatFileSize } from '@/utils';

type Resource = { kind: 'agent' | 'workflow'; id: string };
const PAGE_SIZE = 10;

type DirectoryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; listing: SandboxFileListing };

function directoryColumns(
  openDirectory: (path: string) => void,
  download: (entry: SandboxFileEntry) => void
): ColumnsType<SandboxFileEntry> {
  return [
    {
      title: '名称',
      dataIndex: 'name',
      render: (name: string, entry): ReactElement =>
        entry.isDirectory ? (
          <Button
            type="link"
            className="h-auto max-w-full p-0 text-left"
            aria-label={name}
            icon={<FolderOutlined />}
            onClick={() => openDirectory(entry.path)}
          >
            <span className="break-all" title={name}>
              {name}
            </span>
          </Button>
        ) : (
          <span className="flex items-start gap-2 break-all">
            <FileOutlined className="mt-1 shrink-0" />
            {name}
          </span>
        ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      width: 100,
      responsive: ['sm'],
      className: 'tabular-nums',
      render: (size: number, entry): string =>
        entry.isDirectory ? '—' : formatFileSize(size),
    },
    {
      title: '修改时间',
      dataIndex: 'modifiedAt',
      width: 185,
      responsive: ['md'],
      className: 'tabular-nums',
      render: (value: string): string =>
        value ? new Date(value).toLocaleString() : '—',
    },
    {
      title: '操作',
      key: 'action',
      width: 104,
      render: (_, entry): ReactElement | null =>
        entry.isDirectory ? null : (
          <Button
            type="link"
            icon={<DownloadOutlined />}
            aria-label={'下载 ' + entry.name}
            onClick={() => download(entry)}
          >
            下载
          </Button>
        ),
    },
  ];
}

export default function SandboxFileBrowser({
  kind,
  id,
}: Resource): ReactElement {
  return <DirectoryBrowser key={kind + ':' + id} kind={kind} id={id} />;
}

function DirectoryBrowser({ kind, id }: Resource): ReactElement {
  const [path, setPath] = useState('');
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<DirectoryState>({ status: 'loading' });
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const appendRequest = useRef<AbortController | null>(null);
  const loading = state.status === 'loading';

  useEffect(() => {
    const controller = new AbortController();
    void listSandboxFiles(kind, id, path, controller.signal)
      .then(listing => {
        if (!controller.signal.aborted) setState({ status: 'ready', listing });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      });
    return (): void => {
      controller.abort();
      appendRequest.current?.abort();
      appendRequest.current = null;
    };
  }, [kind, id, path, revision]);

  const resetListing = (): void => {
    appendRequest.current?.abort();
    appendRequest.current = null;
    setPage(1);
    setLoadingMore(false);
    setLoadMoreFailed(false);
    setState({ status: 'loading' });
  };
  const openDirectory = (nextPath: string): void => {
    if (path === nextPath) return;
    resetListing();
    setPath(nextPath);
  };
  const refresh = (): void => {
    resetListing();
    setRevision(value => value + 1);
  };
  const loadMore = async (listing: SandboxFileListing): Promise<void> => {
    if (!listing.nextCursor || appendRequest.current) return;
    const controller = new AbortController();
    appendRequest.current = controller;
    setLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const next = await listSandboxFiles(
        kind,
        id,
        path,
        controller.signal,
        listing.nextCursor
      );
      if (controller.signal.aborted) return;
      const entries = [...listing.entries, ...next.entries];
      setState({ status: 'ready', listing: { ...next, entries } });
      if (next.entries.length) {
        setPage(Math.floor(listing.entries.length / PAGE_SIZE) + 1);
      }
    } catch {
      if (!controller.signal.aborted) setLoadMoreFailed(true);
    } finally {
      if (appendRequest.current === controller) {
        appendRequest.current = null;
        setLoadingMore(false);
      }
    }
  };
  const segments = path ? path.split('/') : [];
  const crumbs = ['沙箱目录', ...segments].map((name, index) => {
    const target = segments.slice(0, index).join('/');
    return {
      key: target,
      title:
        target === path ? (
          <span aria-current="location">{name}</span>
        ) : (
          <Button
            type="link"
            className="h-auto p-0"
            onClick={() => openDirectory(target)}
          >
            {name}
          </Button>
        ),
    };
  });

  return (
    <section
      aria-label="沙箱文件"
      aria-busy={loading || loadingMore}
      className="min-w-0"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <Breadcrumb className="min-w-0 flex-1 break-all" items={crumbs} />
        <Button
          aria-label="刷新"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={refresh}
        >
          刷新
        </Button>
      </div>
      {loading && <Skeleton active title={false} paragraph={{ rows: 4 }} />}
      {state.status === 'error' && (
        <Alert
          showIcon
          type="error"
          message="无法读取沙箱目录。请确认本地沙箱已启动后重试。"
          action={
            <Button aria-label="重试" onClick={refresh}>
              重试
            </Button>
          }
        />
      )}
      {state.status === 'ready' && (
        <>
          {state.listing.truncated && !state.listing.nextCursor && (
            <Alert
              showIcon
              type="warning"
              message="此目录的文件数量已超过展示上限。"
              className="mb-3"
            />
          )}
          <Table
            rowKey="path"
            size="small"
            columns={directoryColumns(openDirectory, entry =>
              downloadSandboxFile(kind, id, entry)
            )}
            dataSource={state.listing.entries}
            pagination={{
              current: page,
              onChange: setPage,
              pageSize: PAGE_SIZE,
              hideOnSinglePage: true,
              showSizeChanger: false,
            }}
            tableLayout="fixed"
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="此目录暂无文件"
                />
              ),
            }}
          />
          {state.listing.nextCursor && (
            <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
              {loadMoreFailed && (
                <span role="alert">加载更多文件失败，请重试。</span>
              )}
              <Button
                loading={loadingMore}
                onClick={() => void loadMore(state.listing)}
              >
                加载更多
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
