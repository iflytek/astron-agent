import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  JSX,
  ReactNode,
} from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Tooltip,
  message,
  Spin,
} from 'antd';
import { fieldList, operateTableData } from '@/services/database';
import { TableField, OperateType } from '@/types/database';
import questionIcon from '@/assets/imgs/database/question-icon.svg';
import dayjs from 'dayjs';
import { DatabaseItem } from '@/types/database';
import { Rule } from 'antd/es/form';
import i18n from '@/locales/i18n';

// 常量定义
const FIELD_TYPES = {
  STRING: 'String',
  INTEGER: 'Integer',
  NUMBER: 'Number',
  TIME: 'Time',
  BOOLEAN: 'Boolean',
} as const;

const VALIDATION_PATTERNS = {
  INTEGER: /^-?\d+$/,
  NUMBER: /^-?\d+(\.\d+)?$/,
} as const;

const PAGE_SIZE = 200;
const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

// 格式化字段标签
const formatFieldLabel = (field: TableField): JSX.Element => {
  return (
    <div className="flex items-center gap-1 text-[#333333]">
      <span className="label">{field.name}</span>
      <Tooltip placement="top" title={field.description}>
        <img src={questionIcon} className="w-[14px] h-[14px]" alt="" />
      </Tooltip>
      <span className="text-[#0f1528d1] bg-[#5768a114] px-[5px]">
        {field.type}
      </span>
    </div>
  );
};

// 工具函数：生成表单验证规则
const generateFieldValidationRules = (field: TableField): Rule[] => {
  const rules: Rule[] = [
    {
      required: field.isRequired,
      message: i18n.t('database.fieldCannotBeEmpty', {
        field: field.name,
      }),
    },
  ];

  switch (field.type) {
    case FIELD_TYPES.INTEGER:
      rules.push({
        pattern: VALIDATION_PATTERNS.INTEGER,
        message: i18n.t('database.illegalInput'),
      });
      break;
    case FIELD_TYPES.NUMBER:
      rules.push({
        pattern: VALIDATION_PATTERNS.NUMBER,
        message: i18n.t('database.illegalInput'),
      });
      break;
  }

  return rules;
};

// 渲染表单组件
const renderFieldComponent = (fieldType: string): JSX.Element => {
  switch (fieldType) {
    case FIELD_TYPES.STRING:
      return <Input placeholder={i18n.t('database.pleaseEnterField')} />;
    case FIELD_TYPES.INTEGER:
      return <Input placeholder={i18n.t('database.pleaseEnterField')} />;
    case FIELD_TYPES.NUMBER:
      return (
        <InputNumber
          placeholder={i18n.t('database.pleaseEnterField')}
          className="w-full"
        />
      );
    case FIELD_TYPES.TIME:
      return (
        <DatePicker
          showTime
          format={DATE_FORMAT}
          placeholder={i18n.t('database.pleaseSelectDate')}
          className="w-full"
        />
      );
    case FIELD_TYPES.BOOLEAN:
      return (
        <Select placeholder={i18n.t('database.pleaseSelect')}>
          <Select.Option value="true">true</Select.Option>
          <Select.Option value="false">false</Select.Option>
        </Select>
      );
    default:
      return <Input placeholder={i18n.t('database.pleaseEnterField')} />;
  }
};

// 定义Props接口
interface AddTableRowModalProps {
  open: boolean;
  info: DatabaseItem;
  setOpen: (open: boolean) => void;
  handleUpdateTable: () => void;
  dataType: number;
}

