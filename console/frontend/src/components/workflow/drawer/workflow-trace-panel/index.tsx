import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppstoreOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  DownOutlined,
  FireOutlined,
  MinusOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import {
  Button,
  Drawer,
  Empty,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import {
  getWorkflowTraceExecutionDetail,
  getWorkflowTraceExecutions,
} from '@/services/trace';
import { buildExecutionOptions, buildTraceTree, flattenNodes } from './adapter';
import type {
  FlattenTraceNode,
  TraceExecutionSummary,
  TraceStatus,
  TraceTreeNode,
  TraceView,
} from './types';
import styles from './index.module.scss';

const statusLabelMap: Record<TraceStatus, string> = {
  success: '成功',
  running: '运行中',
  failed: '失败',
};

const formatDuration = (duration: number): string => {
  if (duration === 0) {
    return '0ms';
  }
  if (duration < 1000) {
    return `${duration}ms`;
  }
  return `${(duration / 1000).toFixed(2)}s`;
};

const MIN_VIEWPORT_RATIO = 0.08;
const MIN_VIEWPORT_DURATION = 100;
const MIN_TICK_COUNT = 2;
const MAX_TICK_COUNT = 10;
const TARGET_TICK_PIXEL_GAP = 120;
const FLAME_BAR_WIDTH_SCALE = 0.86;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

type ViewportRange = {
  startRatio: number;
  endRatio: number;
};

type TickItem = {
  value: number;
  ratio: number;
  label: string;
};

const getNiceTickStep = (range: number, targetTicks: number): number => {
  if (range <= 0) {
    return 1;
  }

  const roughStep = range / targetTicks;
  const exponent = Math.floor(Math.log10(roughStep));
  const base = 10 ** exponent;
  const normalized = roughStep / base;

  if (normalized <= 1) {
    return base;
  }
  if (normalized <= 2) {
    return 2 * base;
  }
  if (normalized <= 5) {
    return 5 * base;
  }
  return 10 * base;
};

const formatTickLabel = (value: number): string => {
  if (value >= 1000) {
    const seconds = value / 1000;
    return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
  }
  return `${Math.round(value)}ms`;
};

const getViewportRange = (
  totalDuration: number,
  viewportRange: ViewportRange
): { start: number; end: number; duration: number } => {
  const start = totalDuration * viewportRange.startRatio;
  const end = totalDuration * viewportRange.endRatio;

  return {
    start,
    end,
    duration: Math.max(end - start, 0),
  };
};

const getTickItems = (
  start: number,
  end: number,
  targetTickCount: number
): TickItem[] => {
  const range = Math.max(end - start, 0);
  if (range <= 0) {
    return [
      {
        value: start,
        ratio: 0,
        label: formatTickLabel(start),
      },
    ];
  }

  const step = getNiceTickStep(range, targetTickCount);
  const firstTick = Math.ceil(start / step) * step;
  const ticks: number[] = [];

  for (let tick = firstTick; tick < end; tick += step) {
    ticks.push(tick);
  }

  if (ticks.length === 0 || ticks[0] !== start) {
    ticks.unshift(start);
  }
  if (ticks[ticks.length - 1] !== end) {
    ticks.push(end);
  }

  return ticks.map(value => ({
    value,
    ratio: range > 0 ? (value - start) / range : 0,
    label: formatTickLabel(value),
  }));
};

const stringifyData = (value?: Record<string, unknown>): string => {
  if (!value || Object.keys(value).length === 0) {
    return '暂无数据';
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '数据格式无法展示';
  }
};

const getFailedStatusDetail = (
  value: unknown
): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const code = Number((value as { code?: unknown }).code);
  if (!Number.isFinite(code) || code === 0 || code === 200) {
    return undefined;
  }

  return value as Record<string, unknown>;
};

