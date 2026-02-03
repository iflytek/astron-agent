import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, message, Popover, Select, Tooltip } from 'antd';
import { throttle } from 'lodash';
import { enableBotFavorite } from '@/services/agent'; // NOTE: 需更换接口
import { useTranslation } from 'react-i18next';
import {
  getAgentList,
  copyBot,
  GetAgentListParams,
  GetAgentListResponse,
} from '@/services/agent';
import DeleteBot from './components/delete-bot';
import CreateApplicationModal from '@/components/create-application-modal';
import { debounce } from 'lodash';
import RetractableInput from '@/components/ui/global/retract-table-input';
import useChat from '@/hooks/use-chat';
import useUserStore from '@/store/user-store';
import { jumpToLogin, downloadFileWithHeaders } from '@/utils/http';
import { getFixedUrl } from '@/components/workflow/utils';

import iconNew from '@/assets/imgs/main/icon_bot_new.png';
import search from '@/assets/imgs/knowledge/icon_zhishi_search.png';
import favorite from '@/assets/imgs/main/favorite.png';
import unfavorite from '@/assets/imgs/main/icon_bot_tag@2x.png';
import formSelect from '@/assets/imgs/main/icon_nav_dropdown.svg';
import agentOperationMore from '@/assets/imgs/main/agent-operation-more.svg';
import chatIcon from '@/assets/imgs/main/chat-bot.svg';
import botNoIcon from '@/assets/imgs/main/bot-no.png';
import shareIcon from '@/assets/imgs/main/share-bot.svg';

import styles from './index.module.scss';
import useSpaceStore from '@/store/space-store';
import { getInputsType } from '@/services/flow';
import { handleShare } from '@/utils';
import { PlusOutlined } from '@ant-design/icons';

import VirtualConfig from '@/components/virtual-config-modal';
import { upgradeWorkflow } from '@/services/spark-common';

