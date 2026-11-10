import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
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
import { getFlowInputsInfo, listFlows } from '@/services/flow';
import { getVersionList } from '@/services/common';
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
  if (!isRecord(parsed)) throw new SyntaxError('输入参数必须是 JSON 对象');
  return parsed;
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
  const [workflows, setWorkflows] = useState<
    Pick<WorkflowListItem, 'name' | 'flowId'>[]
  >([]);
  const [versionOptions, setVersionOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [inputSchemas, setInputSchemas] = useState<WorkflowInputSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskError, setTaskError] = useState('');
  const [actionError, setActionError] = useState('');
  const [runsError, setRunsError] = useState('');
  const [workflowError, setWorkflowError] = useState('');
  const [configError, setConfigError] = useState('');
  const [configLoading, setConfigLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const busyTaskIds = useRef(new Set<number>());
  const submitPending = useRef(false);
  const currentList = useRef({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    keyword: '',
  });
  const taskRequest = useRef(0);
  const workflowRequest = useRef(0);
  const configRequest = useRef(0);
  const runsRequest = useRef(0);
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
      const request = ++taskRequest.current;
      currentList.current = { page, pageSize, keyword };
      setLoading(true);
      setTaskError('');
      try {
        const data = await getAutomationTasks({
          current: page,
          pageSize,
          search: keyword || undefined,
        });
        if (request !== taskRequest.current) return;
        setTasks(data.pageData || []);
        setPagination({
          current: data.page || page,
          pageSize: data.pageSize || pageSize,
          total: data.totalCount || 0,
        });
      } catch {
        if (request === taskRequest.current)
          setTaskError('无法加载自动化任务，请重试。');
      } finally {
        if (request === taskRequest.current) setLoading(false);
      }
    },
    [pagination.current, pagination.pageSize, search]
  );

  const fetchWorkflows = useCallback(async (keyword = ''): Promise<void> => {
    const request = ++workflowRequest.current;
    setWorkflowLoading(true);
    setWorkflowError('');
    try {
      const data = await listFlows({
        current: 1,
        pageSize: 100,
        search: keyword,
      });
      if (request !== workflowRequest.current) return;
      setWorkflows(
        data.pageData.flatMap(item =>
          typeof item.name === 'string' && typeof item.flowId === 'string'
            ? [{ name: item.name, flowId: item.flowId }]
            : []
        )
      );
    } catch {
      if (request === workflowRequest.current)
        setWorkflowError('无法读取工作流列表，请重试。');
    } finally {
      if (request === workflowRequest.current) setWorkflowLoading(false);
    }
  }, []);

  const loadWorkflowInputs = useCallback(
    async (
      flowId: string,
      inputParams: Record<string, any> = {},
      version?: string
    ): Promise<void> => {
      const request = ++configRequest.current;
      setConfigLoading(true);
      setConfigError('');
      try {
        const [raw, versions] = await Promise.all([
          getFlowInputsInfo(flowId, version),
          getVersionList({ flowId, current: 1, size: 100 }),
        ]);
        if (request !== configRequest.current) return;
        setVersionOptions(
          versions.records.map(version => ({
            value: version.versionNum,
            label: `${version.name} (${version.versionNum})`,
          }))
        );
        const schemas = normalizeInputsPayload(raw);
        setInputSchemas(schemas);
        form.setFieldsValue({
          inputValues: buildInputValues(schemas, inputParams),
          inputParamsJson: JSON.stringify(inputParams, null, 2),
        });
        setInputMode(schemas.length > 0 ? 'form' : 'json');
      } catch {
        if (request === configRequest.current)
          setConfigError('无法读取工作流版本和输入配置，请重试。');
      } finally {
        if (request === configRequest.current) setConfigLoading(false);
      }
    },
    [form]
  );

  useEffect(() => {
    void fetchTasks();
    void fetchWorkflows();
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
    configRequest.current += 1;
    setConfigLoading(false);
    setConfigError('');
    setFormError('');
    setVersionOptions([]);
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
    let inputParams: Record<string, any>;
    try {
      inputParams = parseJsonObject(record.inputParams);
    } catch {
      setActionError('任务输入参数无法解析，请检查原任务配置。');
      return;
    }
    setFormError('');
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
    void loadWorkflowInputs(record.flowId, inputParams, record.version);
  };

  const retryWorkflowInputs = (): void => {
    const flowId = form.getFieldValue('flowId');
    if (!flowId) return;
    try {
      void loadWorkflowInputs(
        flowId,
        parseJsonObject(form.getFieldValue('inputParamsJson')),
        form.getFieldValue('version')
      );
    } catch {
      setFormError('输入参数必须是合法 JSON 对象，请检查后重试。');
    }
  };

  const handleWorkflowChange = (flowId: string): void => {
    form.setFieldsValue({
      inputParamsJson: '{}',
      inputValues: {},
      version: undefined,
    });
    setVersionOptions([]);
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
    if (previewLoading) return;
    const cronExpression = form.getFieldValue('cronExpression');
    const timezone = form.getFieldValue('timezone') || DEFAULT_TIMEZONE;
    if (!cronExpression) {
      message.warning('请先填写 Cron 表达式');
      return;
    }
    setPreviewLoading(true);
    setFormError('');
    try {
      const times = await previewAutomationCron({ cronExpression, timezone });
      if (
        form.getFieldValue('cronExpression') === cronExpression &&
        (form.getFieldValue('timezone') || DEFAULT_TIMEZONE) === timezone
      )
        setPreviewTimes(times);
    } catch {
      setFormError('无法预览执行时间，请检查 Cron 和时区后重试。');
    } finally {
      setPreviewLoading(false);
    }
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
    if (submitPending.current || configLoading || configError) return;
    submitPending.current = true;
    setSubmitting(true);
    setFormError('');
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
        setFormError('输入参数必须是合法 JSON 对象，请检查后重试。');
      } else if (
        !(error && typeof error === 'object' && 'errorFields' in error)
      ) {
        setFormError('保存任务失败，当前输入已保留，请重试。');
      }
    } finally {
      submitPending.current = false;
      setSubmitting(false);
    }
  };

  const runTaskAction = async (
    record: WorkflowAutomationTask,
    action: () => Promise<unknown>,
    successText: string,
    refreshPage?: number
  ): Promise<void> => {
    if (busyTaskIds.current.has(record.id)) return;
    busyTaskIds.current.add(record.id);
    setBusyIds(new Set(busyTaskIds.current));
    setActionError('');
    try {
      await action();
      message.success(successText);
      const { page, pageSize, keyword } = currentList.current;
      await fetchTasks(refreshPage ?? page, pageSize, keyword);
    } catch {
      setActionError('任务操作失败，请重试。');
    } finally {
      busyTaskIds.current.delete(record.id);
      setBusyIds(new Set(busyTaskIds.current));
    }
  };

  const handleEnableChange = async (
    record: WorkflowAutomationTask,
    enabled: boolean
  ): Promise<void> => {
    await runTaskAction(
      record,
      () => setAutomationEnabled(record.id, enabled),
      enabled ? '任务已启用' : '任务已停用'
    );
  };

  const handleRunNow = async (
    record: WorkflowAutomationTask
  ): Promise<void> => {
    await runTaskAction(
      record,
      () => runAutomationNow(record.id),
      '已触发执行'
    );
  };

  const handleDelete = (record: WorkflowAutomationTask): void => {
    Modal.confirm({
      title: '删除自动化任务',
      content: `确认删除「${record.taskName}」？删除后不会继续调度。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await runTaskAction(
          record,
          () => deleteAutomationTask(record.id),
          '任务已删除',
          1
        );
      },
    });
  };

  const openRunsDrawer = async (
    record: WorkflowAutomationTask,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<void> => {
    const request = ++runsRequest.current;
    setRunsError('');
    setRuns([]);
    setSelectedTask(record);
    setHistoryOpen(true);
    setRunsLoading(true);
    try {
      const data = await getAutomationRuns(record.id, {
        current: page,
        pageSize,
      });
      if (request !== runsRequest.current) return;
      setRuns(data.pageData || []);
      setRunsPagination({
        current: data.page || page,
        pageSize: data.pageSize || pageSize,
        total: data.totalCount || 0,
      });
    } catch {
      if (request === runsRequest.current)
        setRunsError('无法加载执行历史，请重试。');
    } finally {
      if (request === runsRequest.current) setRunsLoading(false);
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
          aria-label={`启用任务 ${record.taskName}`}
          loading={busyIds.has(record.id)}
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
      width: 220,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="立即执行">
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              aria-label={`立即执行任务 ${record.taskName}`}
              disabled={busyIds.has(record.id)}
              onClick={() => void handleRunNow(record)}
            />
          </Tooltip>
          <Tooltip title="执行历史">
            <Button
              size="small"
              icon={<HistoryOutlined />}
              aria-label={`执行历史任务 ${record.taskName}`}
              disabled={busyIds.has(record.id)}
              onClick={() => void openRunsDrawer(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              size="small"
              icon={<EditOutlined />}
              aria-label={`编辑任务 ${record.taskName}`}
              disabled={busyIds.has(record.id)}
              onClick={() => openEditDrawer(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label={`删除任务 ${record.taskName}`}
              disabled={busyIds.has(record.id)}
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
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <div>
            <h1 className={styles.pageTitle}>定时自动化</h1>
            <p className={styles.toolbarHint}>
              管理工作流的执行周期、输入参数与运行历史。
            </p>
          </div>
          <Space wrap>
            <Button
              loading={loading}
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

        <div className={styles.searchRow}>
          <Input.Search
            aria-label="搜索自动化任务"
            placeholder="搜索任务名称"
            value={search}
            allowClear
            onChange={event => {
              setSearch(event.target.value);
              if (!event.target.value)
                void fetchTasks(1, pagination.pageSize, '');
            }}
            onSearch={value => void fetchTasks(1, pagination.pageSize, value)}
          />
        </div>
        {taskError && (
          <Alert
            type="error"
            showIcon
            message={taskError}
            action={
              <Button loading={loading} onClick={() => void fetchTasks()}>
                重试
              </Button>
            }
            className={styles.feedback}
          />
        )}
        {actionError && (
          <Alert
            type="error"
            showIcon
            message={actionError}
            closable
            onClose={() => setActionError('')}
            className={styles.feedback}
          />
        )}
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={tasks}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: taskError ? (
              '列表未加载'
            ) : (
              <Empty
                description={
                  search
                    ? '未找到匹配任务，请调整搜索词。'
                    : '暂无自动化任务，创建任务后即可按计划执行。'
                }
              />
            ),
          }}
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

      <Drawer
        title={selectedTask ? '编辑自动化任务' : '新建自动化任务'}
        open={drawerOpen}
        width="min(760px, 100vw)"
        destroyOnClose
        closable={!submitting}
        maskClosable={!submitting}
        onClose={() => {
          if (!submitting) {
            configRequest.current += 1;
            setDrawerOpen(false);
          }
        }}
        extra={
          <Space>
            <Button
              disabled={submitting}
              onClick={() => {
                configRequest.current += 1;
                setDrawerOpen(false);
              }}
            >
              取消
            </Button>
            <Button
              type="primary"
              loading={submitting}
              disabled={configLoading || Boolean(configError)}
              onClick={() => void handleSubmit()}
            >
              保存
            </Button>
          </Space>
        }
      >
        {formError && (
          <Alert
            type="error"
            showIcon
            message={formError}
            className={styles.feedback}
          />
        )}
        {workflowError && (
          <Alert
            type="error"
            showIcon
            message={workflowError}
            action={
              <Button
                loading={workflowLoading}
                onClick={() => void fetchWorkflows()}
              >
                重试
              </Button>
            }
            className={styles.feedback}
          />
        )}
        {configError && (
          <Alert
            type="error"
            showIcon
            message={configError}
            action={
              <Button loading={configLoading} onClick={retryWorkflowInputs}>
                重试
              </Button>
            }
            className={styles.feedback}
          />
        )}
        <Form
          layout="vertical"
          form={form}
          requiredMark={false}
          disabled={submitting || configLoading}
        >
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
              label="工作流"
              rules={[{ required: true, message: '请选择工作流' }]}
            >
              <Select
                showSearch
                loading={workflowLoading}
                options={workflowOptions}
                placeholder="搜索并选择工作流"
                filterOption={false}
                onSearch={fetchWorkflows}
                onChange={handleWorkflowChange}
              />
            </Form.Item>
            <Form.Item
              name="version"
              label="固定工作流版本"
              rules={[{ required: true, message: '请选择已保存版本' }]}
            >
              <Select
                loading={configLoading}
                disabled={configLoading || submitting}
                options={versionOptions}
                placeholder="请先在画布保存版本"
                onChange={(version: string) => {
                  const flowId = form.getFieldValue('flowId');
                  if (flowId) void loadWorkflowInputs(flowId, {}, version);
                }}
              />
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
            <Button
              loading={previewLoading}
              onClick={() => void handlePreviewCron()}
            >
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
                aria-label="输入参数编辑方式"
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
        onClose={() => {
          runsRequest.current += 1;
          setHistoryOpen(false);
        }}
      >
        {runsError && (
          <Alert
            type="error"
            showIcon
            message={runsError}
            action={
              <Button
                loading={runsLoading}
                onClick={() => {
                  if (selectedTask)
                    void openRunsDrawer(
                      selectedTask,
                      runsPagination.current,
                      runsPagination.pageSize
                    );
                }}
              >
                重试
              </Button>
            }
            className={styles.feedback}
          />
        )}
        <Table
          locale={{
            emptyText: runsError ? (
              '历史未加载'
            ) : (
              <Empty description="暂无执行历史" />
            ),
          }}
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
