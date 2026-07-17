import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import SiderContainer from '@/components/sider-container';
import { getFlowInputsInfo, listFlows } from '@/services/flow';
import {
  createAutomationTask,
  deleteAutomationTask,
  getAutomationRuns,
  getAutomationTasks,
  previewAutomationCron,
  runAutomationNow,
  setAutomationEnabled,
  updateAutomationTask,
} from '@/services/automation';
import type {
  AutomationRunStatus,
  PageData,
  WorkflowAutomationRun,
  WorkflowAutomationTask,
  WorkflowAutomationTaskPayload,
  WorkflowInputSchema,
  WorkflowListItem,
} from '@/types/automation';
import styles from './index.module.scss';

const { Text, Paragraph } = Typography;

const DEFAULT_TIMEZONE = 'Asia/Shanghai';
const DEFAULT_PAGE_SIZE = 10;

const CRON_PRESETS = [
  { label: '每小时', value: 'HOURLY', cron: '0 0 * * * ?' },
  { label: '每天 09:00', value: 'DAILY', cron: '0 0 9 * * ?' },
  { label: '每周一 09:00', value: 'WEEKLY', cron: '0 0 9 ? * MON' },
  { label: '每月 1 日 09:00', value: 'MONTHLY', cron: '0 0 9 1 * ?' },
  { label: '自定义 Cron', value: 'CUSTOM', cron: '' },
];