function index() {
  const [showbotNo, setShowbotNo] = useState(false);
  const typePublished = [1, 2, 4]; // 已发布状态
  const typeUnblished = [];
  const typeAudit = [];
  const typeFail = [];
  const user = useUserStore((state: any) => state.user);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const robotRef = useRef<HTMLDivElement | null>(null);
  const loading = useRef<boolean>(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [botDetail, setBotDetail] = useState<any>({});
  const [isHovered, setIsHovered] = useState<any>(null);
  const [appInfoModal, setAppInfoModal] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [robots, setRobots] = useState<any>([]);
  const [pageIndex, setPageIndex] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState(0);
  const [sort, setSort] = useState('createTime');
  const [version, setVersion] = useState(0);
  const [ApplicationModalVisible, setCreateModalVisible] =
    useState<boolean>(false); //创建应用
  const [operationId, setOperationId] = useState<string | null>(null);
  const { spaceId } = useSpaceStore();
  const { handleToChat } = useChat();

  // 复制成虚拟人需要的参数
  const [copyParams, setCopyParams] = useState<any>({});
  const [virtualModal, setVirtualModal] = useState<boolean>(false); //复制成虚拟人

  /* statusMap为createList接口查询时参数
  NOTE: 原本为：1 审核中，2 已发布，3 审核不通过，4修改审核中， -9 || 0 未发布 => 后来改为已发布、未发布、发布中、审核不通过；
  最新版本改为(09.01): 不传 全部状态, [1,2,4] 已发布(含发布中), [0] 未发布, [3] 已下架(原审核不通过)
  回显的status为：已发布(1,2,4, 含发布中、修改审核中状态), 未发布(-9 || 0), 已下架(3)
   */
  const statusMap = [
    {
      label: t('agentPage.agentPage.allStatus'),
      value: null,
    },
    {
      label: t('agentPage.agentPage.published'),
      value: [1, 2, 4],
    },
    {
      label: t('agentPage.agentPage.unpublished'),
      value: [0],
    },
    // {
    //   label: t('agentPage.agentPage.publishing'),
    //   value: [1],
    // },
    {
      label: t('agentPage.agentPage.rejected'),
      value: [3],
    },
  ];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      setOperationId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    getRobots();
  }, [status, sort, version, spaceId]);

  function getRobots(value?: string): void {
    loading.current = true;
    if (robotRef.current) {
      robotRef.current.scrollTop = 0;
    }

    const params: GetAgentListParams = {
      pageIndex: 1,
      pageSize: 200,
      botStatus: statusMap[status]?.value ?? null,
      sort,
      searchValue: value !== undefined ? value?.trim() : searchValue,
    };

    if (version !== 0) {
      params.version = version;
    }

    getAgentList(params)
      .then((data: GetAgentListResponse) => {
        if (data.pageData.length === 0) {
          setShowbotNo(true);
        } else {
          setShowbotNo(false);
        }
        setRobots(() => data.pageData);
        setPageIndex(() => 2);
        if (20 < data.totalCount) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      })
      .finally(() => (loading.current = false));
  }

  // NOTE: 现未使用
  function handleScroll() {
    const element = robotRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;

    if (
      scrollTop + clientHeight >= scrollHeight - 100 &&
      !loading.current &&
      hasMore
    ) {
      loading.current = true;
      moreRobots();
    }
  }

  function moreRobots() {
    const params: GetAgentListParams = {
      pageIndex: pageIndex,
      pageSize: 20,
      botStatus: statusMap[status]?.value ?? null,
      sort,
      searchValue: searchValue,
    };

    if (version !== 0) {
      params.version = version;
    }

    getAgentList(params)
      .then((data: GetAgentListResponse) => {
        setRobots([...robots, ...(data?.pageData ?? [])]);
        setPageIndex(pageIndex => pageIndex + 1);
        if (robots.length + 20 < data.totalCount) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      })
      .finally(() => (loading.current = false));
  }

  const getRobotsDebounce = useCallback(
    debounce(e => {
      const value = e.target.value;
      setSearchValue(value);
      getRobots(value);
    }, 500),
    [searchValue]
  );

  function jumpChat(e: React.MouseEvent<HTMLDivElement>, id: string): void {
    e.stopPropagation();
    navigate(`/space/bot/${id}/chat`);
  }

  function jumpConfig(e: React.MouseEvent<HTMLDivElement>, id: string): void {
    e.stopPropagation();
    navigate('/space/config/' + id + '/base');
  }

  const handleBotFavorite = useCallback(
    throttle(robot => {
      const params = {
        botId: robot.id,
        favoriteFlag: robot?.isFavorite ? 1 : 0,
      };

      enableBotFavorite(params).then(data => {
        setRobots((robots: any[]) => {
          const currentBot = robots.find((item: any) => item.id === robot.id);
          currentBot.isFavorite = !currentBot.isFavorite;
          currentBot.favoriteCount = data;

          return [...robots];
        });
      });
    }, 1000),
    []
  );

  /** 复制操作 */
  const copyBotNow = useCallback(
    debounce((botId?: number) => {
      copyBot({ botId })
        .then(() => {
          message.success(t('agentPage.agentPage.copySuccess'));
          // if (searchValue) {
          //   setSearchValue('');
          // } else {
          //   getRobots();
          // }
          getRobots();
        })
        .catch(err => {
          console.error(err);
          err?.msg && message.error(err.msg);
        });
    }, 500),
    [status, searchValue]
  );

  //  分享智能体
  const handleShareAgent = async (
    botName: string,
    botId: number
  ): Promise<void> => {
    await handleShare(botName, botId, t);
  };

  return (
    <div className="w-full h-full overflow-hidden pb-6">
      <CreateApplicationModal
        visible={ApplicationModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
        }}
      />

      {deleteModal && (
        <DeleteBot
          botDetail={botDetail}
          setDeleteModal={setDeleteModal}
          type={true}
          initData={() => {
            getRobots();
          }}
        />
      )}

      <div className="pt-[20px] h-full flex flex-col overflow-hidden gap-6">
        <div
          className="flex justify-between mx-auto max-w-[1425px]"
          style={{
            width: 'calc(0.85 * (100% - 8px))',
          }}
        >
          <div className={styles.modelTitle}>
            {t('agentPage.agentPage.myAgents')}
          </div>
        </div>
        <div
          className="flex justify-between mx-auto max-w-[1425px]"
          style={{
            width: 'calc(0.85 * (100% - 8px))',
          }}
        >
          <div className="flex items-center" style={{ marginRight: '4px' }}>
            <Select
              suffixIcon={<img src={formSelect} className="w-4 h-4 " />}
              className="search-select"
              style={{
                height: 32,
                width: 160,
                marginRight: '8px',
                border: '1px solid #E7E7F0',
                borderRadius: 10,
              }}
              value={version}
              onChange={value => {
                setVersion(value);
              }}
              options={[
                { label: t('agentPage.agentPage.allTypes'), value: 0 },
                { label: t('agentPage.agentPage.instructionType'), value: 1 },
                { label: t('agentPage.agentPage.workflowType'), value: 3 },
                { label: '语音*虚拟人', value: 4 },
              ]}
            />
            <Select
              suffixIcon={<img src={formSelect} className="w-4 h-4 " />}
              className="search-select"
              style={{
                height: 32,
                width: 160,
                marginRight: '8px',
                border: '1px solid #E7E7F0',
                borderRadius: 10,
              }}
              value={sort}
              onChange={value => {
                setSort(value);
              }}
              options={[
                {
                  label: t('agentPage.agentPage.sortByCreateTime'),
                  value: 'createTime',
                },
                {
                  label: t('agentPage.agentPage.sortByUpdateTime'),
                  value: 'updateTime',
                },
              ]}
            />
            <Select
              suffixIcon={<img src={formSelect} className="w-4 h-4 " />}
              className="search-select"
              style={{
                height: 32,
                width: 160,
                marginRight: '8px',
                border: '1px solid #E7E7F0',
                borderRadius: 10,
              }}
              value={status}
              onChange={value => {
                setStatus(value);
              }}
              options={[
                { label: t('agentPage.agentPage.allStatus'), value: 0 },
                { label: t('agentPage.agentPage.published'), value: 1 },
                { label: t('agentPage.agentPage.unpublished'), value: 2 },
                { label: t('agentPage.agentPage.rejected'), value: 3 },
              ]}
            />
          </div>
          <div className="flex items-center gap-[8px]">
            <RetractableInput
              restrictFirstChar={true}
              onChange={getRobotsDebounce}
            />
            <div
              className={styles.addBot}
              onClick={() => {
                if (!user?.login && !user?.uid) {
                  return jumpToLogin();
                }
                setCreateModalVisible(true);
              }}
            >
              <PlusOutlined />
              <span className={styles.addText}>
                {t('agentPage.agentPage.createAgent')}
              </span>
            </div>
          </div>
        </div>
        {robots?.length > 0 && (
          <div className="w-full flex-1 overflow-scroll relative">
            <div
              className="w-full h-full mx-auto max-w-[1425px]"
              style={{
                width: '85%',
              }}
              ref={robotRef}
              onScroll={handleScroll}
            >
              <div className="grid lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-3 gap-6 items-end">
                {robots.map((k: any, index) => (
                  <div
                    className={`common-card-item group h-[162px] ${styles.angentItemBox}`}
                    key={k.botId}
                    onClick={() => {
                      k.version === 1
                        ? navigate(`/space/config/base?botId=${k?.botId}`)
                        : navigate(
                            `/work_flow/${k?.maasId}/arrange?botId=${k?.botId}`
                          );
                    }}
                  >
                    <div className="px-6">
                      <div className="flex items-start gap-6 overflow-hidden">
                        <span className="flex items-center justify-center rounded-lg flex-shrink-0">
                          <img
                            src={k.avatar}
                            className={styles.agentAvatar}
                            alt=""
                          />
                        </span>
                        <div className="flex flex-col gap-2 overflow-hidden">
                          <div
                            className="flex-1 text-overflow font-medium text-xl title-color title-size"
                            title={k.botName}
                          >
                            {k.botName}
                          </div>
                          <div
                            className="text-[#7F7F7F] text-[14px] overflow-hidden text-ellipsis h-[43px] w-full line-clamp-2"
                            title={k.botDesc}
                          >
                            {k.botDesc}
                          </div>
                        </div>
                        <Tooltip
                          title={
                            k.botStatus === 1
                              ? t('agentPage.agentPage.searchableInMarketplace')
                              : k.botStatus === -9 || k.botStatus === 0
                                ? t('agentPage.agentPage.personalUseOnly')
                                : t('agentPage.agentPage.needsModification') +
                                  k.blockReason
                          }
                        >
                          <div
                            className="px-1.5 py-0.5 rounded-md font-medium text-sm absolute right-[0px] top-[0px]"
                            style={{
                              background:
                                k.botStatus === 2 ||
                                k.botStatus === 1 ||
                                k.botStatus === 4
                                  ? '#CFF4E1'
                                  : k.botStatus === -9 || k.botStatus === 0
                                    ? '#E6E6E8'
                                    : '#FEEDEC',
                              color:
                                k.botStatus === 2 ||
                                k.botStatus === 1 ||
                                k.botStatus === 4
                                  ? '#477D62'
                                  : k.botStatus === -9 || k.botStatus === 0
                                    ? '#666666'
                                    : '#F74E43',
                              borderRadius: '0px 18px 0px 8px',
                            }}
                          >
                            {k.botStatus === 2 ||
                            k.botStatus === 1 ||
                            k.botStatus === 4
                              ? t('agentPage.agentPage.published')
                              : k.botStatus === -9 || k.botStatus === 0
                                ? t('agentPage.agentPage.unpublished')
                                : t('agentPage.agentPage.rejected')}
                          </div>
                        </Tooltip>
                      </div>
                    </div>

                    <div
                      className="flex justify-between items-center "
                      style={{
                        padding: '0px 24px 0 24px',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                      }}
                    >
                      <span className="text-[#7F7F7F] text-xs flex items-center">
                        <div className="flex gap-4">
                          <div className={styles.angentType}>
                            {k.version === 1 &&
                              t('agentPage.agentPage.instructionType')}
                            {k.version === 3 &&
                              t('agentPage.agentPage.workflowType')}
                            {k.version === 4 &&
                              t('agentPage.agentPage.voiceVirtualType')}
                          </div>
                        </div>
                      </span>
                      <div className="flex items-center text-desc flex-1 max-w-[200px] justify-between">
                        <div
                          className="card-chat cursor-pointer flex justify-center items-center"
                          style={{
                            width: '76px',
                            height: '32px',
                            background: '#F1F0FF',
                            borderRadius: '6px',
                            textAlign: 'center',
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            if (k.version === 3) {
                              getInputsType({ botId: k.botId }).then(
                                (res: any) => {
                                  // 合并不支持对话的条件
                                  if (
                                    res.length > 1 &&
                                    res
                                      .slice(1)
                                      .some(
                                        (item: { fileType?: string }) =>
                                          item.fileType !== 'file'
                                      )
                                  ) {
                                    return message.info(
                                      t('agentPage.agentPage.notSupported')
                                    );
                                  }
                                  handleToChat(k.botId);
                                }
                              );
                            } else {
                              handleToChat(k.botId);
                            }
                          }}
                        >
                          <img src={chatIcon} alt="" />
                          <span
                            className="ml-1 whitespace-nowrap"
                            style={{
                              color: '#222529',
                              fontSize: '14px',
                            }}
                          >
                            {t('agentPage.agentPage.chat')}
                          </span>
                        </div>
                        <Popover
                          placement="bottom"
                          overlayClassName="my-botlist-share-pop"
                        >
                          <div
                            className="card-chat cursor-pointer flex justify-center items-center"
                            style={{
                              width: '76px',
                              height: '32px',
                              background: '#F1F0FF',
                              borderRadius: '6px',
                              textAlign: 'center',
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              handleShareAgent(k.botName, k.botId);
                            }}
                          >
                            <img src={shareIcon} alt="" />

                            <span
                              className="ml-1 whitespace-nowrap"
                              style={{
                                color: '#222529',
                                fontSize: '14px',
                              }}
                            >
                              {t('agentPage.agentPage.share')}
                            </span>
                          </div>
                        </Popover>
                        {
                          <div
                            className="bg-[#F1F0FF] rounded flex items-center justify-center relative"
                            style={{
                              width: '32px',
                              height: '32px',
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              if (operationId === k.botId) {
                                setOperationId(null);
                              } else {
                                setOperationId(k.botId);
                              }
                            }}
                            onMouseEnter={e => {
                              e.stopPropagation();
                              setOperationId(k.botId);
                            }}
                            onMouseLeave={e => {
                              e.stopPropagation();
                              setOperationId(null);
                            }}
                          >
                            <img
                              src={agentOperationMore}
                              className="w-[14px] h-[14px]"
                              alt=""
                            />
                            {operationId === k.botId && (
                              <div
                                className={`absolute top-[28px] right-0 bg-white rounded p-1 shadow-md flex flex-col gap-1  ${k.version === 3 ? styles.propBox1 : styles.propBox2}`}
                                style={{
                                  zIndex: 1,
                                }}
                              >
                                <div
                                  className="p-1 rounded hover:bg-[#F2F5FE] block"
                                  onClick={e => {
                                    e.stopPropagation();
                                    copyBotNow(k.botId);
                                  }}
                                >
                                  {t('agentPage.agentPage.copy')}
                                </div>
                                {k?.version === 3 && (
                                  <a
                                    className="p-1 rounded hover:bg-[#F2F5FE] block"
                                    href={`${window.location.origin}/xingchen-api/workflow/export/${k?.maasId}`}
                                    download={`${k?.botName}.yml`}
                                    onClick={e => {
                                      e?.stopPropagation();
                                      e.preventDefault();
                                      setOperationId(null);
                                      downloadFileWithHeaders(
                                        getFixedUrl(
                                          `/workflow/export/${k?.maasId}`
                                        ),
                                        `${k?.botName}.yml`
                                      );
                                    }}
                                  >
                                    {t('agentPage.agentPage.export')}
                                  </a>
                                )}

                                {k?.version === 3 && (
                                  <div
                                    className="p-1 rounded hover:bg-[#F2F5FE] text-[#666666]"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setCopyParams({ ...k, name: k.botName });
                                      setVirtualModal(true);
                                    }}
                                  >
                                    {t(
                                      'agentPage.agentPage.copyToVirtualAgent'
                                    )}
                                  </div>
                                )}
                                <div
                                  className="p-1 rounded hover:bg-[#F2F5FE] text-[#F74E43]"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setBotDetail(k);
                                    setDeleteModal(true);
                                    setOperationId(null);
                                  }}
                                >
                                  {t('agentPage.agentPage.delete')}
                                </div>
                              </div>
                            )}
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {showbotNo && (
          <>
            <div style={{ textAlign: 'center', paddingTop: '128px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '4px',
                }}
              >
                <img src={botNoIcon} alt="" />
              </div>
              <div
                style={{
                  marginBottom: '20px',
                  fontSize: '16px',
                  color: '#666',
                }}
              >
                {t('agentPage.agentPage.noAgentsYet')}
              </div>
              <div
                className={styles.addBot}
                onClick={() => {
                  if (!user?.login && !user?.uid) {
                    return jumpToLogin();
                  }
                  setCreateModalVisible(true);
                }}
                style={{ margin: '0 auto' }}
              >
                <PlusOutlined />
                <span className={styles.addText}>
                  {t('agentPage.agentPage.createAgent')}
                </span>
              </div>
            </div>
          </>
        )}

        <VirtualConfig
          visible={virtualModal}
          formValues={copyParams}
          onSubmit={values => {
            upgradeWorkflow({ sourceId: copyParams?.botId, ...values })
              .then((res: any) => {
                message.success(t('agentPage.agentPage.copyToVirtualSuccess'));
                navigate(
                  `/work_flow/${res?.maasId}/arrange?botId=${res?.botId}`
                );
                setVirtualModal(false);
              })
              .catch((err: any) => {
                message.error(err?.message || err);
              });
          }}
          onCancel={() => {
            setVirtualModal(false);
          }}
        />
      </div>
    </div>
  );
}

export default memo(index);