const AddTableRowModal = (props: AddTableRowModalProps): JSX.Element => {
  const { open, info, setOpen, handleUpdateTable, dataType } = props;
  const [form] = Form.useForm();
  const [fieldsList, setFieldsList] = useState<TableField[]>([]);
  const [loading, setLoading] = useState(false);
  const [fieldListLoading, setFieldListLoading] = useState(false);

  const getFieldList = useCallback(async (): Promise<void> => {
    setFieldListLoading(true);
    try {
      const res = await fieldList({
        tbId: info.id,
        pageNum: 1,
        pageSize: PAGE_SIZE,
      });
      const list = res.records.filter(item => !item.isSystem);
      setFieldsList(list);

      // 设置表单初始值
      const initialValues: Record<string, unknown> = {};
      list.forEach(item => {
        if (
          typeof item.defaultValue === 'number' ||
          Boolean(item.defaultValue)
        ) {
          initialValues[item.name] =
            item.type === FIELD_TYPES.TIME
              ? dayjs(item.defaultValue)
              : item.defaultValue;
        }
      });

      if (Object.keys(initialValues).length > 0) {
        form.setFieldsValue(initialValues);
      }
    } catch (error) {
      // 记录错误信息
      message.error(i18n.t('database.getFieldListFailed'));
    } finally {
      setFieldListLoading(false);
    }
  }, [info.id]);

  // 移除不再需要的formComponentMap

  // 渲染表单字段
  const renderFormItems = useMemo((): JSX.Element[] => {
    return fieldsList.map((field: TableField) => {
      const rules = generateFieldValidationRules(field);

      return (
        <Form.Item
          key={field.id}
          name={field.name}
          label={formatFieldLabel(field)}
          rules={rules}
        >
          {renderFieldComponent(field.type)}
        </Form.Item>
      );
    });
  }, [fieldsList]);

  const onCreate = useCallback(
    async (values: Record<string, unknown>): Promise<void> => {
      // 格式化表单数据
      const formattedValues = Object.entries(values).reduce(
        (acc, [key, value]) => {
          if (!value && typeof value !== 'number') {
            acc[key] = null;
          } else if (dayjs.isDayjs(value)) {
            acc[key] = dayjs(value).format(DATE_FORMAT);
          } else {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, unknown>
      );

      setLoading(true);

      const params = {
        tbId: info.id,
        execDev: dataType - 1,
        data: [
          {
            operateType: OperateType.ADD,
            tableData: formattedValues,
          },
        ],
      };

      try {
        await operateTableData(params);
        setLoading(false);
        setOpen(false);
        handleUpdateTable();
        message.success(i18n.t('database.addRowSuccess'));
      } catch (error) {
        setLoading(false);
        message.error(i18n.t('database.addRowFailed'));
      }
    },
    [info.id, dataType, setOpen, handleUpdateTable]
  );

  // Modal样式配置
  const modalStyles = useMemo(
    () => ({
      body: {
        maxHeight: 'calc(100vh - 200px)',
        paddingRight: 4,
        overflowY: 'auto' as const,
      },
      content: {
        paddingRight: 20,
      },
    }),
    []
  );

  // 关闭Modal的处理函数
  const handleCancel = useCallback((): void => {
    setOpen(false);
    form.resetFields();
  }, [setOpen, form]);

  useEffect(() => {
    if (open) {
      getFieldList();
    } else {
      // 清理表单数据
      form.resetFields();
    }
  }, [open, getFieldList]);

  return (
    <Modal
      open={open}
      title={i18n.t('database.addRow')}
      okText={i18n.t('database.add')}
      cancelText={i18n.t('database.cancel')}
      confirmLoading={fieldListLoading || loading}
      okButtonProps={{
        autoInsertSpace: false,
        loading: loading,
        disabled: fieldListLoading,
      }}
      onOk={(): void => {
        form.submit();
      }}
      onCancel={handleCancel}
      styles={modalStyles}
      modalRender={(dom: ReactNode): JSX.Element => (
        <Form
          layout="vertical"
          form={form}
          name="addRowForm"
          clearOnDestroy
          onFinish={onCreate}
          preserve={false}
        >
          {dom}
        </Form>
      )}
      centered
    >
      {fieldListLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spin />
        </div>
      ) : (
        renderFormItems
      )}
    </Modal>
  );
};

export default AddTableRowModal;