const buildOutputDisplayData = (
  output?: Record<string, unknown>,
  rawStatus?: unknown
): Record<string, unknown> | undefined => {
  const failedStatus = getFailedStatusDetail(rawStatus);
  if (!failedStatus) {
    return output;
  }

  const code = failedStatus.code;
  const message = failedStatus.message;

  return {
    ...(output || {}),
    ...(code !== undefined ? { code } : {}),
    ...(message !== undefined ? { message } : {}),
  };
};

const renderTree = (
  nodes: TraceTreeNode[],
  selectedNodeId: string,
  expandedNodeIds: Set<string>,
  onSelect: (node: TraceTreeNode) => void,
  onToggle: (nodeId: string) => void,
  level = 0
): React.ReactNode =>
  nodes.map(node => {
    const isSelected = selectedNodeId === node.id;
    const isExpanded = expandedNodeIds.has(node.id);
    const hasChildren = Boolean(node.children?.length);
    const isSelectable = node.selectable !== false;

    return (
      <div key={node.id}>
        <div
          className={`${styles.treeRow} ${isSelected ? styles.treeRowActive : ''} ${
            !isSelectable ? styles.treeRowGroup : ''
          }`}
          style={{ paddingLeft: `${level * 22}px` }}
          onClick={() => {
            if (hasChildren) {
              onToggle(node.id);
            }
            if (isSelectable) {
              onSelect(node);
            }
          }}
        >
          <div className={styles.treeLeft}>
            <span
              className={`${styles.treeToggle} ${!hasChildren ? styles.treeTogglePlaceholder : ''}`}
            >
              {hasChildren ? (
                isExpanded ? (
                  <DownOutlined />
                ) : (
                  <RightOutlined />
                )
              ) : null}
            </span>
            <span
              className={`${styles.nodeIcon} ${
                node.status === 'failed' ? styles.nodeIconFailed : ''
              } ${!isSelectable ? styles.nodeIconGroup : ''}`}
            >
              {!isSelectable ? (
                <AppstoreOutlined />
              ) : node.status === 'failed' ? (
                <CloseCircleFilled />
              ) : (
                <CheckCircleFilled />
              )}
            </span>
            <span className={styles.nodeName}>{node.name}</span>
          </div>
          <div className={styles.treeMeta}>
            <Tag
              color={
                node.status === 'failed'
                  ? 'error'
                  : node.status === 'running'
                    ? 'processing'
                    : 'success'
              }
              className={styles.durationTag}
            >
              {formatDuration(node.duration)}
            </Tag>
          </div>
        </div>
        {hasChildren &&
          isExpanded &&
          renderTree(
            node.children || [],
            selectedNodeId,
            expandedNodeIds,
            onSelect,
            onToggle,
            level + 1
          )}
      </div>
    );
  });

type TableTraceNode = FlattenTraceNode & {
  children?: TableTraceNode[];
};

const buildTableTreeNodes = (
  nodes: TraceTreeNode[],
  depth = 0
): TableTraceNode[] =>
  nodes.map(node => ({
    ...node,
    depth,
    children:
      node.children && node.children.length > 0
        ? buildTableTreeNodes(node.children, depth + 1)
        : undefined,
  }));

