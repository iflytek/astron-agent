import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { Alert, Button, Empty, Skeleton, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DownloadOutlined,
  FileOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  downloadSandboxFile,
  listSandboxFiles,
  SANDBOX_CONFIG_CHANGED,
} from '@/services/sandbox';
import type { SandboxFileEntry, SandboxFileListing } from '@/types/sandbox';
import { formatFileSize } from '@/utils';

type Resource = { kind: 'agent' | 'workflow'; id: string };
const PAGE_SIZE = 10;

type DirectoryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; listing: SandboxFileListing };

function directoryColumns(
  download: (entry: SandboxFileEntry) => void
): ColumnsType<SandboxFileEntry> {
  return [
    {
      title: '名称',
      dataIndex: 'path',
      render: (path: string): ReactElement => (
        <span className="flex items-start gap-2 break-all" title={path}>
          <FileOutlined className="mt-1 shrink-0" />
          {path}
        </span>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      width: 100,
      responsive: ['sm'],
      className: 'tabular-nums',
      render: (size: number): string => formatFileSize(size),
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
      render: (_, entry): ReactElement => (
        <Button
          type="link"
          icon={<DownloadOutlined />}
          aria-label={'下载 ' + entry.path}
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
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<DirectoryState>({ status: 'loading' });
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const appendRequest = useRef<AbortController | null>(null);
  const loading = state.status === 'loading';

  useEffect(() => {
    const controller = new AbortController();
    void listSandboxFiles(kind, id, controller.signal)
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
  }, [kind, id, revision]);

  const refresh = useCallback((): void => {
    appendRequest.current?.abort();
    appendRequest.current = null;
    setPage(1);
    setLoadingMore(false);
    setLoadMoreFailed(false);
    setState({ status: 'loading' });
    setRevision(value => value + 1);
  }, []);

  useEffect(() => {
    window.addEventListener('focus', refresh);
    const channel =
      typeof BroadcastChannel === 'undefined'
        ? null
        : new BroadcastChannel(SANDBOX_CONFIG_CHANGED);
    channel?.addEventListener('message', refresh);
    return (): void => {
      channel?.close();
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

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
        controller.signal,
        listing.nextCursor
      );
      if (controller.signal.aborted) return;
      if (
        next.provider !== listing.provider ||
        next.directory !== listing.directory
      ) {
        refresh();
        return;
      }
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
  const listing = state.status === 'ready' ? state.listing : null;

  return (
    <section
      aria-label="沙箱文件"
      aria-busy={loading || loadingMore}
      className="min-w-0"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {listing?.directory && (
            <>
              <div className="mb-1 font-medium">沙箱目录</div>
              <Typography.Text copyable className="break-all" code>
                {listing.directory}
              </Typography.Text>
              {kind === 'workflow' && (
                <div className="mt-2 text-sm">
                  代码节点将文件写入此目录后，可在下方查看和下载。
                </div>
              )}
            </>
          )}
        </div>
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
          message="无法读取沙箱文件，请重试。"
          action={
            <Button aria-label="重试" onClick={refresh}>
              重试
            </Button>
          }
        />
      )}
      {listing && !listing.directory && (
        <Alert
          showIcon
          type="info"
          message={listing.provider ? '当前使用第三方沙箱' : '当前未启用沙箱'}
          description={
            listing.provider &&
            '第三方沙箱的文件可能随实例回收。启用本地 Docker 沙箱后可在此查看持久保存的文件。'
          }
        />
      )}
      {listing?.directory && (
        <>
          {listing.truncated && !listing.nextCursor && (
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
            columns={directoryColumns(entry =>
              downloadSandboxFile(kind, id, entry)
            )}
            dataSource={listing.entries}
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
          {listing.nextCursor && (
            <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
              {loadMoreFailed && (
                <span role="alert">加载更多文件失败，请重试。</span>
              )}
              <Button
                loading={loadingMore}
                onClick={() => void loadMore(listing)}
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
