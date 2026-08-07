import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Table, message, Popover, Modal, Select } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  getAgentList,
  type GetAgentListParams,
  type GetAgentListResponse,
  type BotData,
} from '@/services/agent';
import {
  getAgentDetail,
  handleAgentStatus,
  getPreparationData,
} from '@/services/release-management';
import {
  getBotInfo,
  cancelBindWx,
  // getChainInfo,
} from '@/services/spark-common';
import { isCanPublish } from '@/services/flow';
import WxModal from '@/components/wx-modal';
import { useBotStateStore } from '@/store/spark-store/bot-state';
import RetractableInput from '@/components/ui/global/retract-table-input';

import useToggle from '@/hooks/use-toggle';
import { debounce } from 'lodash';

import weixinghaoImg from '@/assets/imgs/release/weixin-release.svg';
import apiImg from '@/assets/imgs/release/api-release.svg';
import agentHubIcon from '@/assets/imgs/workflow/agent-hub-icon.svg';
import mcpImg from '@/assets/imgs/release/mcp-release.svg';
import closeIcon from '@/assets/imgs/bot-center/new-close-icon.svg';
import formSelect from '@/assets/imgs/main/icon_nav_dropdown.svg';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';
import useScreenWidth from '@/hooks/use-screen-width';
interface AgentListProps {
  AgentType?: 'agent' | 'workflow' | 'virtual' | 'all';
}

dayjs.extend(utc);

const PUBLISHED_STATUSES = [1, 2, 4];

const isPublishedBot = (botStatus?: number): boolean =>
  botStatus !== undefined && PUBLISHED_STATUSES.includes(botStatus);

const hasMarketRelease = (releaseType?: number[] | number): boolean => {
  if (typeof releaseType === 'number') {
    return releaseType === 1;
  }
  return Array.isArray(releaseType) && releaseType.includes(1);
};

const canTakeDownMarket = (bot: {
  botStatus?: number;
  releaseType?: number[] | number;
  canOffline?: boolean;
}): boolean =>
  isPublishedBot(bot.botStatus) &&
  hasMarketRelease(bot.releaseType) &&
  bot.canOffline === true;

const formatUtcListTime = (value?: string): string => {
  if (!value) return '-';
  return dayjs
    .utc(value.replace(' ', 'T'))
    .utcOffset(8)
    .format('YYYY-MM-DD HH:mm');
};

