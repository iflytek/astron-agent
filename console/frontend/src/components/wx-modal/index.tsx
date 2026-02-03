import { Input, Modal, Spin, message, Form, Row, Col, Select } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  handleAgentStatus,
  // getPreparationData,
  // getAgentPublishStatus,
  // type AgentInputParam,
} from '@/services/release-management';
// import {
//   getBotInfo,
//   // getWechatAuthUrl,
//   publishMCP,
//   // getMcpContent,
//   // getChainInfo,
// } from '@/services/spark-common';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import eventBus from '@/utils/event-bus';
import { useBotStateStore } from '@/store/spark-store/bot-state';

// import wxImg from '@/assets/imgs/workflow/wechat-icon.png';
// import mcpImg from '@/assets/imgs/workflow/mcp-icon.png';
import apiImg from '@/assets/imgs/workflow/iflytekCloud-icon.png';
import agentHubIcon from '@/assets/imgs/workflow/agent-hub-icon.svg';

import styles from './index.module.scss';
import cls from 'classnames';

interface MultiModeCpnProps {
  promptbot?: any;
  botMultiFileParam?: any;
  setQufabuFlag?: any;
  showInfoModel?: any;
  show: boolean;
  onCancel?: any;
  updateData?: any;
  fabuFlag?: any;
  setIsOpenapi?: any;
  setCurrentNew?: any;
  currentNew?: any;
  disjump?: any;
  setPageInfo?: any;
  agentType?: any;
  moreParams?: any;
  workflowId?: number;
  agentMaasId?: string | null;
  isVirtual?: boolean;
}

