import useAntModal from '@/hooks/use-ant-modal';
import React, { forwardRef, useImperativeHandle, useState } from 'react';

import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Switch,
  Table,
  Tooltip,
} from 'antd';
import { RpaParameter, RpaRobot } from '@/types/rpa';
import { ColumnsType, TableProps } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import JsonMonacoEditor from '@/components/monaco-editor/json-monaco-editor';
import { getAuthorization, getFixedUrl } from '../../utils';
import { isJSON } from '@/utils';
import { QuestionCircleOutlined } from '@ant-design/icons';

const filterUndefined = (obj: Record<string, any>) => {
  return Object.entries(obj || {}).reduce(
    (acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, any>
  );
};

export const ModalRpaRun = forwardRef<{
  showModal: (values?: RpaRobot) => void;
}>((_, ref) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const [currentRobot, setCurrentRobot] = useState<RpaRobot | null>(null);
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  useImperativeHandle(ref, () => ({
    showModal: values => {
      setCurrentRobot(values || null);
      showModal();
    },
  }));
  const { commonAntModalProps, showModal } = useAntModal({
    handleCancelCallback: () => {
      form.resetFields();
      setCurrentRobot(null);
      setResult('');
      setLoading(false);
    },
  });
  const columns = [
    {
      title: t('rpa.parameterName'),
      dataIndex: 'varName',
      width: 160,
      render: (text: string, record: RpaParameter) => {
        return (
          <div className="text-base font-medium text=[#333] flex items-center">
            {text}
            {record?.varDescribe && (
              <Tooltip title={record?.varDescribe}>
                <span className="ml-2">
                  <QuestionCircleOutlined />
                </span>
              </Tooltip>
            )}
          </div>
        );
      },
    },

    {
      title: t('rpa.parameterType'),
      dataIndex: 'type',
      width: 100,
    },
    {
      title: t('rpa.defaultValue'),
      dataIndex: 'varValue',
      width: 100,
    },
    {
      title: t('rpa.parameterValue'),
      dataIndex: 'parameterValue',
      width: 100,
      editable: true,
    },
  ];

  const mergedColumns: TableProps<RpaParameter>['columns'] = columns.map(
    col => {
      if (!col.editable) {
        return col;
      }
      return {
        ...col,
        onCell: (record: RpaParameter) => ({
          record,
          inputType: record?.type,
          dataIndex: col.dataIndex,
          title: col.title,
          editing: true,
        }),
      };
    }
  );

  const handleRun = async () => {
    const values = await form.validateFields();
    const defaultValues = (currentRobot?.parameters || [])
      .filter(item => item.varDirection === 0)
      .reduce(
        (acc, item) => {
          acc[item.varName] = item.varValue;
          return acc;
        },
        {} as Record<string, string>
      );

    const controller = new AbortController();
    setLoading(true);
    fetchEventSource(getFixedUrl('/api/rpa/debug'), {
      openWhenHidden: true,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'X-RPA-Token': currentRobot?.apiKey || '',
        Authorization: getAuthorization(),
      },
      signal: controller.signal,
      body: JSON.stringify({
        projectId: currentRobot?.project_id,
        execPosition: 'EXECUTOR',
        params: { ...defaultValues, ...filterUndefined(values) },
        version: currentRobot?.version,
      }),
      onmessage(e) {
        if (e && e.event === 'error') {
          controller.abort();
          setLoading(false);
          setResult(JSON.stringify(JSON.parse(e.data), null, 2));
        } else if (e && e.data) {
          if (e.data && isJSON(e.data)) {
            const data = JSON.parse(e.data);
            if (data?.code || data?.code === 0) {
              setResult(JSON.stringify(data, null, 2));
              setLoading(false);
            }
          }
        }
      },
      onerror(e) {
        controller.abort();
        setLoading(false);
        if (e && e.data) {
          setResult(JSON.stringify(JSON.parse(e.data), null, 2));
        }
      },
      onclose() {
        setLoading(false);
      },
    });
  };
  return (
    <Form form={form} component={false}>
      <Modal
        zIndex={9999}
        {...commonAntModalProps}
        footer={null}
        width={880}
        title={currentRobot?.name}
        maskClosable
      >
        <div className="pt-[24px]">
          <Table
            bordered={false}
            components={{
              body: { cell: EditableCell },
            }}
            dataSource={(currentRobot?.parameters || []).filter(
              item => item.varDirection === 0
            )}
            columns={mergedColumns}
            className="document-table"
            rowClassName="editable-row"
            pagination={false}
          />
          <div className="flex justify-between py-6 items-center">
            <div className="text-base font-medium text=[#333]">
              {t('rpa.runResult')}
            </div>
            <Button loading={loading} type="primary" onClick={handleRun}>
              {t('rpa.run')}
            </Button>
          </div>
          <div className="min-h-[250px]">
            <JsonMonacoEditor
              className="tool-debugger-json"
              value={result}
              options={{
                readOnly: true,
              }}
            />
          </div>
        </div>
      </Modal>
    </Form>
  );
});

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
  editing: boolean;
  dataIndex: string;
  title: any;
  inputType: 'number' | 'string' | 'boolean' | 'object' | 'integer';
  record: RpaParameter;
  index: number;
}

export const EditableCell: React.FC<
  React.PropsWithChildren<EditableCellProps>
> = ({
  editing,
  dataIndex,
  title,
  inputType,
  record,
  index,
  children,
  ...restProps
}) => {
  const { t } = useTranslation();
  const INPUT_MAP = new Map<string, React.ReactNode>([
    [
      'number',
      <InputNumber
        step={1}
        precision={0}
        placeholder={t('common.inputPlaceholder')}
      />,
    ],
    ['string', <Input placeholder={t('common.inputPlaceholder')} />],
    [
      'boolean',
      <Switch
        checkedChildren={t('common.true')}
        unCheckedChildren={t('common.false')}
      />,
    ],
    ['object', <JsonMonacoEditor />],
    ['integer', <InputNumber placeholder={t('common.inputPlaceholder')} />],
  ]);

  const inputNode = INPUT_MAP.get(inputType) || <JsonMonacoEditor />;

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item name={record.varName} style={{ margin: 0 }}>
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};
