import { useEffect, useState } from 'react';
import { Button, Form, message, Modal, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getApiList,
  getApiInfo,
  getApiUsage,
  createApi,
  createApp,
} from '@/services/spark-common';
import { isPublishApprovalDecision } from '@/services/release-management';
import { Select } from 'antd';
import backIcon from '@/assets/svgs/back-create-bot.svg';
import styles from './api.module.scss';

const Divider = () => {
  return (
    <div className={styles.divider}>
      {[1, 2, 3, 4, 5, 6].map((_item, index) => {
        return <div key={index} className={styles.divider_circle} />;
      })}
    </div>
  );
};

export default function BotApi({
  _isOpenapi = false,
}: {
  _isOpenapi?: boolean;
}) {
  const { t } = useTranslation();
  const [createAppForm] = Form.useForm(); //创建应用表单
  const navigate = useNavigate();
  // 新增状态，标记是否已经获取过 API 列表
  const [hasFetchedApiList, setHasFetchedApiList] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const [botId, setBotId]: any = useState('');
  const [appList, setAppList] = useState<any[]>([]);
  const [appId, setAppId] = useState<any>(''); //appId
  const [apiInfo, setApiInfo] = useState<any>(null);
  const [apiUsage, setApiUsage] = useState<any>({});
  const [freshCount, setFreshCount] = useState<number>(0); // 刷新页面数据
  const [loading, setLoading] = useState(false);
  const [isShowCreateAppModal, setIsShowCreateAppModal] =
    useState<boolean>(false); // 是否显示创建应用弹框
  const [docUrl, setDocUrl] = useState<string>(); // 文档地址

  const createApiFn = async (publishBindId?: any, appIdParam?: any) => {
    try {
      const result = await createApi({ botId, appId: appIdParam || appId });
      if (isPublishApprovalDecision(result)) {
        message.success('已提交发布审核，审核通过后将自动绑定并发布为 API');
        return;
      }
      setFreshCount(freshCount + 1);
      message.success('绑定成功');
    } catch (e: any) {
      message.error(e?.msg);
    } finally {
      setLoading(false);
    }
  };
  //更新 or 绑定
  const handleBindApi = () => {
    if (!appId) {
      message.warning('请先绑定您的应用');
      return;
    }
    createApiFn(null, appId);
  };

  /**
   * update api info
   * @param botId botId
   * @param appId appId
   */
  const updateApiInfo = async (botId: any, appId: any) => {
    setAppId(appId);
    setBotId(botId);
    createApiFn(null, appId);
  };
  /**
   * load api usage data
   * @param id botId
   */
  const loadApiUsageData = async (id: any) => {
    const res = await getApiUsage(id);
    setApiUsage(res);
  };

  /**
   * load list of app
   */
  const loadAppList = async () => {
    const res = await getApiList();
    const data = res.map((item: any) => {
      return {
        value: item.appId,
        label: item.appName || item.appId,
      };
    });
    setAppList(data);
  };

  /**
   * load api info
   * @param id botId
   */
  const loadAPiInfo = async (id: string) => {
    const res = await getApiInfo(id);
    setApiInfo(res);
  };

  const handleSubmitCreateApp = () => {
    createAppForm.validateFields().then(values => {
      createApp(values)
        .then(() => {
          message.success('创建应用成功');
          setIsShowCreateAppModal(false);
          createAppForm.resetFields();
          loadAppList();
        })
        .catch(err => {
          message.error(err?.message || '创建应用失败');
        });
    });
  };

  useEffect(() => {
    if (searchParams.get('id')) {
      setBotId(searchParams.get('id'));
    }

    // NOTE: 指令型和工作流类型的智能体文档不同 -- 0715补充
    const url =
      searchParams.get('version') !== '1'
        ? 'https://www.xfyun.cn/doc/spark/Agent04-API%E6%8E%A5%E5%85%A5.html'
        : 'https://www.xfyun.cn/doc/spark/SparkAssistantAPI.html';
    setDocUrl(url);
  }, [searchParams]);

  useEffect(() => {
    if (appList?.length) {
      loadAPiInfo(botId);
      // loadApiUsageData(botId);
    } else if (!hasFetchedApiList) {
      loadAppList();
      setHasFetchedApiList(true);
    }
  }, [appList, freshCount, hasFetchedApiList]);

  return (
    <section className={styles.api_swap}>
      <section className={styles.api_container}>
        <div className={styles.api_header}>
          <img
            src={backIcon}
            alt=""
            style={{ marginRight: '10px', cursor: 'pointer' }}
            onClick={() => navigate(-1)}
          />
          <span className={styles.api_header_title}>{t('botApi.botApi')}</span>
          <span className={styles.api_header_subtitle}>
            {t('botApi.botApiDesc')}
          </span>
        </div>
        <div className={styles.api_step}>
          <div className={styles.step}>
            <img
              src="https://aixfyun-cn-bj.xfyun.cn/bbs/75713.75546409925/cir.svg"
              alt=""
              className={styles.step_index}
            />
            <div className={styles.step_detail}>
              <span className={styles.title}>{t('botApi.bindApp')}</span>
              <span className={styles.subtitle}>{t('botApi.bindAppDesc')}</span>
              <span
                className={styles.fun}
                onClick={() => {
                  setIsShowCreateAppModal(true);
                }}
              >
                {t('botApi.createApi')} {' >'}
              </span>
            </div>
          </div>
          <Divider />
          <div className={styles.step}>
            <img
              src="https://aixfyun-cn-bj.xfyun.cn/bbs/84687.53848944922/cir2.svg"
              alt=""
              className={styles.step_index}
            />
            <div className={styles.step_detail}>
              <span className={styles.title}>{t('botApi.callService')}</span>
              <span className={styles.subtitle}>
                {t('botApi.callServiceDesc')}
              </span>
              <span
                className={styles.fun}
                onClick={() => {
                  window.open(docUrl);
                }}
              >
                {t('botApi.apiDoc')}
              </span>
            </div>
          </div>
        </div>
        <div className={styles.statistic}>
          <div className={styles.certified_card}>
            <div className={styles.certified_card_title}>
              <span>{t('botApi.apiCertInfo')}</span>
              <div
                onClick={() => {
                  window.open(docUrl);
                }}
              >
                {t('botApi.viewApiDoc')}
              </div>
            </div>
            <div className={styles.appid_box}>
              <div className={styles.appid_select}>
                {apiInfo?.appId && (
                  <>
                    <span className={styles.appid_select_title}>
                      {t('botApi.bindAppID')}
                    </span>
                    <span
                      className={styles.appid_select_appid}
                      title={apiInfo.appId}
                    >
                      {apiInfo && apiInfo.appId}
                    </span>

                    <span className={styles.appid_select_divide} />
                    <span className={styles.appid_select_title}>
                      {t('botApi.appName')}
                    </span>
                    <span
                      className={styles.appid_select_appid}
                      title={apiInfo?.appName}
                    >
                      {apiInfo && apiInfo.appName
                        ? apiInfo.appName
                        : t('botApi.unNamed')}
                    </span>
                    {searchParams.get('version') !== '1' && (
                      <Button
                        type="primary"
                        ghost
                        size="small"
                        loading={loading}
                        style={{
                          marginLeft: 30,
                          color: '#fff',
                          height: '30px',
                          lineHeight: '30px',
                          fontSize: '12px',
                        }}
                        onClick={() => updateApiInfo(botId, apiInfo.appId)}
                      >
                        {t('botApi.updateBind')}
                      </Button>
                    )}
                  </>
                )}
                {!apiInfo?.appId && (
                  <>
                    <Select
                      showSearch
                      style={{ width: 192 }}
                      placeholder={t('botApi.selectApp')}
                      onChange={e => {
                        setAppId(e);
                      }}
                      options={appList}
                      filterOption={(input, option) =>
                        (option?.label ?? '').includes(input)
                      }
                      filterSort={(optionA, optionB) =>
                        (optionA?.label ?? '')
                          .toLowerCase()
                          .localeCompare((optionB?.label ?? '').toLowerCase())
                      }
                    />
                    <Button
                      type="primary"
                      ghost
                      size="small"
                      loading={loading}
                      style={{
                        marginLeft: 10,
                        color: '#fff',
                        height: '30px',
                        lineHeight: '30px',
                        fontSize: '12px',
                      }}
                      onClick={() => handleBindApi()}
                    >
                      {t('botApi.bindAppBtn')}
                    </Button>
                  </>
                )}
              </div>
              {searchParams.get('version') !== '1' && (
                <div style={{ marginTop: '4px' }}>
                  <a
                    className={styles.appid_download}
                    href="https://openres.xfyun.cn/xfyundoc/2025-03-25/1fa7e299-25ab-4128-92c9-a56928caea49/1742887223777/workflow_openapi_demo_python.py.zip"
                  >
                    {t('botApi.pythonDemoDownload')}
                  </a>
                  <a
                    className={styles.appid_download}
                    href="https://openres.xfyun.cn/xfyundoc/2025-03-25/ae1c647f-9d9e-4bdf-b50a-7f5e683aa6ad/1742887220264/workflow_openapi_demo_java.java.zip"
                  >
                    {t('botApi.javaDemoDownload')}
                  </a>
                </div>
              )}
            </div>
            <div className={styles.certified_card_tips}>
              <span style={{ color: '#DE9B7C' }}>*</span>
              {t('botApi.bindAppTips')}
            </div>
            <img
              src="https://aixfyun-cn-bj.xfyun.cn/bbs/16415.126278163174/%E8%99%9A%E7%BA%BF.svg"
              alt=""
              className={styles.cer_divide}
            />
            <div className={`${styles.cer_info}`}>
              <span className={styles.info_label}>
                {t('botApi.serviceUrl')}：
              </span>
              <span
                className={styles.info_res}
                title={apiInfo?.serviceUrl ? apiInfo?.serviceUrl : null}
              >
                {apiInfo?.serviceUrl
                  ? apiInfo?.serviceUrl
                  : t('botApi.bindAppTips2')}
              </span>
            </div>
            <div className={`${styles.cer_info}`}>
              <span className={styles.info_label}>API Secret:</span>
              <span className={styles.info_res}>
                {apiInfo?.appSecret || t('botApi.bindAppTips2')}
              </span>
            </div>
            <div className={`${styles.cer_info}`}>
              <span className={styles.info_label}>API Key：</span>
              <span className={styles.info_res}>
                {apiInfo?.appKey || t('botApi.bindAppTips2')}
              </span>
            </div>
            {searchParams.get('version') !== '1' && (
              <div className={`${styles.cer_info}`}>
                <span className={styles.info_label}>API Flowid</span>
                <span className={styles.info_res}>
                  {apiInfo?.flowId || t('botApi.bindAppTips2')}
                </span>
              </div>
            )}
          </div>
          {/* <div className={styles.right}>
            <div className={styles.statistic_card}>
              <div className={styles.statistic_data}>
                <img
                  src="https://aixfyun-cn-bj.xfyun.cn/bbs/21995.93819230774/1.png"
                  alt=""
                  className={styles.data_img}
                />
                <div className={styles.data_used_num}>
                  {apiInfo ? apiUsage?.usedCount : '_ _'}
                </div>
                <div className={styles.data_title}>
                  {t('botApi.todayUsedTokenNum')}
                </div>
              </div>
              <div className={styles.statistic_divide} />
              <div className={styles.statistic_data}>
                <img
                  src="https://aixfyun-cn-bj.xfyun.cn/bbs/48258.37497568033/2.png"
                  alt=""
                  className={styles.data_img}
                />
                <div className={styles.data_used_num}>
                  {apiInfo ? apiUsage?.left : '_ _'}
                </div>
                <div className={styles.data_title}>
                  {t('botApi.remainTokenNum')}
                </div>
              </div>
              <div className={styles.statistic_divide} />
              <div className={styles.statistic_data}>
                <img
                  src="https://aixfyun-cn-bj.xfyun.cn/bbs/48258.37497568033/2.png"
                  alt=""
                  className={styles.data_img}
                />
                <div className={styles.data_used_num}>
                  {apiInfo ? apiUsage?.conc : '_ _'}
                </div>
                <div className={styles.data_title}>QPS</div>
              </div>
            </div>
            <div className={styles.statistic_tips}>
              <div className={styles.statistic_tips_title}>
                {t('botApi.warmTips')}
              </div>
              <ul className={styles.statistic_tips_lists}>
                <li>{t('botApi.apiKeyWarn')}</li>
              </ul>
            </div>
          </div> */}
        </div>
      </section>
      <Modal
        open={isShowCreateAppModal}
        onCancel={() => setIsShowCreateAppModal(false)}
        title={t('botApi.createApp')}
        width={500}
        centered
        // closable={false}
        maskClosable={false}
        destroyOnClose
        footer={[
          <Button onClick={() => setIsShowCreateAppModal(false)}>
            {t('btnCancel')}
          </Button>,
          <Button
            type="primary"
            loading={loading}
            onClick={() => {
              handleSubmitCreateApp();
            }}
          >
            {t('btnOk')}
          </Button>,
        ]}
      >
        <div className={styles.createAppModal}>
          <Form
            form={createAppForm}
            name="promptForm"
            initialValues={{ remember: true }}
            autoComplete="off"
          >
            <Form.Item
              label={t('botApi.createAppName')}
              name="appName"
              rules={[
                { required: true, message: t('botApi.createAppNameRequired') },
              ]}
              colon={false}
              labelCol={{ span: 24 }}
              wrapperCol={{ span: 24 }}
            >
              <Input placeholder={t('botApi.createAppNamePlaceholder')} />
            </Form.Item>
            <Form.Item
              label={t('botApi.createAppDesc')}
              name="appDescribe"
              rules={[
                { required: true, message: t('botApi.createAppDescRequired') },
              ]}
              labelCol={{ span: 24 }}
              wrapperCol={{ span: 24 }}
            >
              <Input.TextArea
                placeholder={t('botApi.createAppDescPlaceholder')}
                rows={4}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </section>
  );
}
