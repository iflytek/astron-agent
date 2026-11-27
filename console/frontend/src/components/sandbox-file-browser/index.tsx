import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import {
  Alert,
  Button,
  Empty,
  Popconfirm,
  Skeleton,
  Table,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DownloadOutlined,
  FileOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  deleteSandboxFile,
  downloadSandboxFile,
  listSandboxFiles,
  SANDBOX_CONFIG_CHANGED,
} from '@/services/sandbox';
import type { SandboxFileEntry, SandboxFileListing } from '@/types/sandbox';
import { formatFileSize } from '@/utils';
import { shouldShowRequestError } from '@/utils/http-error';

type Resource = { kind: 'agent' | 'workflow'; id: string };
const PAGE_SIZE = 10;

type DirectoryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; listing: SandboxFileListing };

function directoryColumns(
  download: (entry: SandboxFileEntry) => void,
  remove?: (entry: SandboxFileEntry) => Promise<void>
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
      width: remove ? 120 : 104,
      render: (_, entry): ReactElement => (
        <div className="flex items-center gap-2">
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            aria-label={'下载 ' + entry.path}
            onClick={() => download(entry)}
          >
            下载
          </Button>
          {remove && (
            <Popconfirm
              title="删除此文件？"
              description={
                <span className="block max-w-56 break-all">{entry.path}</span>
              }
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => remove(entry)}
            >
              <Button
                type="link"
                size="small"
                danger
                aria-label={'删除 ' + entry.path}
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];
}

async function removeFile(
  { kind, id }: Resource,
  entry: SandboxFileEntry,
  notify: ReturnType<typeof message.useMessage>[0],
  refresh: () => void
): Promise<void> {
  try {
    await deleteSandboxFile(kind, id, entry.path);
    notify.success('文件已删除');
    refresh();
  } catch (error) {
    if (shouldShowRequestError(error)) notify.error('删除文件失败，请重试。');
  }
}

export default function SandboxFileBrowser({
  kind,
  id,
}: Resource): ReactElement {
  return <DirectoryBrowser key={kind + ':' + id} kind={kind} id={id} />;
}

function DirectoryBrowser({ kind, id }: Resource): ReactElement {
  const [notify, messageHolder] = message.useMessage();
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
      setState({
        status: 'ready',
        listing: { ...next, entries, partial: listing.partial || next.partial },
      });
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
      {messageHolder}
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
      {listing && listing.provider !== 'docker' && (
        <Alert
          showIcon
          type="info"
          className={listing.directory ? 'mb-3' : undefined}
          message={listing.provider ? '当前使用第三方沙箱' : '当前未启用沙箱'}
          description={
            listing.provider && '第三方沙箱文件可能随实例回收，请及时下载。'
          }
        />
      )}
      {listing?.directory && (
        <>
          {(listing.partial || (listing.truncated && !listing.nextCursor)) && (
            <Alert
              showIcon
              type="warning"
              message={
                listing.provider === 'e2b'
                  ? '部分沙箱文件暂时无法读取，请刷新重试。'
                  : '此目录的文件数量已超过展示上限。'
              }
              className="mb-3"
            />
          )}
          <Table
            rowKey={(entry): string => entry.fileRef ?? entry.path}
            size="small"
            columns={directoryColumns(
              entry => downloadSandboxFile(kind, id, entry),
              listing.canDelete
                ? (entry): Promise<void> =>
                    removeFile({ kind, id }, entry, notify, refresh)
                : undefined
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
                  description={
                    listing.partial || listing.truncated
                      ? '暂未加载到文件'
                      : '此目录暂无文件'
                  }
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