function WorkflowTracePanel(): React.ReactElement {
  const { t } = useTranslation();
  const workflowTracePanelOpen = useFlowsManager(
    state => state.workflowTracePanelOpen
  );
  const setWorkflowTracePanelOpen = useFlowsManager(
    state => state.setWorkflowTracePanelOpen
  );
  const currentFlow = useFlowsManager(state => state.currentFlow);

  const [executions, setExecutions] = useState<TraceExecutionSummary[]>([]);
  const [selectedExecutionId, setSelectedExecutionId] = useState('');
  const [viewMode, setViewMode] = useState<TraceView>('flame');
  const [traceTree, setTraceTree] = useState<TraceTreeNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    new Set()
  );
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reloadSeq, setReloadSeq] = useState(0);
  const [viewportRange, setViewportRange] = useState<ViewportRange>({
    startRatio: 0,
    endRatio: 1,
  });
  const [chartWidth, setChartWidth] = useState(0);
  const scrubberTrackRef = useRef<HTMLDivElement | null>(null);
  const flameAreaRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    mode: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    startViewportRange: ViewportRange;
  } | null>(null);

  const selectedExecution = useMemo(
    () => executions.find(execution => execution.id === selectedExecutionId),
    [executions, selectedExecutionId]
  );

  const flattenedNodes = useMemo(() => flattenNodes(traceTree), [traceTree]);
  const tableNodes = useMemo(() => buildTableTreeNodes(traceTree), [traceTree]);

  const selectedNode = useMemo(
    () =>
      flattenedNodes.find(
        node => node.id === selectedNodeId && node.selectable !== false
      ) || flattenedNodes.find(node => node.selectable !== false),
    [flattenedNodes, selectedNodeId]
  );

  const getDefaultExpandedNodeIds = (nodes: TraceTreeNode[]): Set<string> =>
    new Set(
      nodes.filter(node => node.kind === 'iteration-group').map(node => node.id)
    );

  const totalDuration = selectedExecution?.totalDuration || 0;
  const viewport = useMemo(
    () => getViewportRange(totalDuration, viewportRange),
    [totalDuration, viewportRange]
  );
  const targetTickCount = useMemo(
    () =>
      clamp(
        Math.floor(
          Math.max(chartWidth, TARGET_TICK_PIXEL_GAP) / TARGET_TICK_PIXEL_GAP
        ),
        MIN_TICK_COUNT,
        MAX_TICK_COUNT
      ),
    [chartWidth]
  );
  const flameTicks = useMemo(
    () => getTickItems(viewport.start, viewport.end, targetTickCount),
    [targetTickCount, viewport.end, viewport.start]
  );

  const listColumns = useMemo<ColumnsType<TableTraceNode>>(
    () => [
      {
        title: '节点',
        dataIndex: 'name',
        key: 'name',
        render: (_, record) => <div>{record.name}</div>,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: TraceStatus) => (
          <Tag
            color={
              value === 'success'
                ? 'success'
                : value === 'failed'
                  ? 'error'
                  : 'processing'
            }
          >
            {statusLabelMap[value]}
          </Tag>
        ),
      },
      {
        title: '耗时',
        dataIndex: 'duration',
        key: 'duration',
        width: 120,
        render: (value: number) => formatDuration(value),
      },
      {
        title: '总 Token',
        dataIndex: 'totalTokens',
        key: 'totalTokens',
        width: 120,
      },
      {
        title: '开始偏移',
        dataIndex: 'offset',
        key: 'offset',
        width: 120,
        render: (value: number) => `${value}ms`,
      },
    ],
    []
  );

  useEffect(() => {
    if (!workflowTracePanelOpen || !currentFlow?.flowId) {
      return;
    }

    let cancelled = false;
    setLoadingExecutions(true);
    getWorkflowTraceExecutions(currentFlow.flowId, {
      page: 1,
      pageSize: 20,
    })
      .then(result => {
        if (cancelled) {
          return;
        }
        const options = buildExecutionOptions(result.list || []);
        setExecutions(options);
        setSelectedExecutionId(options[0]?.id || '');
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingExecutions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workflowTracePanelOpen, currentFlow?.flowId, reloadSeq]);

  useEffect(() => {
    if (
      !workflowTracePanelOpen ||
      !currentFlow?.flowId ||
      !selectedExecutionId
    ) {
      setTraceTree([]);
      setSelectedNodeId('');
      return;
    }

    let cancelled = false;
    setLoadingDetail(true);
    getWorkflowTraceExecutionDetail(currentFlow.flowId, selectedExecutionId)
      .then(result => {
        if (cancelled) {
          return;
        }
        const tree = buildTraceTree(result);
        setTraceTree(tree);
        setExpandedNodeIds(getDefaultExpandedNodeIds(tree));
        setSelectedNodeId(
          flattenNodes(tree).find(node => node.selectable !== false)?.id || ''
        );

        setViewportRange({
          startRatio: 0,
          endRatio: 1,
        });
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workflowTracePanelOpen, currentFlow?.flowId, selectedExecutionId]);

  const closePanel = (): void => {
    setWorkflowTracePanelOpen(false);
  };

  const toggleNode = (nodeId: string): void => {
    setExpandedNodeIds(previous => {
      const next = new Set(previous);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const hasExecution = executions.length > 0;
  const minViewportRatio =
    totalDuration > 0
      ? Math.max(
          MIN_VIEWPORT_RATIO,
          Math.min(MIN_VIEWPORT_DURATION / totalDuration, 1)
        )
      : 1;
  const viewportWidthRatio = viewportRange.endRatio - viewportRange.startRatio;
  const viewportLeftPercent = viewportRange.startRatio * 100;
  const viewportWidthPercent = viewportWidthRatio * 100;

  const stopDragging = (): void => {
    dragStateRef.current = null;
  };

  useEffect(() => {
    const element = flameAreaRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries): void => {
      const entry = entries[0];
      setChartWidth(entry?.contentRect.width || 0);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent): void => {
      const dragState = dragStateRef.current;
      const track = scrubberTrackRef.current;

      if (!dragState || !track || totalDuration <= 0) {
        return;
      }

      const trackWidth = track.getBoundingClientRect().width;
      if (trackWidth <= 0) {
        return;
      }

      const deltaRatio = (event.clientX - dragState.startX) / trackWidth;
      const startViewportWidthRatio =
        dragState.startViewportRange.endRatio -
        dragState.startViewportRange.startRatio;

      if (dragState.mode === 'move') {
        const nextStartRatio = clamp(
          dragState.startViewportRange.startRatio + deltaRatio,
          0,
          Math.max(1 - startViewportWidthRatio, 0)
        );
        setViewportRange({
          startRatio: nextStartRatio,
          endRatio: nextStartRatio + startViewportWidthRatio,
        });
        return;
      }

      if (dragState.mode === 'resize-left') {
        const nextStartRatio = clamp(
          dragState.startViewportRange.startRatio + deltaRatio,
          0,
          Math.max(dragState.startViewportRange.endRatio - minViewportRatio, 0)
        );
        setViewportRange(previous => ({
          ...previous,
          startRatio: nextStartRatio,
        }));
        return;
      }

      const nextEndRatio = clamp(
        dragState.startViewportRange.endRatio + deltaRatio,
        Math.min(dragState.startViewportRange.startRatio + minViewportRatio, 1),
        1
      );
      setViewportRange(previous => ({
        ...previous,
        endRatio: nextEndRatio,
      }));
    };

    const handlePointerUp = (): void => {
      stopDragging();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [minViewportRatio, totalDuration]);

  useEffect(() => {
    if (selectedExecutionId === '') {
      setViewportRange({
        startRatio: 0,
        endRatio: 1,
      });
    }
  }, [selectedExecutionId]);

  const startDrag = (
    mode: 'move' | 'resize-left' | 'resize-right',
    clientX: number
  ): void => {
    dragStateRef.current = {
      mode,
      startX: clientX,
      startViewportRange: viewportRange,
    };
  };

  const handleTrackPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ): void => {
    if (totalDuration <= 0 || viewport.duration <= 0) {
      return;
    }

    const track = scrubberTrackRef.current;
    if (!track) {
      return;
    }

    const { left, width } = track.getBoundingClientRect();
    if (width <= 0) {
      return;
    }

    const ratio = clamp((event.clientX - left) / width, 0, 1);
    const nextStartRatio = clamp(
      ratio - viewportWidthRatio / 2,
      0,
      Math.max(1 - viewportWidthRatio, 0)
    );

    setViewportRange({
      startRatio: nextStartRatio,
      endRatio: nextStartRatio + viewportWidthRatio,
    });
  };

  const handleFlameWheel = (event: React.WheelEvent<HTMLDivElement>): void => {
    if (totalDuration <= 0 || !flameAreaRef.current) {
      return;
    }

    event.preventDefault();

    const { left, width } = flameAreaRef.current.getBoundingClientRect();
    const pointerRatio = clamp(
      (event.clientX - left) / Math.max(width, 1),
      0,
      1
    );
    const anchorRatio =
      viewportRange.startRatio + viewportWidthRatio * pointerRatio;
    const deltaFactor = event.deltaY > 0 ? 1.15 : 0.85;
    const nextWidthRatio = clamp(
      viewportWidthRatio * deltaFactor,
      minViewportRatio,
      1
    );
    const nextStartRatio = clamp(
      anchorRatio - nextWidthRatio * pointerRatio,
      0,
      Math.max(1 - nextWidthRatio, 0)
    );

    setViewportRange({
      startRatio: nextStartRatio,
      endRatio: nextStartRatio + nextWidthRatio,
    });
  };

  return (
    <Drawer
      open={workflowTracePanelOpen}
      onClose={closePanel}
      placement="right"
      destroyOnClose
      rootClassName={styles.traceDrawer}
      title={null}
    >
      <div className={styles.panel}>
        <div className={styles.header}>
          <div>
            <Typography.Title level={4} className={styles.title}>
              {t('workflow.nodes.header.traceLogs')}
            </Typography.Title>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setSelectedExecutionId('');
                setExecutions([]);
                setTraceTree([]);
                setSelectedNodeId('');
                setReloadSeq(value => value + 1);
              }}
            >
              刷新
            </Button>
            <Button onClick={closePanel}>{t('common.cancel')}</Button>
          </Space>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <span className={styles.toolbarLabel}>调试</span>
            <Select
              value={selectedExecutionId || undefined}
              className={styles.executionSelect}
              loading={loadingExecutions}
              placeholder="选择执行记录"
              options={executions.map(execution => ({
                label: execution.label,
                value: execution.id,
              }))}
              onChange={value => setSelectedExecutionId(value)}
            />
          </div>
          <div className={styles.summary}>
            <span>{formatDuration(selectedExecution?.totalDuration || 0)}</span>
            <span>{selectedExecution?.totalTokens || 0} Tokens</span>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.leftPane}>
            <div className={styles.sectionTitle}>节点树</div>
            <div className={styles.treePanel}>
              {loadingDetail ? (
                <Spin />
              ) : traceTree.length > 0 ? (
                renderTree(
                  traceTree,
                  selectedNodeId,
                  expandedNodeIds,
                  node => setSelectedNodeId(node.id),
                  toggleNode
                )
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无 Trace 数据"
                />
              )}
            </div>
          </div>

          <div className={styles.rightPane}>
            <div className={styles.rightTop}>
              <div className={styles.sectionTitle}>详情</div>
              <Select
                value={viewMode}
                className={styles.viewSelect}
                onChange={value => setViewMode(value)}
                options={[
                  {
                    label: (
                      <span className={styles.optionLabel}>
                        <FireOutlined />
                        火焰图
                      </span>
                    ),
                    value: 'flame',
                  },
                  {
                    label: (
                      <span className={styles.optionLabel}>
                        <AppstoreOutlined />
                        列表
                      </span>
                    ),
                    value: 'list',
                  },
                ]}
              />
            </div>

            <div className={styles.chartCard}>
              {loadingDetail ? (
                <Spin />
              ) : !hasExecution ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无执行记录"
                />
              ) : viewMode === 'flame' ? (
                <>
                  <div className={styles.scrubber}>
                    <div
                      ref={scrubberTrackRef}
                      className={styles.scrubberTrack}
                      onPointerDown={handleTrackPointerDown}
                    >
                      <div
                        className={styles.scrubberWindow}
                        style={{
                          left: `${viewportLeftPercent}%`,
                          width: `${viewportWidthPercent}%`,
                        }}
                        onPointerDown={(event): void => {
                          event.stopPropagation();
                          startDrag('move', event.clientX);
                        }}
                      >
                        <span
                          className={`${styles.scrubberHandle} ${styles.scrubberHandleLeft}`}
                          onPointerDown={(event): void => {
                            event.stopPropagation();
                            startDrag('resize-left', event.clientX);
                          }}
                        />
                        <span
                          className={`${styles.scrubberHandle} ${styles.scrubberHandleRight}`}
                          onPointerDown={(event): void => {
                            event.stopPropagation();
                            startDrag('resize-right', event.clientX);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className={styles.tickRow}>
                    {flameTicks.map(tick => (
                      <span
                        key={tick.value}
                        style={{
                          left: `${tick.ratio * 100}%`,
                        }}
                      >
                        {tick.label}
                      </span>
                    ))}
                  </div>
                  <div className={styles.flameViewport}>
                    <div
                      ref={flameAreaRef}
                      className={styles.flameArea}
                      onWheel={handleFlameWheel}
                    >
                      {flattenedNodes.map(node => {
                        const nodeStart = node.offset;
                        const nodeEnd = node.offset + node.duration;
                        const visibleStart = Math.max(
                          nodeStart,
                          viewport.start
                        );
                        const visibleEnd = Math.min(nodeEnd, viewport.end);

                        if (
                          visibleEnd <= viewport.start ||
                          visibleStart >= viewport.end
                        ) {
                          return null;
                        }

                        const left =
                          viewport.duration > 0
                            ? ((visibleStart - viewport.start) /
                                viewport.duration) *
                              100
                            : 0;
                        const width =
                          viewport.duration > 0
                            ? Math.max(
                                ((Math.max(visibleEnd - visibleStart, 0) || 0) /
                                  viewport.duration) *
                                  100 *
                                  FLAME_BAR_WIDTH_SCALE,
                                node.duration === 0 ? 3 : 0.6
                              )
                            : 100;

                        return (
                          <div
                            key={node.id}
                            className={`${styles.flameRow} ${
                              selectedNodeId === node.id
                                ? styles.flameRowActive
                                : ''
                            }`}
                            onClick={() => setSelectedNodeId(node.id)}
                          >
                            <div className={styles.flameGrid}>
                              {flameTicks.map(tick => (
                                <span
                                  key={tick.value}
                                  className={styles.gridLine}
                                  style={{
                                    left: `${tick.ratio * 100}%`,
                                  }}
                                />
                              ))}
                            </div>
                            <div
                              className={styles.flameBar}
                              style={{
                                left: `${left}%`,
                                width: `${width}%`,
                              }}
                            >
                              {node.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <Table<TableTraceNode>
                  rowKey={record => record.id}
                  columns={listColumns}
                  dataSource={tableNodes}
                  pagination={false}
                  size="small"
                  expandable={{
                    expandIcon: ({ expanded, onExpand, record }) =>
                      record.children && record.children.length > 0 ? (
                        <span
                          className={styles.tableExpandIcon}
                          onClick={event => {
                            event.stopPropagation();
                            onExpand(record, event);
                          }}
                        >
                          {expanded ? <MinusOutlined /> : <PlusOutlined />}
                        </span>
                      ) : (
                        <span className={styles.tableExpandPlaceholder} />
                      ),
                  }}
                  onRow={record => ({
                    onClick: () => setSelectedNodeId(record.id),
                    style: { cursor: 'pointer' },
                  })}
                />
              )}
            </div>

            <div className={styles.ioGrid}>
              <div className={styles.ioCard}>
                <div className={styles.sectionTitle}>输入</div>
                <pre className={styles.ioContent}>
                  {stringifyData(selectedNode?.input)}
                </pre>
              </div>
              <div className={styles.ioCard}>
                <div className={styles.sectionTitle}>输出</div>
                <pre className={styles.ioContent}>
                  {stringifyData(
                    buildOutputDisplayData(
                      selectedNode?.output,
                      selectedNode?.rawStatus
                    )
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

export default memo(WorkflowTracePanel);
