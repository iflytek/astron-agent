import React, { useState, useEffect, FC } from 'react';
import { Modal, Form, Input, Button, Select } from 'antd';
import i18next from 'i18next';
import { toolFeedback, listToolSquare } from '@/services/plugin';

const { TextArea } = Input;

import close from '@/assets/imgs/workflow/modal-close.png';
import { ToolItem } from '@/types/resource';

const FeedbackDialog: FC<{
  visible: boolean;
  setVisible: (visible: boolean) => void;
}> = props => {
  const { visible, setVisible } = props;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [desc, setDesc] = useState('');
  const [pluginType, setPluginType] = useState(0);
  const [dataSource, setDataSource] = useState<ToolItem[]>([]);

  useEffect(() => {
    form.setFieldsValue({
      pluginType: 0,
    });
  }, [visible]);

  useEffect(() => {
    const params = {
      page: 1,
      pageSize: 999,
      orderFlag: 0,
    };
    listToolSquare(params).then(data => {
      setDataSource(data?.pageData || []);
    });
  }, []);

  const handleCancel = (): void => {
    form.resetFields();
    setDesc('');
    setVisible(false);
    setLoading(false);
    setPluginType(0);
  };

  const handleOk = (): void => {
    form.validateFields().then(values => {
      const toolName = dataSource.find(
        item => item.toolId === values.toolId
      )?.name;
      const params: { remark: string; toolId?: string; name?: string } = {
        remark: values.description,
      };
      if (values.pluginType === 1) {
        params.toolId = values?.toolId;
        params.name = toolName || '';
      }
      setLoading(true);
      toolFeedback(params)
        .then(res => {
          handleCancel();
        })
        .finally(() => {
          setLoading(false);
        });
    });
  };

  return (
    <Modal
      title={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{i18next.t('plugin.pluginFeedback')}</span>
          <img
            src={close}
            alt=""
            className="w-3 h-3 cursor-pointer"
            onClick={handleCancel}
          />
        </div>
      }
      closeIcon={false}
      maskClosable={false}
      keyboard={false}
      centered
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          {i18next.t('workflow.promptDebugger.cancel')}
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleOk}
        >
          {i18next.t('common.save')}
        </Button>,
      ]}
      width={640}
      styles={{
        header: {
          marginBottom: 24,
        },
      }}
      zIndex={1002}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          rules={[
            {
              required: true,
              message: i18next.t('plugin.pleaseEnterPluginName'),
            },
          ]}
          name="pluginType"
          label={i18next.t('plugin.feedbackType')}
        >
          <Select
            className="global-select"
            placeholder={i18next.t('common.pleaseSelect')}
            options={[
              {
                label: i18next.t('plugin.nonexistentPlugin'),
                value: 0,
              },
              {
                label: i18next.t('plugin.existPlugin'),
                value: 1,
              },
            ]}
            value={pluginType}
            onChange={value => setPluginType(value)}
          />
        </Form.Item>
        {pluginType === 1 && (
          <Form.Item
            rules={[
              {
                required: true,
                message: i18next.t('plugin.pleaseSelectOfficialPlugin'),
              },
            ]}
            name="toolId"
            label={i18next.t('plugin.selectOfficialPlugin')}
          >
            <Select
              className="global-select"
              placeholder={i18next.t('common.pleaseSelect')}
            >
              {dataSource.map(item => (
                <Select.Option key={item.toolId} value={item.toolId}>
                  <div className="flex items-center gap-2">
                    <img
                      src={item?.address + item.icon}
                      alt=""
                      className="w-5 h-5 rounded"
                    />
                    <span>{item.name}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}
        <Form.Item
          name="description"
          label={i18next.t('workflow.promptDebugger.feedbackContent')}
          rules={[
            {
              required: true,
              message: i18next.t(
                'workflow.promptDebugger.pleaseEnterFeedbackContent'
              ),
            },
            {
              max: 1000,
              message: i18next.t(
                'workflow.promptDebugger.feedbackContentMaxLength'
              ),
            },
          ]}
          required={true}
        >
          <div className="relative">
            <TextArea
              maxLength={200}
              placeholder={i18next.t('common.inputPlaceholder')}
              className="global-textarea shrink-0"
              style={{ height: 120 }}
              value={desc}
              onChange={event => setDesc(event.target.value)}
            />
            <div className="absolute bottom-3 right-3 ant-input-limit ">
              {desc?.length} / 200
            </div>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default FeedbackDialog;