const AgentList: React.FC<AgentListProps> = ({ AgentType }) => {
  const screenWidth = useScreenWidth();
  const botInfo = useBotStateStore(state => state.botDetailInfo);
  const setBotDetailInfo = useBotStateStore(state => state.setBotDetailInfo);
  const [botMultiFileParam, setBotMultiFileParam] = useState<boolean>(false);
  const [moreParams, setMoreParams] = useState(false);
  const [editV2Visible, { setLeft: hide, setRight: show }] = useToggle();
  const [searchParams] = useSearchParams();
  const [setIsOpenapi] = useState<boolean>(false);
  const [fabuFlag, setFabuFlag] = useState<boolean>(false);
  const [openWxmol, setOpenWxmol] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [botList, setBotList] = useState<(BotData & { action: BotData })[]>([]);
  const { t } = useTranslation();
  const [total, setTotal] = useState<number>();
  const reasonRef = useRef<string | undefined>(undefined);
  const [pageInfo, setPageInfo] = useState<{
    pageIndex: number;
    pageSize: number;
    botStatus: number;
  }>({
    pageIndex: 1,
    pageSize: 10,
    botStatus: 0,
  });
  type MsgType = {
    version: string | number;
    searchValue: string;
  };
  const [msg, setMsg] = useState<MsgType>({
    version:
      AgentType === 'all'
        ? ''
        : AgentType === 'agent'
          ? '1'
          : AgentType === 'workflow'
            ? '3'
            : AgentType === 'virtual'
              ? '4'
              : '3',
    searchValue: '',
  });
  // tab状态赋值
  useEffect(() => {
    const selectedTab = localStorage.getItem('selectedTab');
    if (selectedTab) {
      setPageInfo(prev => ({
        ...prev,
        botStatus: parseInt(selectedTab, 10),
      }));
      localStorage.removeItem('selectedTab');
    }
  }, []);

  useEffect(() => {
    setMsg(prev => ({
      ...prev,
      version:
        AgentType === 'all'
          ? ''
          : AgentType === 'agent'
            ? '1'
            : AgentType === 'workflow'
              ? '3'
              : AgentType === 'virtual'
                ? '4'
                : '3',
    }));

    setPageInfo(prev => ({
      ...prev,
      pageIndex: 1,
    }));
  }, [AgentType]);

  const cancelUploadBot = (
    botId?: number,
    releaseType?: number[] | number
  ): void => {
    Modal.confirm({
      wrapClassName: 'bot-center-confirm-modal set_bot-center-confirm-modal',
      title: (
        <div className={styles.confirmModalTitle}>
          <ExclamationCircleOutlined className={styles.confirmModalTitleIcon} />
          <span>{t('releaseManagement.applyTakeDownAgent')}</span>
        </div>
      ),
      closable: true,
      maskClosable: true,
      closeIcon: (
        <img src={closeIcon} alt="close" className={styles.closeIcon} />
      ),
      okType: 'primary',
      width: '461px',
      content: (
        <div className={styles.cancelUploadModal}>
          <div className={styles.cancelTip}>
            <ExclamationCircleOutlined
              style={{ marginRight: '5px', color: '#f2aa58' }}
            />
            {t('releaseManagement.takeDownWarning')}
          </div>
        </div>
      ),
      okText: t('releaseManagement.submitApplication'),
      cancelText: t('releaseModal.cancel'),
      onCancel: () => {
        reasonRef.current = undefined;
      },
      onOk: () => {
        if (hasMarketRelease(releaseType) && botId) {
          return handleAgentStatus(botId, {
            action: 'OFFLINE',
            publishType: 'MARKET',
            publishData: { reason: t('releaseManagement.maintenanceUpdate') },
          })
            .then(() => {
              reasonRef.current = undefined;
              message.success(t('releaseManagement.submitApplicationSuccess'));
              setPageInfo(pre => ({ ...pre, pageIndex: 1 }));
              updateBotList({ ...pageInfo, pageIndex: 1 });
            })
            .catch(err => {
              err?.msg && message.error(err.msg);
              return Promise.reject(err);
            });
        } else {
          if (botInfo?.botId) {
            return cancelBindWx({
              appid: botInfo?.wechatAppid,
              botId: botInfo.botId,
            })
              .then(res => {
                getBotInfo({ botId: botInfo.botId }).then(res => {
                  setBotDetailInfo(res.data);
                  message.success(t('releaseManagement.unbindSuccess'));
                });
              })
              .catch(error => {
                message.error(error.msg);
                return Promise.reject(error);
              });
          }
          return Promise.resolve();
        }
      },
    });
  };

  //记录状态
  const localBotTab = (): void => {
    // 如果当前是发布中状态(1)，则存储为已发布状态(2) -09.01改动
    const statusToSave = pageInfo.botStatus === 1 ? 2 : pageInfo.botStatus;
    localStorage.setItem('selectedTab', statusToSave.toString());
  };

  /** ## 前往详情页 */
  const handleRowClick = (record: { botId?: string }): void => {
    navigate(`/management/release/detail/${record?.botId}`, {
      state: { record },
    });
    localBotTab();
  };

  /** ## 查看智能体 */
  const checkAgent = (bot: {
    botId?: string;
    maasId?: string | number;
  }): void => {
    if (AgentType === 'agent') {
      navigate(`/space/config/overview?botId=${bot.botId}&flag=true`);
    } else {
      navigate(`/work_flow/${bot?.maasId}/overview`);
    }
    localBotTab();
  };

  /** ## 编辑智能体 */
  const updateAgent = (bot: {
    botId?: string;
    maasId?: string | number;
  }): void => {
    if (AgentType === 'agent') {
      navigate(`/space/config/base?botId=${bot?.botId}`);
      // 记录选择状态
    } else {
      navigate(`/work_flow/${bot?.maasId}/arrange`);
    }
    localBotTab();
  };

  /** ## 显示调试未通过提示 */
  const showDebugNotPassedWarning = (bot: any) => {
    const warningMessage = message.error({
      content: (
        <span>
          {t('releaseManagement.debugNotPassed')}
          <span
            style={{
              color: '#1890ff',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
            onClick={() => {
              // 关闭 Message
              warningMessage();
              // 跳转到调试页面
              updateAgent(bot);
            }}
          >
            {t('releaseManagement.goToDebug')}
          </span>
        </span>
      ),
      duration: 2.5,
    });
  };

  // 创建统一的动态columns
  const unifiedColumns = useMemo(() => {
    const cols: {
      dataIndex: string;
      title: string;
      width?: number;
      ellipsis?: boolean;
      render?: (value: any, record: any, index?: number) => React.ReactNode;
      sorter?: boolean | ((a: unknown, b: unknown) => number);
      sortOrder?: 'ascend' | 'descend' | null;
      fixed?: 'left' | 'right';
      align?: 'left' | 'center' | 'right';
    }[] = [
      {
        dataIndex: 'botId',
        title: t('releaseManagement.agentId'),
        align: 'left',
        width: 120,
        render: (text: string) => {
          return <div style={{ marginLeft: '8px' }}>{text}</div>;
        },
      },
      {
        dataIndex: 'botName',
        title: t('releaseManagement.agentName'),
        align: 'left',
        render: (text: string) => (
          <div
            title={text}
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '200px',
            }}
          >
            {text}
          </div>
        ),
      },
      {
        dataIndex: 'botDesc',
        title: t('releaseManagement.functionDesc'),
        align: 'left',
        ellipsis: true,
      },
      {
        dataIndex: 'releaseType',
        title: t('releaseManagement.platform'),
        align: 'center',
        render: (data: number | number[]): React.ReactNode => {
          if (typeof data === 'number') {
            data = [data];
          }
          return (
            <div
              style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}
            >
              {data?.length > 0 ? (
                data.map(item => {
                  if (item == 1) {
                    return (
                      <img
                        style={{ width: '20px', height: '20px' }}
                        src={agentHubIcon}
                        alt="Agent Hub"
                      />
                    );
                  } else if (item == 2) {
                    return (
                      <img
                        style={{ width: '20px', height: '20px' }}
                        src={apiImg}
                        alt="API"
                      />
                    );
                  } else if (item == 3) {
                    return (
                      <img
                        style={{ width: '20px', height: '20px' }}
                        src={weixinghaoImg}
                        alt="WeChat"
                      />
                    );
                  } else if (item == 4) {
                    return (
                      <img
                        style={{ width: '20px', height: '20px' }}
                        src={mcpImg}
                        alt="MCP Server"
                      />
                    );
                  }
                  return null;
                })
              ) : (
                <span>-</span>
              )}
            </div>
          );
        },
      },
    ];

    // 动态添加时间列或未通过原因列
    if (pageInfo.botStatus === 3) {
      // 审核未通过状态显示未通过原因
      cols.push({
        dataIndex: 'blockReason',
        title: t('releaseManagement.rejectionReason'),
        align: 'center',
        ellipsis: true,
        render: (reason: string) => (
          <Popover content={reason}>
            <span className={styles.reason}>{reason}</span>
          </Popover>
        ),
      });
    } else {
      // 其他状态显示时间列
      cols.push({
        dataIndex: pageInfo.botStatus === 2 ? 'applyTime' : 'createTime',
        title:
          pageInfo.botStatus === 2
            ? t('releaseManagement.releaseTime')
            : pageInfo.botStatus === 0
              ? t('releaseManagement.createTime')
              : t('releaseManagement.applyTime'),
        align: 'center',
        render: (time: string) => (
          <span className={styles.timeColor}>{formatUtcListTime(time)}</span>
        ),
      });
    }

    // 添加操作列
    cols.push({
      dataIndex: 'action',
      title: t('releaseManagement.operation'),
      align: 'left',
      fixed: screenWidth > 1440 ? undefined : 'right',
      width: 200,
      render: (bot: {
        version: number;
        maasId: number;
        botId: string | undefined;
        botName: string;
        botDesc: string;
        botStatus?: number;
        releaseType?: number[];
      }) => (
        <span className={styles.historyAct}>
          {/* 发布按钮 - 未发布状态显示 */}
          {(pageInfo.botStatus === 0 || pageInfo.botStatus === -9) && (
            <span
              onClick={() => {
                /* moreParams -- 能否发布为微信
                botMultiFileParam -- 能否发布到星火
                */
                if (bot.version === 3) {
                  // console.log(bot, 'bot---------');

                  isCanPublish(bot?.maasId)
                    .then(flag => {
                      if (flag) {
                        getPreparationData(bot.botId as unknown as number)
                          .then((res: any) => {
                            setBotMultiFileParam(res?.data?.botMultiFileParam);
                            getBotBaseInfo(bot?.botId);
                            setFabuFlag(true);
                            setOpenWxmol(true);
                          })
                          .catch(err => {
                            message.error(err?.msg);
                          });

                        /* NOTE: Publishing as mcp is currently not supported - 2025.10
                      original logic -- getAgentInputParams & getChainInfo
                      new api -- getPreparationData
                    */
                        getPreparationData(
                          bot.botId as unknown as number,
                          'MCP'
                        ).then((res: any) => {
                          if (
                            res.length > 1 &&
                            res
                              .slice(1)
                              .some(
                                (item: { fileType: string }) =>
                                  item.fileType !== 'file'
                              )
                          ) {
                            setMoreParams(true);
                          } else {
                            setMoreParams(false);
                          }
                        });
                      } else {
                        showDebugNotPassedWarning(bot);
                      }
                    })
                    .catch(err => {
                      return (
                        err?.msg &&
                        message.error(
                          err.msg ||
                            t('releaseManagement.checkPublishStatusFailed')
                        )
                      );
                    });
                } else {
                  getBotBaseInfo(bot?.botId);
                  setFabuFlag(true);
                  setOpenWxmol(true);
                }
              }}
            >
              {t('releaseManagement.release')}
            </span>
          )}

          {/* 编辑按钮 - 所有状态都显示 */}
          <span onClick={() => updateAgent(bot)}>
            {t('releaseManagement.edit')}
          </span>

          {/* 详情按钮 - 工作流类型显示 -- 改为分析 */}
          {AgentType === 'workflow' && (
            <span onClick={() => handleRowClick(bot)}>
              {t('releaseManagement.detail')}
            </span>
          )}

          {/* 查看按钮 - 已发布状态显示 -- 都改为分析 */}
          {isPublishedBot(bot.botStatus) && (
            <span onClick={() => checkAgent(bot)}>
              {t('releaseManagement.analyze')}
            </span>
          )}

          {/* 下架按钮 - 已发布状态显示 */}
          {canTakeDownMarket(bot) && (
            <span
              style={{ marginRight: '10px' }}
              onClick={() =>
                cancelUploadBot(
                  bot?.botId as unknown as number,
                  bot?.releaseType as unknown as number[]
                )
              }
            >
              {t('releaseManagement.takeDown')}
            </span>
          )}

          {/* 删除按钮 - 审核未通过状态显示  -- NOTE: 不需要显示，如果需要使用，则添加AgentPage中的删除逻辑*/}
          {/* {bot.botStatus === 3 && (
            <span>
              {t('releaseManagement.delete')}
            </span>
          )} */}
        </span>
      ),
    });

    return cols;
  }, [pageInfo.botStatus, AgentType, t, styles]);

  const updateBotList = (info: {
    pageIndex: number;
    pageSize: number;
    botStatus?: number;
  }): void => {
    setLoading(true);
    const params: GetAgentListParams = {
      pageIndex: info.pageIndex,
      pageSize: info.pageSize,
      botStatus: null,
      sort: '',
      searchValue: msg.searchValue,
      version:
        typeof msg.version === 'string'
          ? parseInt(msg.version, 10)
          : msg.version,
    };

    if (
      info?.botStatus === -9 ||
      info?.botStatus === 1 ||
      info?.botStatus === 2 ||
      info?.botStatus === 3
    ) {
      // 已发布包含发布中状态-- 09.01改动
      params.botStatus = info?.botStatus === 2 ? [1, 2, 4] : [info?.botStatus];
    }

    getAgentList(params)
      .then((data: GetAgentListResponse) => {
        const dataNow = data?.pageData?.map(itm => ({
          ...itm,
          action: itm,
        }));
        // console.log(
        //   '🚀 ~ updateBotList ~ dataNow:',
        //   dataNow,
        //   'data-------',
        //   data
        // );
        setBotList(dataNow ?? []);
        setTotal(data?.totalCount ?? 0);
      })
      .catch(err => {
        err?.msg && message.error(err.msg);
      })
      .finally(() => {
        setLoading(false);
      });
    localStorage.removeItem('selectedTab');
  };

  useEffect(() => {
    if (msg.version === '1') {
      setBotMultiFileParam(false);
      setMoreParams(false);
    }
    updateBotList(pageInfo);
  }, [
    pageInfo.pageIndex,
    pageInfo.pageSize,
    pageInfo.botStatus,
    msg.version,
    msg.searchValue,
  ]);

  // 获取助手基本信息
  const getBotBaseInfo = (newBotId?: string | number): void => {
    const botId = newBotId || searchParams.get('botId');
    getAgentDetail(botId as unknown as number)
      .then(data => {
        setBotDetailInfo({
          ...(data as BotData),
          name: (data as BotData)?.botName,
        });
      })
      .catch(err => {
        return err?.msg && message.error(err.msg);
      });
  };

  const onChangeTypeSelect = (e: number | null): void => {
    setPageInfo(pre => ({
      ...pre,
      botStatus: e === null ? 0 : e,
      pageIndex: e !== pageInfo?.botStatus ? 1 : pageInfo.pageIndex,
    }));
  };

  const [searchInput, setSearchInput] = useState(''); // 搜索框绑定值

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setMsg(pre => ({
          ...pre,
          searchValue: value,
        }));
      }, 500),
    []
  );

  const getRobotsDebounce = (e: { target: { value: string } }): void => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  useEffect(() => {
    return (): void => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return (
    <div className={styles.apply}>
      <div className={styles.applyTop}>
        <div className={styles.content}>
          <div className={styles.boxSeach}>
            <span></span>
            <div className={styles.seach}>
              <div className={styles.seachInput}>
                <Select
                  suffixIcon={<img src={formSelect} className="w-4 h-4 " />}
                  showSearch
                  placeholder={t('releaseManagement.select')}
                  optionFilterProp="label"
                  style={{
                    width: 160,
                    border: '1px solid #E7E7F0',
                    borderRadius: 10,
                  }}
                  className={styles.ant_input}
                  notFoundContent={null}
                  onChange={onChangeTypeSelect}
                  filterOption={false}
                  defaultValue={0}
                  value={pageInfo?.botStatus}
                  // NOTE: 将发布中并入已发布状态 -- 09.01
                  options={[
                    { label: t('releaseManagement.all'), value: 0 },
                    { label: t('releaseManagement.unreleased'), value: -9 },
                    // { label: t('releaseManagement.releasing'), value: 1 },
                    { label: t('releaseManagement.released'), value: 2 },
                    // { label: t('releaseManagement.auditFailed'), value: 3 },
                  ]}
                />
              </div>
              <RetractableInput
                value={searchInput}
                restrictFirstChar={true}
                onChange={getRobotsDebounce}
              />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.tableArea}>
        <WxModal
          botMultiFileParam={botMultiFileParam}
          moreParams={moreParams}
          showInfoModel={show}
          setPageInfo={setPageInfo}
          disjump={true}
          setIsOpenapi={setIsOpenapi}
          fabuFlag={fabuFlag}
          show={openWxmol}
          onCancel={() => {
            setOpenWxmol(false);
          }}
          agentType={botInfo?.version === 3 ? 'workflow' : 'agent'}
          isVirtual={AgentType === 'virtual' || botInfo?.version === 4}
          agentMaasId={
            AgentType === 'workflow' || botInfo?.version === 3
              ? (botInfo?.maasId as string)
              : null
          }
        />
        <Table
          className={botList?.length === 0 ? styles.noData : ''}
          loading={loading}
          dataSource={botList}
          columns={unifiedColumns}
          rowKey={(record: BotData & { action: BotData }): number =>
            record.botId
          }
          pagination={{
            position: ['bottomCenter'],
            total: total,
            showTotal: total =>
              `${t('releaseManagement.total')} ${total} ${t(
                'releaseManagement.totalData'
              )}`,
            showSizeChanger: true,
            current: pageInfo.pageIndex,
            pageSize: pageInfo.pageSize,
            // pageSizeOptions: [10, 20, 50],
            onChange: (pageIndex, pageSize): void => {
              setPageInfo(pre => ({
                ...pre,
                pageIndex: pageSize !== pre?.pageSize ? 1 : pageIndex,
                pageSize,
              }));
            },
          }}
          scroll={{
            scrollToFirstRowOnChange: true,
            y: 'max(200px ,calc(100vh - 350px))',
            x: screenWidth > 1440 ? undefined : 1000,
          }}
        />
      </div>
    </div>
  );
};

export default AgentList;