const WxModal: React.FC<MultiModeCpnProps> = ({
  promptbot,
  botMultiFileParam,
  setQufabuFlag,
  showInfoModel,
  show,
  onCancel, //关闭弹窗
  updateData,
  fabuFlag,
  setIsOpenapi,
  setCurrentNew,
  currentNew,
  disjump,
  setPageInfo,
  agentType,
  moreParams,
  workflowId,
  agentMaasId,
  isVirtual,
}) => {
  // const i = 0;
  // const flag = false;
  // const [form] = Form.useForm();
  const botInfo = useBotStateStore(state => state.botDetailInfo);
  // const setBotDetailInfo = useBotStateStore(state => state.setBotDetailInfo);
  // const [editData, setEditData] = useState<any>({});
  // const [args, setArgs] = useState<any>({});
  // const [isMcpOpen, setIsMcpOpen] = useState(false);
  // const waringRef = useRef<HTMLDivElement>(null);
  // const [spinning, setSpinning] = useState(false);
  const [unBindStatus, setUnBindStatus] = useState(false);
  const [fabuActive, setFabuActive] = useState(false);
  // const [wxfabuActive, setWxfabuActive] = useState(false);
  const [apifabuActive, setApifabuActive] = useState(false);
  // const [mcpfabuActive, setMcpfabuActive] = useState(false);
  // const [appid, setAppid] = useState('');
  const navigate = useNavigate();
  // const [released, setReleased] = useState(false);
  const [isClickFabu, setIsClickFabu] = useState(false);
  // const [isClickMcp, setIsClickMcp] = useState(false);
  const { t } = useTranslation();

  /**
   * 校验
   */
  // const validate = async (): Promise<boolean> => {
  //   try {
  //     const values = await form.validateFields();
  //     return values;
  //   } catch (err) {
  //     message.warning(t('releaseModal.mcpServerParamsDescEmpty'));
  //     return false;
  //   }
  // };

  /** 绑定微信 */
  // const handleBind = (): void => {
  //   if (!appid.length) {
  //     message.warning(t('releaseModal.appidEmpty'));
  //     return;
  //   }
  //   if (!botInfo) {
  //     return;
  //   }

  //   // NOTE: 新的应该是微信信息 -- 绑定到微信
  //   // getAgentPublishStatus(botInfo.botId as number).then(res => {
  //   //   console.log('123-------', res);
  //   // });

  //   const redirectUrl =
  //     'https://' + window.location.host + `/work_flow/${agentMaasId}/overview`;
  //   const params = {
  //     publishType: 'WECHAT' as const,
  //     action: 'PUBLISH' as const,
  //     publishData: { appId: appid, redirectUrl },
  //   };
  //   setSpinning(true);

  //   handleAgentStatus(botInfo.botId as number, params)
  //     .then((res: any) => {
  //       // const url = res.data;
  //       // if (url.includes('https://')) window.open(url, '_blank');
  //       // else window.open('https://' + url, '_blank');
  //       // onCancel();
  //     })
  //     .catch(error => {
  //       message.error(error.msg);
  //     })
  //     .finally(() => setSpinning(false));
  // };

  // 解绑微信
  // const handleEndBind = (): void => {
  //   setSpinning(true);
  //   if (!botInfo) {
  //     setSpinning(false);
  //     return;
  //   }
  //   const params = {
  //     publishType: 'WECHAT' as const,
  //     action: 'OFFLINE' as const,
  //     publishData: { appId: botInfo.wechatAppid as string },
  //   };

  //   handleAgentStatus(botInfo.botId as number, params)
  //     .then(res => {
  //       getBotInfo({ botId: botInfo.botId }).then((res: any) => {
  //         setUnBindStatus(false);
  //         setBotDetailInfo(res);
  //         message.success(t('releaseModal.unBindSuccess'));
  //       });
  //     })
  //     .catch(error => {
  //       message.error(error.msg);
  //     })
  //     .finally(() => setSpinning(false));
  // };

  // const handleMcpOk = async (): Promise<void> => {
  //   const values = await validate();
  //   if (!values) {
  //     return;
  //   }
  //   const obj = form.getFieldsValue();
  //   const parmas: {
  //     serverName: string;
  //     description: string;
  //     botId?: string;
  //     content?: string;
  //     icon?: string;
  //     args?: AgentInputParam[];
  //   } = {
  //     serverName: obj.botName as string,
  //     description: obj.botDesc as string,
  //   };
  //   parmas.botId = botInfo?.botId as string;
  //   parmas.content = obj.content as string;
  //   parmas.icon = botInfo?.avatar as string;
  //   if (flag) {
  //     args[i].schema.default = obj.default;
  //   } else {
  //     args[0].schema.default = obj.default;
  //   }

  //   parmas.args = args;
  //   publishMCP(parmas)
  //     .then(res => {
  //       setIsClickMcp(true);
  //       message.success(t('releaseModal.mcpReleaseSuccess'));
  //       if (setPageInfo) {
  //         setPageInfo((pre: any) => ({ ...pre, pageIndex: 1 }));
  //       }
  //       setIsMcpOpen(false);
  //       setIsOpenapi(true);
  //       setCurrentNew('mcp');
  //     })
  //     .catch(e => {
  //       message.error(
  //         e.msg || e.detail.message || t('releaseModal.mcpReleaseFail')
  //       );
  //     });
  // };

  // const handleMcpCancel = (): void => {
  //   setIsMcpOpen(false);
  // };

  //发布 or 更新发布 -- 至星火
  const handlePublish = async (): Promise<void> => {
    if (promptbot) {
      eventBus.emit('releaseFn');
      return;
    }
    if (botMultiFileParam) {
      return;
    }

    if (setQufabuFlag) {
      setQufabuFlag(true);
    }

    // 提交审核
    handleAgentStatus((botInfo?.botId as number) || (workflowId as number), {
      action: 'PUBLISH' as const,
      publishType: 'MARKET' as const,
      publishData: {},
    })
      .then(() => {
        // onCancel();
        setIsClickFabu(true);
        message.success(t('releaseModal.submitAuditSuccess'));
        onCancel();
        if (setPageInfo) {
          setPageInfo((pre: any) => ({
            ...pre,
            pageIndex: 1,
          }));
        }
      })
      .catch(err => {
        err?.message && message.error(err.message);
      });

    return;
  };

  /** ## 发布为mcp 逻辑 -- NOTE: Publishing as mcp is currently not supported - 2025.10 */
  // const handleMcpPublish = async (): Promise<void> => {
  //   if (moreParams) {
  //     return;
  //   }

  //   getMCPServiceDetail(botInfo?.botId as number).then((resp: any) => {
  //     setReleased(resp?.released);

  //     getAgentInputParams(botInfo?.botId as number).then(
  //       (res: AgentInputParam[]) => {
  //         const arr: AgentInputParam[] = [...res];
  //         arr.forEach((item: AgentInputParam, index: number) => {
  //           if (Object.prototype.hasOwnProperty.call(item, 'allowedFileType')) {
  //             i = index;
  //             return (flag = true);
  //           }
  //           return;
  //         });
  //         if (flag) {
  //           setArgs(arr);
  //           setEditData({
  //             botName: resp ? resp.serverName : botInfo?.botName,
  //             botDesc: resp ? resp.description : botInfo?.botDesc,
  //             name: arr?.[i]?.name ?? '',
  //             type: arr?.[i]?.allowedFileType?.[0] ?? '',
  //             default: arr?.[i]?.schema?.default ?? '',
  //             content: resp?.content,
  //           });
  //         } else {
  //           setArgs(arr);
  //           setEditData({
  //             botName: resp ? resp.serverName : botInfo?.botName,
  //             botDesc: resp ? resp.description : botInfo?.botDesc,
  //             name: arr?.[0]?.name ?? '',
  //             type: arr?.[0]?.allowedFileType?.[0] ?? '',
  //             default: arr?.[0]?.schema?.default ?? '',
  //             content: resp?.content,
  //           });
  //         }
  //         setIsMcpOpen(true);
  //         // onCancel();
  //       }
  //     );
  //   });
  // };

  useEffect(() => {
    setIsClickFabu(false);
  }, [show]);

  // useEffect(() => {
  //   form.setFieldsValue(editData);
  // }, [editData]);

  // useEffect(() => {
  //   setAppid('');
  // }, [show]);

  return (
    <>
      <Modal
        centered
        open={show}
        onCancel={onCancel}
        footer={null}
        width={700}
        wrapClassName="wx-modal"
      >
        <Spin spinning={false}>
          {unBindStatus ? (
            <>
              <div className={styles.header}>{t('releaseModal.unBindTip')}</div>
              <div className={styles.tip}>
                <div>{t('releaseModal.unBindTipDesc')}</div>
                <div>
                  {t('releaseModal.unBindTipDesc2')}
                  <a
                    className={styles.wx_link}
                    href="https://mp.weixin.qq.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('releaseModal.unBindTipDesc3')}
                  </a>
                  {t('releaseModal.unBindTipDesc4')}
                </div>
              </div>
              <div className={styles.bottom_btn}>
                <div
                  className={styles.cancel}
                  onClick={() => setUnBindStatus(false)}
                >
                  {t('releaseModal.cancel')}
                </div>
                {/* <div className={styles.confirm} onClick={handleEndBind}> */}
                <div>{t('releaseModal.ok')}</div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.header}>
                <div>{t('releaseModal.applyRelease')}</div>
                {moreParams && (
                  <div className={styles.headertip}>
                    <ExclamationCircleOutlined
                      className={styles.ExclamationCircleOutlined}
                    />
                    {t('releaseModal.multiParamsTip')}
                  </div>
                )}
              </div>
              <div className={styles.pingtai}>
                <span className={styles.xinghao}>*</span>
                {t('releaseModal.releasePlatform')}
              </div>
              <div className={styles.tip}>
                {t('releaseModal.releasePlatformTip')}
              </div>
              <div>
                <div
                  className={cls(styles.spark_fabu, {
                    [styles.spark_fabuactive as string]: fabuActive,
                  })}
                  onClick={() => {
                    // setWxfabuActive(false);
                    setApifabuActive(false);
                    setFabuActive(true);
                  }}
                >
                  <div className={styles.text_title}>
                    <img
                      className={styles.xinghuoImg}
                      src={agentHubIcon}
                      alt=""
                    />
                    <div>
                      <div
                        className={cls(styles.text_sparktop, {
                          [styles.text_sparktopactive as string]: fabuActive,
                        })}
                      >
                        {t('releaseModal.agentHub')}
                      </div>
                      <div className={styles.text_sparkbottom}>
                        {t('releaseModal.agentHubTip')}
                      </div>
                    </div>
                  </div>
                  <div
                    className={cls(styles.queren, {
                      [styles.disableButton as string]: botMultiFileParam,
                    })}
                    onClick={handlePublish}
                  >
                    {(Array.isArray(botInfo?.releaseType) &&
                      botInfo.releaseType.includes(1)) ||
                    isClickFabu
                      ? t('releaseModal.updateRelease')
                      : t('releaseModal.release')}
                  </div>
                </div>

                {/* NOTE: hide binding wechat for now - 2025.10 */}
                {/* {(agentType === 'workflow' ||
                  window.location.pathname.includes('work_flow')) && (
                  <div
                    className={cls(styles.wx_fabu, {
                      [styles.wx_fabuactive as string]: wxfabuActive,
                    })}
                    onClick={() => {
                      setWxfabuActive(true);
                      setFabuActive(false);
                      setMcpfabuActive(false);
                      setApifabuActive(false);
                    }}
                    onKeyDown={e => {
                      if (e.ctrlKey && e.key === 'v') {
                        e.stopPropagation();
                      }
                    }}
                  >
                    <div>
                      <img className={styles.wxImg} src={wxImg} alt="" />
                    </div>
                    <div className={styles.wx_right}>
                      <div
                        className={cls(styles.wx_text, {
                          [styles.wx_textactive as string]: wxfabuActive,
                        })}
                      >
                        {t('releaseModal.releasePlatformWx')}
                      </div>
                      <div className={styles.tip}>
                        {t('releaseModal.releasePlatformWxTip')}
                      </div>
                      {Array.isArray(botInfo?.releaseType) &&
                      botInfo.releaseType.includes(3) ? (
                        <div className={styles.wx_flex}>
                          <div className={styles.id_header}>
                            {t('releaseModal.wxAppId')}：
                          </div>
                          <Input
                            placeholder={t('global.input')}
                            value={(botInfo.wechatAppid as string) || ''}
                            onKeyDown={e => {
                              e.stopPropagation();
                            }}
                            className={styles.id_input}
                            disabled
                          />
                          <div className={styles.edit_btn_wrap}>
                            <div
                              className={styles.cancel_bind}
                              onClick={() => setUnBindStatus(true)}
                            >
                              {t('releaseModal.unBind')}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={styles.wx_flex}>
                            <div className={styles.id_header}>
                              {t('releaseModal.wxAppId')}
                              <span className={styles.wx_xinghao}>*</span>
                            </div>
                            <Input
                              className={styles.id_input}
                              placeholder={t('global.input')}
                              onChange={e => setAppid(e.target.value)}
                              onKeyDown={e => {
                                e.stopPropagation();
                              }}
                              value={appid}
                              style={{ fontWeight: 'lighter' }}
                            />
                            <div className={styles.warning} ref={waringRef}>
                              {t('releaseModal.wxAppIdTip')}
                            </div>
                            <div
                              className={cls(styles.next_btnV2, {
                                [styles.disableButton as string]: moreParams,
                              })}
                              onClick={() => {
                                if (moreParams) {
                                  return;
                                }
                                handleBind();
                              }}
                            >
                              {t('releaseModal.bindWx')}{' '}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )} */}
                {!isVirtual &&
                  (agentType === 'workflow' ||
                    window.location.pathname.includes('work_flow')) && (
                    <div
                      className={cls(styles.spark_fabu, {
                        [styles.spark_apifabuActive as string]: apifabuActive,
                      })}
                      onClick={() => {
                        if (botInfo) {
                          navigate(
                            `/management/bot-api?id=${botInfo.botId}&version=${botInfo.version}`
                          );
                        }
                        // setWxfabuActive(false);
                        setFabuActive(false);
                        // setMcpfabuActive(false);
                        setApifabuActive(true);
                      }}
                    >
                      <div className={styles.text_title}>
                        <img
                          className={styles.xinghuoImg}
                          src={apiImg}
                          alt=""
                        />
                        <div>
                          <div
                            className={cls(styles.text_sparktop, {
                              [styles.text_sparktopactive as string]:
                                apifabuActive,
                            })}
                          >
                            {t('releaseModal.releaseToApi')}
                          </div>
                          <div className={styles.text_sparkbottom}>
                            {t('releaseModal.apiConfigTip')}
                          </div>
                        </div>
                      </div>
                      <div
                        className={styles.peizhiApi}
                        onClick={() => {
                          setIsOpenapi(true);
                          if (currentNew == 'intro') {
                            setCurrentNew('api');
                          }
                          // onCancel();
                        }}
                      >
                        {Array.isArray(botInfo?.releaseType) &&
                        botInfo.releaseType.includes(2)
                          ? t('releaseModal.updateConfigure')
                          : t('releaseModal.configure')}
                      </div>
                    </div>
                  )}
                {/* NOTE: publishing as mcp is currently not supported - 2025.10 */}
                {/* {(agentType === 'workflow' ||
                    window.location.pathname.includes('work_flow')) && (
                    <div
                      className={cls(styles.mcp_fabu, {
                        [styles.mcp_abuActive as string]: mcpfabuActive,
                      })}
                      onClick={() => {
                        setWxfabuActive(false);
                        setFabuActive(false);
                        setApifabuActive(false);
                        setMcpfabuActive(true);
                      }}
                    >
                      <div className={styles.text_title}>
                        <img
                          className={styles.xinghuoImg}
                          src={mcpImg}
                          alt=""
                        />
                        <div>
                          <div
                            className={cls(styles.text_sparktop, {
                              [styles.text_sparktopactive as string]:
                                mcpfabuActive,
                            })}
                          >
                            {t('releaseModal.releaseToMcpServer')}
                          </div>
                          <div className={styles.text_sparkbottom}>
                            {t('releaseModal.mcpServerTip')}
                          </div>
                        </div>
                      </div>
                      <div
                        className={cls(styles.peizhiApi, {
                          [styles.disableButton as string]: moreParams,
                        })}
                        onClick={handleMcpPublish}
                      >
                        {(Array.isArray(botInfo?.releaseType) &&
                          botInfo.releaseType.includes(4)) ||
                        isClickMcp
                          ? t('releaseModal.updateConfigure')
                          : t('releaseModal.configure')}
                      </div>
                    </div>
                  )} */}
              </div>
            </>
          )}
        </Spin>
      </Modal>

      {/* <Modal
        okText={
          released ? t('releaseModal.updateRelease') : t('releaseModal.ok')
        }
        centered
        title="MCP Server"
        open={isMcpOpen}
        onOk={handleMcpOk}
        onCancel={handleMcpCancel}
        wrapClassName="mcp_modal"
      >
        <div className={styles.mcpTitle}>{t('releaseModal.mcpServerTip')}</div>
        <Form
          form={form}
          name="botEdit"
          initialValues={{ ...editData }}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.ctrlKey && e.key === 'v') {
              e.stopPropagation();
            }
          }}
        >
          <Row gutter={0}>
            <Col flex="auto">
              <Row gutter={0}>
                <Col span={6}>
                  <img
                    style={{ width: '90px', height: '90px' }}
                    src={mcpImg}
                    alt=""
                  />
                </Col>
                <Col span={18}>
                  <Form.Item
                    rules={[{ required: true, message: '' }]}
                    label={t('releaseModal.mcpServerName')}
                    name="botName"
                    colon={false}
                    labelCol={{ span: 24 }}
                    wrapperCol={{ span: 24 }}
                  >
                    <Input maxLength={20} onPaste={e => e.stopPropagation()} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                rules={[{ required: true, message: '' }]}
                label={t('releaseModal.mcpServerDesc')}
                name="botDesc"
                colon={false}
                labelCol={{ span: 24 }}
              >
                <Input.TextArea
                  showCount
                  maxLength={200}
                  className={styles.textField}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            rules={[{ required: true, message: '' }]}
            label={t('releaseModal.mcpServerContent')}
            name="content"
            colon={false}
            labelCol={{ span: 24 }}
          >
            <Input.TextArea
              showCount
              maxLength={200}
              className={styles.textField}
            />
          </Form.Item>
          <div>{t('releaseModal.mcpServerParams')}</div>
          <div className={styles.mcpdesc}>
            {t('releaseModal.mcpServerParamsTip')}
          </div>
          <Row gutter={10}>
            <Col span={8}>
              <Form.Item
                className="custom-label"
                label={t('releaseModal.mcpServerParamsName')}
                name="name"
                colon={false}
                labelCol={{ span: 24 }}
              >
                <Input disabled maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                className="custom-label"
                label={t('releaseModal.mcpServerParamsType')}
                name="type"
                colon={false}
                labelCol={{ span: 24 }}
              >
                <Select disabled options={[]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                className="custom-label"
                label={t('releaseModal.mcpServerParamsDesc')}
                name="default"
                colon={false}
                labelCol={{ span: 24 }}
              >
                <Input maxLength={20} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal> */}
    </>
  );
};

export default WxModal;
