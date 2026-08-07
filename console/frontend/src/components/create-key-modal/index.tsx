import React, { useState, useEffect, useRef, useMemo } from 'react';
import { message, Modal, Input, Form, Button, Space } from 'antd';
import { ExclamationCircleOutlined, CopyOutlined } from '@ant-design/icons';
import { createKey, deleteKey, searchKeys, updateKey } from '@/services/apiKey';

import styles from './index.module.scss';

interface formValue {
  name: string;
  desc: string;
}
export interface keyListType {
  id: number;
  spaceId: number | null;
  createUid: number;
  name: string;
  description: string;
  appId: number | null;
  apiKey: string | null;
  apiSecret: string | null;
  deleted: number | null;
  createTime: string;
  updateTime: string | null;
  createName: string;
  avatar: string;
}
const CreateKeyModal: React.FC<{
  isEdit: boolean;
  createKeyVisible: boolean;
  rowData?: keyListType;
  onCancel: () => void;
  onOk: () => void;
}> = ({ isEdit, createKeyVisible, rowData, onCancel, onOk }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (isEdit) {
      form.setFieldsValue({
        name: rowData?.name,
        desc: rowData?.description,
      });
    }
  }, [isEdit, rowData]);

  // 弹窗表单提交
  const handleCreateKey = (values: formValue) => {
    if (isEdit) {
      updateKey({
        ...rowData,
        name: values.name,
        desc: values.desc,
        description: values.desc,
      }).then(res => {
        message.success('更新成功');
        onCancel();
      });
    } else {
      createKey({ ...values }).then((res: any) => {
        Modal.info({
          title: '创建新Key',
          icon: null,
          maskClosable: false,
          closable: true,
          width: 600,
          className: styles.keyModal,
          content: (
            <div>
              <div className={styles.warningBox}>
                <ExclamationCircleOutlined className={styles.warningIcon} />
                <span className={styles.warningText}>
                  请保管好你的密钥，密钥不会再次展示
                </span>
              </div>
              <div className={styles.keyBox}>
                <span className={styles.keyText}>{res}</span>
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  className={styles.copyButton}
                  title="复制"
                  onClick={() => {
                    navigator.clipboard.writeText(res);
                    message.success('复制成功');
                  }}
                />
              </div>
            </div>
          ),
          okText: '确定',
          onOk: () => {
            onOk();
          },
          onCancel: () => {
            onOk();
          },
        });
      });
    }
    onCancel();

    // 重置表单
    form.resetFields();
  };
  return (
    <Modal
      title={isEdit ? '编辑key' : '创建新Key'}
      centered
      open={createKeyVisible}
      onCancel={onCancel}
      footer={null}
      afterClose={() => {
        onOk();
        form.resetFields();
      }}
    >
      <Form form={form} layout="vertical" onFinish={handleCreateKey}>
        <Form.Item
          label="名称"
          name="name"
          rules={[
            { required: true, message: '请输入名称' },
            { max: 20, message: '名称不能超过20个字符' },
          ]}
        >
          <Input
            placeholder="请输入名称"
            maxLength={20}
            showCount
            style={{ width: '100%' }}
            disabled={isEdit}
          />
        </Form.Item>
        <Form.Item
          label="描述说明"
          name="desc"
          rules={[
            { required: true, message: '请输入描述说明' },
            { max: 50, message: '描述不能超过50个字符' },
          ]}
        >
          <Input.TextArea
            placeholder="请输入描述说明"
            maxLength={50}
            showCount
            rows={4}
            style={{ resize: 'none' }}
          />
        </Form.Item>
        <Form.Item>
          <Space className="float-right">
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" htmlType="submit">
              {isEdit ? '更新' : '创建'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateKeyModal;
