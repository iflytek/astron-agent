import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message, Spin, Tooltip } from 'antd';
import Ai_img from '@/assets/imgs/agent-creation/AI_icon.png';
import {
  quickCreateBot,
  aiGenPrologue,
  getBotTemplate,
} from '@/services/spark-common';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HeaderFeedbackModalProps,
  BotMarketItem,
  QuickCreateBotResponse,
} from '@/types/agent-create';
import { AxiosResponse } from 'axios';
import { getRandom3 } from '@/utils/agent-create-utils';

import styles from './index.module.scss';

const HeaderFeedbackModal: React.FC<HeaderFeedbackModalProps> = ({
  visible,
  onCancel,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [form] = Form.useForm<{ preset_detail: string }>();
  const [tuijian, setTuijian] = useState<BotMarketItem[]>([]);

  const handleSubmit = (values: { preset_detail: string }): void => {
    setLoading(true);
    quickCreateBot(values.preset_detail).then(
      async (res: AxiosResponse<QuickCreateBotResponse>) => {
        await sessionStorage.setItem(
          'botTemplateInfoValue',
          JSON.stringify(res)
        );
        setLoading(false);
        navigate(
          '/space/config/base?create=true&quickCreate=trueis&sentence=1'
        );
        onCancel();
      },
      (err: { msg?: string }) => {
        message.error(err?.msg || t('createAgent1.createAgentFailed'));
        setLoading(false);
      }
    );
  };

  const aiGen = (): void => {
    const presetDetail = form.getFieldsValue().preset_detail;
    if (!presetDetail) {
      message.warning(t('createAgent1.settingCannotBeEmpty'));
      return;
    }
    setLoading(true);
    aiGenPrologue({ name: presetDetail })
      .then((res: string | object) => {
        // 检查 res 是否为字符串
        if (typeof res === 'string') {
          form.setFieldsValue({ preset_detail: res });
        } else {
          // 若 res 不是字符串，尝试将其转换为字符串
          form.setFieldsValue({ preset_detail: JSON.stringify(res) });
        }
        setLoading(false);
      })
      .catch((err: { msg?: string }) => {
        setLoading(false);
        message.error(err?.msg || t('createAgent1.aiGeneratedFailed'));
      });
    return;
  };

  useEffect(() => {
    getBotTemplate().then((res: unknown) => {
      if (res) {
        setTuijian(getRandom3(res as BotMarketItem[]));
      }
    });
  }, []);

  return (
    <Modal
      wrapClassName={styles.open_source_modal}
      width={640}
      open={visible}
      centered
      onCancel={onCancel}
      destroyOnClose
      maskClosable={false}
      footer={null}
    >
      <Spin spinning={loading} tip={t('createAgent1.generating')}>
        <div className={styles.modal_content}>
          <div className={styles.title}>
            {t('createAgent1.oneSentenceCreateAgent')}
          </div>
          <Form
            form={form}
            preserve={false}
            onFinish={handleSubmit}
            labelCol={{ span: 4, offset: 0 }}
            style={{ position: 'relative' }}
          >
            <div className={styles.tuijianBox}>
              <div className={styles.tuijianTitle}>
                {t('createAgent1.inspirationRecommend')}：
              </div>
              {tuijian.map(item => (
                <div
                  key={item?.id}
                  className={styles.tuijianButton}
                  onClick={() => {
                    getBotTemplate(item?.id).then(async (res: unknown) => {
                      if (!res) {
                        return message.warning(
                          t('createAgent1.templateDataEmpty')
                        );
                      }
                      if (Array.isArray(res) && res?.length > 0) {
                        await sessionStorage.setItem(
                          'botTemplateInfoValue',
                          JSON.stringify(res[0])
                        );
                      }
                      navigate(
                        '/space/config/base?create=true&quickCreate=true'
                      );
                      return;
                    });
                  }}
                >
                  <Tooltip title={item?.botName} placement="top">
                    {item?.botName}
                  </Tooltip>
                </div>
              ))}
            </div>
            <Form.Item
              name="preset_detail"
              label={t('createAgent1.setting')}
              labelCol={{ span: 24 }}
              wrapperCol={{ span: 24 }}
              rules={[
                {
                  required: true,
                  message: t('createAgent1.settingDescriptionCannotBeEmpty'),
                },
                // { max: 200, message: '字数超出限制，最多输入200字' },
                {
                  whitespace: true,
                  message: t('createAgent1.settingDescriptionCannotBeEmpty'),
                },
              ]}
              validateTrigger="onBlur"
              className={styles.form_area}
            >
              <Input.TextArea
                showCount
                maxLength={520}
                name="preset_detail"
                className={styles.input_area}
                autoSize={{ minRows: 5, maxRows: 5 }}
                placeholder={t('createAgent1.pleaseEnterContent')}
              />
            </Form.Item>
            <div className={styles.inputBottom}>
              <div
                style={{
                  background: '#F2F5FE',
                  borderRadius: '16px',
                  marginBottom: '5px',
                  marginLeft: '10px',
                }}
              >
                <div
                  className={styles.aiBottom}
                  onClick={() => {
                    aiGen();
                  }}
                >
                  <img src={Ai_img} alt="AI generated" />
                  <span>{t('createAgent1.aiGenerated')}</span>
                </div>
              </div>
              <div
                className={styles.clearBottom}
                onClick={() => {
                  form.resetFields();
                }}
              >
                {t('createAgent1.clear')}
              </div>
            </div>
            <div className={styles.footerContiner}>
              <div
                className={styles.cancelBtn}
                onClick={() => {
                  navigate('/space/config/base?create=true');
                }}
              >
                {t('createAgent1.skip')}
              </div>
              <Button className={styles.submitBtn} htmlType="submit">
                {t('createAgent1.createAgent')}
              </Button>
            </div>
          </Form>
        </div>
      </Spin>
    </Modal>
  );
};

export default HeaderFeedbackModal;