const TIMEZONE_OPTIONS = [
  { label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
  { label: 'UTC', value: 'UTC' },
  { label: 'America/Los_Angeles', value: 'America/Los_Angeles' },
  { label: 'Europe/London', value: 'Europe/London' },
];

const STATUS_META: Record<
  AutomationRunStatus,
  { color: string; label: string }
> = {
  SUCCESS: { color: 'success', label: '成功' },
  FAILED: { color: 'error', label: '失败' },
  SKIPPED: { color: 'warning', label: '跳过' },
  RUNNING: { color: 'processing', label: '执行中' },
};

interface AutomationFormValues {
  taskName?: string;
  flowId?: string;
  version?: string;
  scheduleType?: string;
  cronExpression?: string;
  timezone?: string;
  enabled?: boolean;
  inputValues?: Record<string, any>;
  inputParamsJson?: string;
}

type InputMode = 'form' | 'json';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const formatDate = (value?: string | number): string => {
  if (!value) {
    return '-';
  }
  const parsed = dayjs(value);
  return parsed.isValid()
    ? parsed.format('YYYY-MM-DD HH:mm:ss')
    : String(value);
};

const parseJsonObject = (value?: string): Record<string, any> => {
  if (!value) {
    return {};
  }
  const parsed: unknown = JSON.parse(value);
  return isRecord(parsed) ? parsed : {};
};

const getInputKey = (schema: WorkflowInputSchema, index: number): string =>
  schema.name || schema.id || `param_${index + 1}`;

const getInputType = (schema: WorkflowInputSchema): string =>
  schema.schema?.type || schema.type || 'string';

const normalizeInputsPayload = (raw: unknown): WorkflowInputSchema[] => {
  let payload = raw;
  if (isRecord(payload) && 'data' in payload) {
    payload = payload.data;
  }
  if (typeof payload === 'string') {
    payload = JSON.parse(payload) as unknown;
  }
  return Array.isArray(payload) ? (payload as WorkflowInputSchema[]) : [];
};

const buildInputValues = (
  schemas: WorkflowInputSchema[],
  inputParams: Record<string, any>
): Record<string, any> => {
  return schemas.reduce<Record<string, any>>((acc, schema, index) => {
    const key = getInputKey(schema, index);
    const type = getInputType(schema);
    const value = inputParams[key];
    if ((type === 'object' || type === 'array') && value !== undefined) {
      acc[key] = JSON.stringify(value, null, 2);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const AutomationPage: FC = () => {
  const [form] = Form.useForm<AutomationFormValues>();
  const [tasks, setTasks] = useState<WorkflowAutomationTask[]>([]);
  const [runs, setRuns] = useState<WorkflowAutomationRun[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [inputSchemas, setInputSchemas] = useState<WorkflowInputSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [runsLoading, setRunsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedTask, setSelectedTask] =
    useState<WorkflowAutomationTask | null>(null);
  const [previewTimes, setPreviewTimes] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>('json');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [runsPagination, setRunsPagination] = useState({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  });

  const fetchTasks = useCallback(
    async (
      page = pagination.current,
      pageSize = pagination.pageSize,
      keyword = search
    ): Promise<void> => {
      setLoading(true);
      try {
        const data = await getAutomationTasks({
          current: page,
          pageSize,
          search: keyword || undefined,
        });
        setTasks(data.pageData || []);
        setPagination({
          current: data.page || page,
          pageSize: data.pageSize || pageSize,
          total: data.totalCount || 0,
        });
      } finally {
        setLoading(false);
      }
    },
    [pagination.current, pagination.pageSize, search]
  );

  const fetchWorkflows = useCallback(async (keyword = ''): Promise<void> => {
    setWorkflowLoading(true);
    try {
      const data = (await listFlows({
        current: 1,
        pageSize: 999,
        search: keyword,
        status: 1,
      })) as PageData<WorkflowListItem>;
      setWorkflows(data.pageData || []);
    } finally {
      setWorkflowLoading(false);
    }
  }, []);

  const loadWorkflowInputs = useCallback(
    async (
      flowId: string,
      inputParams: Record<string, any> = {}
    ): Promise<void> => {
      try {
        const raw = await getFlowInputsInfo(flowId);
        const schemas = normalizeInputsPayload(raw);
        setInputSchemas(schemas);
        form.setFieldsValue({
          inputValues: buildInputValues(schemas, inputParams),
          inputParamsJson: JSON.stringify(inputParams, null, 2),
        });
        setInputMode(schemas.length > 0 ? 'form' : 'json');
      } catch {
        setInputSchemas([]);
        setInputMode('json');
      }
    },
    [form]
  );

  useEffect(() => {
    fetchTasks();
    fetchWorkflows();
  }, []);

  useEffect(() => {
    const handleHeaderSearch = (event: Event): void => {
      const detail = (event as CustomEvent<{ value: string; type: string }>)
        .detail;
      if (detail?.type !== 'automation') {
        return;
      }
      setSearch(detail.value);
      void fetchTasks(1, pagination.pageSize, detail.value);
    };

    const handleHeaderCreate = (): void => {
      openCreateDrawer();
    };

    window.addEventListener('headerSearch', handleHeaderSearch);
    window.addEventListener('headerCreateAutomation', handleHeaderCreate);
    return () => {
      window.removeEventListener('headerSearch', handleHeaderSearch);
      window.removeEventListener('headerCreateAutomation', handleHeaderCreate);
    };
  }, [fetchTasks, pagination.pageSize]);

  const workflowOptions = useMemo(
    () =>
      workflows.map(item => ({
        label: item.name,
        value: item.flowId,
      })),
    [workflows]
  );

  const openCreateDrawer = (): void => {
    setSelectedTask(null);
    setInputSchemas([]);
    setPreviewTimes([]);
    setInputMode('json');
    form.resetFields();
    form.setFieldsValue({
      scheduleType: 'DAILY',
      cronExpression: '0 0 9 * * ?',
      timezone: DEFAULT_TIMEZONE,
      enabled: true,
      inputParamsJson: '{}',
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (record: WorkflowAutomationTask): void => {
    const inputParams = parseJsonObject(record.inputParams);
    setSelectedTask(record);
    setPreviewTimes([]);
    setInputMode('json');
    form.setFieldsValue({
      taskName: record.taskName,
      flowId: record.flowId,
      version: record.version,
      scheduleType: record.scheduleType || 'CUSTOM',
      cronExpression: record.cronExpression,
      timezone: record.timezone || DEFAULT_TIMEZONE,
      enabled: record.enabled,
      inputParamsJson: JSON.stringify(inputParams, null, 2),
    });
    setDrawerOpen(true);
    void loadWorkflowInputs(record.flowId, inputParams);
  };

  const handleWorkflowChange = (flowId: string): void => {
    form.setFieldsValue({ inputParamsJson: '{}', inputValues: {} });
    void loadWorkflowInputs(flowId);
  };

  const handlePresetChange = (value: string): void => {
    const preset = CRON_PRESETS.find(item => item.value === value);
    if (preset?.cron) {
      form.setFieldsValue({ cronExpression: preset.cron });
    }
    setPreviewTimes([]);
  };

  const handlePreviewCron = async (): Promise<void> => {
    const cronExpression = form.getFieldValue('cronExpression');
    const timezone = form.getFieldValue('timezone') || DEFAULT_TIMEZONE;
    if (!cronExpression) {
      message.warning('请先填写 Cron 表达式');
      return;
    }
    const times = await previewAutomationCron({ cronExpression, timezone });
    setPreviewTimes(times);
  };

  const buildPayload = (
    values: AutomationFormValues
  ): WorkflowAutomationTaskPayload => {
    let inputParams: Record<string, any>;
    if (inputMode === 'json') {
      inputParams = parseJsonObject(values.inputParamsJson);
    } else {
      inputParams = inputSchemas.reduce<Record<string, any>>(
        (acc, schema, index) => {
          const key = getInputKey(schema, index);
          const type = getInputType(schema);
          const rawValue = values.inputValues?.[key];
          if (type === 'object' || type === 'array') {
            const text = typeof rawValue === 'string' ? rawValue : '';
            acc[key] = text ? JSON.parse(text) : type === 'array' ? [] : {};
          } else {
            acc[key] = rawValue ?? '';
          }
          return acc;
        },
        {}
      );
    }

    return {
      taskName: values.taskName || '',
      flowId: values.flowId || '',
      version: values.version || undefined,
      scheduleType: values.scheduleType || 'CUSTOM',
      cronExpression: values.cronExpression || '',
      timezone: values.timezone || DEFAULT_TIMEZONE,
      enabled: Boolean(values.enabled),
      inputParams: JSON.stringify(inputParams),
    };
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      const payload = buildPayload(values);
      setSubmitting(true);
      if (selectedTask) {
        await updateAutomationTask(selectedTask.id, payload);
        message.success('任务已更新');
      } else {
        await createAutomationTask(payload);
        message.success('任务已创建');
      }
      setDrawerOpen(false);
      void fetchTasks(1, pagination.pageSize);
    } catch (error) {
      if (error instanceof SyntaxError) {
        message.error('输入参数必须是合法 JSON');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnableChange = async (
    record: WorkflowAutomationTask,
    enabled: boolean
  ): Promise<void> => {
    await setAutomationEnabled(record.id, enabled);
    message.success(enabled ? '任务已启用' : '任务已停用');
    void fetchTasks();
  };

  const handleRunNow = async (
    record: WorkflowAutomationTask
  ): Promise<void> => {
    await runAutomationNow(record.id);
    message.success('已触发执行');
    void fetchTasks();
  };

  const handleDelete = (record: WorkflowAutomationTask): void => {
    Modal.confirm({
      title: '删除自动化任务',
      content: `确认删除「${record.taskName}」？删除后不会继续调度。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await deleteAutomationTask(record.id);
        message.success('任务已删除');
        void fetchTasks(1, pagination.pageSize);
      },
    });
  };

  const openRunsDrawer = async (
    record: WorkflowAutomationTask,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<void> => {
    setSelectedTask(record);
    setHistoryOpen(true);
    setRunsLoading(true);
    try {
      const data = await getAutomationRuns(record.id, {
        current: page,
        pageSize,
      });
      setRuns(data.pageData || []);
      setRunsPagination({
        current: data.page || page,
        pageSize: data.pageSize || pageSize,
        total: data.totalCount || 0,
      });
    } finally {
      setRunsLoading(false);
    }
  };

  const renderStatus = (status?: AutomationRunStatus): React.ReactNode => {
    if (!status) {
      return <Tag>未执行</Tag>;
    }
    const meta = STATUS_META[status];
    return <Tag color={meta.color}>{meta.label}</Tag>;
  };

  const columns: ColumnsType<WorkflowAutomationTask> = [
    {
      title: '任务名称',
      dataIndex: 'taskName',
      width: 220,
      render: (value: string, record) => (
        <div className={styles.primaryCell}>
          <Text strong ellipsis={{ tooltip: value }}>
            {value}
          </Text>
          <Text type="secondary" className={styles.mutedLine}>
            ID {record.id}
          </Text>
        </div>
      ),
    },
    {
      title: '工作流',
      dataIndex: 'workflowName',
      width: 240,
      render: (value: string | undefined, record) => (
        <div className={styles.primaryCell}>
          <Text ellipsis={{ tooltip: value || record.flowId }}>
            {value || record.flowId}
          </Text>
          <Text type="secondary" className={styles.mutedLine}>
            {record.flowId}
          </Text>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 110,
      render: (value: boolean, record) => (
        <Switch
          size="small"
          checked={value}
          checkedChildren="启用"
          unCheckedChildren="停用"
          onChange={checked => void handleEnableChange(record, checked)}
        />
      ),
    },
    {
      title: '调度',
      dataIndex: 'cronExpression',
      width: 250,
      render: (value: string, record) => (
        <div className={styles.primaryCell}>
          <Text code>{value}</Text>
          <Text type="secondary" className={styles.mutedLine}>
            {record.timezone}
          </Text>
        </div>
      ),
    },
    {
      title: '下次执行',
      dataIndex: 'nextFireTime',
      width: 180,
      render: formatDate,
    },
    {
      title: '最近结果',
      dataIndex: 'lastRunStatus',
      width: 180,
      render: (value: AutomationRunStatus | undefined, record) => (
        <div className={styles.primaryCell}>
          {renderStatus(value)}
          <Text type="secondary" className={styles.mutedLine}>
            {record.lastRunMessage || '-'}
          </Text>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 220,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="立即执行">
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => void handleRunNow(record)}
            />
          </Tooltip>
          <Tooltip title="执行历史">
            <Button
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => void openRunsDrawer(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditDrawer(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const runColumns: ColumnsType<WorkflowAutomationRun> = [
    {
      title: '触发方式',
      dataIndex: 'triggerType',
      width: 110,
      render: (value: WorkflowAutomationRun['triggerType']) =>
        value === 'MANUAL' ? '手动' : '定时',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: renderStatus,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      width: 180,
      render: formatDate,
    },
    {
      title: '耗时',
      dataIndex: 'durationMs',
      width: 110,
      render: (value?: number) => (value == null ? '-' : `${value} ms`),
    },
    {
      title: '结果摘要',
      dataIndex: 'responseSummary',
      render: (value: string | undefined, record) => (
        <Paragraph
          className={styles.runSummary}
          ellipsis={{ rows: 2, tooltip: value || record.errorMessage }}
        >
          {value || record.errorMessage || '-'}
        </Paragraph>
      ),
    },
  ];

  const renderInputControls = (): React.ReactNode => {
    if (inputMode === 'json' || inputSchemas.length === 0) {
      return (
        <Form.Item
          name="inputParamsJson"
          label="输入参数 JSON"
          rules={[{ required: true, message: '请输入输入参数 JSON' }]}
        >
          <Input.TextArea rows={8} className={styles.monoInput} />
        </Form.Item>
      );
    }

    return inputSchemas.map((schema, index) => {
      const key = getInputKey(schema, index);
      const type = getInputType(schema);
      const label = (
        <Space size={6}>
          <span>{key}</span>
          <Tag>{type}</Tag>
        </Space>
      );
      const rules = schema.required
        ? [{ required: true, message: `请输入 ${key}` }]
        : [];

      if (type === 'boolean') {
        return (
          <Form.Item
            key={key}
            name={['inputValues', key]}
            label={label}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        );
      }

      if (type === 'number' || type === 'integer') {
        return (
          <Form.Item
            key={key}
            name={['inputValues', key]}
            label={label}
            rules={rules}
          >
            <InputNumber className={styles.fullControl} />
          </Form.Item>
        );
      }

      if (type === 'object' || type === 'array') {
        return (
          <Form.Item
            key={key}
            name={['inputValues', key]}
            label={label}
            rules={rules}
          >
            <Input.TextArea rows={4} className={styles.monoInput} />
          </Form.Item>
        );
      }

      return (
        <Form.Item
          key={key}
          name={['inputValues', key]}
          label={label}
          rules={rules}
        >
          <Input placeholder={schema.description || '请输入参数值'} />
        </Form.Item>
      );
    });
  };

  return (
    <div className={styles.page}>
      <SiderContainer
        rightContent={
          <div className={styles.content}>
            <div className={styles.toolbar}>
              <div>
                <Text strong>自动化任务</Text>
                <Text type="secondary" className={styles.toolbarHint}>
                  仅调度已发布工作流，输入参数会随任务保存。
                </Text>
              </div>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => void fetchTasks()}
                >
                  刷新
                </Button>
                <Button
                  type="primary"
                  icon={<ClockCircleOutlined />}
                  onClick={openCreateDrawer}
                >
                  新建任务
                </Button>
              </Space>
            </div>

            <Table
              rowKey="id"
              size="middle"
              loading={loading}
              columns={columns}
              dataSource={tasks}
              scroll={{ x: 1200 }}
              locale={{ emptyText: <Empty description="暂无自动化任务" /> }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showTotal: total => `共 ${total} 条`,
              }}
              onChange={(next: TablePaginationConfig) => {
                const current = next.current || 1;
                const pageSize = next.pageSize || DEFAULT_PAGE_SIZE;
                void fetchTasks(current, pageSize);
              }}
            />
          </div>
        }
      />

      <Drawer
        title={selectedTask ? '编辑自动化任务' : '新建自动化任务'}
        open={drawerOpen}
        width="min(760px, 100vw)"
        destroyOnClose
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button
              type="primary"
              loading={submitting}
              onClick={() => void handleSubmit()}
            >
              保存
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" form={form} requiredMark={false}>
          <div className={styles.formSection}>
            <div className={styles.sectionTitle}>基础信息</div>
            <Form.Item
              name="taskName"
              label="任务名称"
              rules={[{ required: true, message: '请输入任务名称' }]}
            >
              <Input maxLength={128} placeholder="例如：每日同步客户摘要" />
            </Form.Item>
            <Form.Item
              name="flowId"
              label="已发布工作流"
              rules={[{ required: true, message: '请选择已发布工作流' }]}
            >
              <Select
                showSearch
                loading={workflowLoading}
                options={workflowOptions}
                placeholder="搜索并选择已发布工作流"
                filterOption={false}
                onSearch={fetchWorkflows}
                onChange={handleWorkflowChange}
              />
            </Form.Item>
            <Form.Item name="version" label="发布版本">
              <Input placeholder="为空时使用工作流默认发布版本" />
            </Form.Item>
          </div>

          <div className={styles.formSection}>
            <div className={styles.sectionTitle}>执行周期</div>
            <Form.Item name="scheduleType" label="预设周期">
              <Select options={CRON_PRESETS} onChange={handlePresetChange} />
            </Form.Item>
            <Form.Item
              name="cronExpression"
              label="Cron 表达式"
              rules={[{ required: true, message: '请输入 Cron 表达式' }]}
            >
              <Input placeholder="0 0 9 * * ?" />
            </Form.Item>
            <Form.Item
              name="timezone"
              label="时区"
              rules={[{ required: true }]}
            >
              <Select options={TIMEZONE_OPTIONS} />
            </Form.Item>
            <Form.Item name="enabled" label="启用状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
            <Button onClick={() => void handlePreviewCron()}>
              预览未来 5 次
            </Button>
            {previewTimes.length > 0 && (
              <div className={styles.previewList}>
                {previewTimes.map(item => (
                  <Tag key={item}>{item}</Tag>
                ))}
              </div>
            )}
          </div>

          <div className={styles.formSection}>
            <div className={styles.inputHeader}>
              <div className={styles.sectionTitle}>输入参数</div>
              <Select
                size="small"
                value={inputMode}
                onChange={setInputMode}
                options={[
                  {
                    label: '表单',
                    value: 'form',
                    disabled: inputSchemas.length === 0,
                  },
                  { label: 'JSON', value: 'json' },
                ]}
              />
            </div>
            {renderInputControls()}
          </div>
        </Form>
      </Drawer>

      <Drawer
        title={selectedTask ? `执行历史：${selectedTask.taskName}` : '执行历史'}
        open={historyOpen}
        width="min(860px, 100vw)"
        onClose={() => setHistoryOpen(false)}
      >
        <Table
          rowKey="id"
          size="small"
          loading={runsLoading}
          columns={runColumns}
          dataSource={runs}
          scroll={{ x: 780 }}
          pagination={{
            current: runsPagination.current,
            pageSize: runsPagination.pageSize,
            total: runsPagination.total,
            showSizeChanger: true,
          }}
          onChange={(next: TablePaginationConfig) => {
            if (!selectedTask) {
              return;
            }
            void openRunsDrawer(
              selectedTask,
              next.current || 1,
              next.pageSize || DEFAULT_PAGE_SIZE
            );
          }}
        />
      </Drawer>
    </div>
  );
};

export default AutomationPage;
