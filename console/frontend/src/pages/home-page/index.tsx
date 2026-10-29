/*
 * @Author: snoopyYang
 * @Date: 2025-09-23 10:14:36
 * @LastEditors: snoopyYang
 * @LastEditTime: 2025-09-23 10:14:45
 * @Description: 首页：智能体广场
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { getCommonConfig } from '@/services/common';
import {
  getAgentType,
  getAgentList,
  collectBot,
  cancelFavorite,
} from '@/services/agent-square';
import styles from './index.module.scss';
import { Input, message, Spin, Tooltip } from 'antd';
import classnames from 'classnames';
import eventBus from '@/utils/event-bus';
import { debounce } from 'lodash';
import useChat from '@/hooks/use-chat';
import useUserStore from '@/store/user-store';
import useHomeStore from '@/store/home-store';
import { BotType, Bot, SearchBotParam } from '@/types/agent-square';
import type { ResponseResultPage } from '@/types/global';
import { handleShare } from '@/utils';
import { useLocaleStore } from '@/store/spark-store/locale-store';

dayjs.extend(utc);

const PAGE_SIZE = 10;

const PAGE_INFO_ORIGIN: SearchBotParam = {
  search: '',
  page: 1,
  pageSize: PAGE_SIZE,
  type: 0,
};

const HomePage: React.FC = () => {
  const { t } = useTranslation();

  const [botTypes, setBotTypes] = useState<BotType[]>([]);
  const {
    botType,
    scrollTop,
    loadingPage,
    searchInputValue,
    setBotType,
    setBotOrigin,
    setLoadingPage,
    setSearchInputValue,
  } = useHomeStore();
  const homeRef = useRef<HTMLDivElement>(null);
  const [pageInfo, setPageInfo] = useState<SearchBotParam>(PAGE_INFO_ORIGIN); // page info
  const [searchLoading, setSearchLoading] = useState<boolean>(false); // is searching
  const [agentList, setAgentList] = useState<Bot[]>([]); // bot list
  const [loading, setLoading] = useState(false); // loading more
  const [hasMore, setHasMore] = useState(true); // has more data
  const onGettingPage = useRef(false);
  const user = useUserStore((state: any) => state.user);
  const { handleToChat } = useChat();
  const [pendingBotTypeChange, setPendingBotTypeChange] = useState<
    number | null
  >(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { locale: localeNow } = useLocaleStore();

  const formatCreateTime = useCallback((value?: string) => {
    if (!value) return '';
    const normalized = value.replace(' ', 'T');
    return dayjs.utc(normalized).utcOffset(8).format('YYYY-MM-DD HH:mm');
  }, []);

  // get agent type list
  const loadAgentTypeList = async (): Promise<void> => {
    const res: BotType[] = await getAgentType();
    setBotTypes(res || []);
    setBotType(res[0]?.typeKey || 0);
    setPageInfo({
      ...pageInfo,
      type: res[0]?.typeKey || 0,
      search: searchInputValue || '',
    });
  };

  // search box prefix icon
  const prefixIcon = (): React.ReactNode => {
    return <img src={require('@/assets/svgs/search.svg')} alt="" />;
  };

  // start search
  const handleStartSearch = (value: string, pageInfo: SearchBotParam): void => {
    setBotOrigin('search');
    setSearchLoading(true);
    setAgentList([]);
    setPageInfo({
      ...pageInfo,
      search: value,
      page: 1,
    });
  };
  // switch bot type
  const handleBotTypeChange = async (type: number): Promise<void> => {
    onGettingPage.current = false;
    setAgentList([]);
    setPageInfo({
      ...pageInfo,
      type,
      search: '',
      page: 1,
    });
    setHasMore(true);
    setSearchLoading(true);
    setSearchInputValue('');
    setBotType(type);
  };

  /**
   * load more agent list data
   * @param customPageIndex custom page index
   * @returns
   */
  const loadMore = (customPageIndex?: number): Promise<void> => {
    return new Promise(resolve => {
      setLoading(true);
      const currentPageIndex = customPageIndex || pageInfo.page + 1;
      const newPageInfo = {
        ...pageInfo,
        page: currentPageIndex,
      };
      setPageInfo(newPageInfo);
      resolve(void 0);
    });
  };
  /**
   * load all agent list
   */
  const loadAgentListAll = (): void => {
    getAgentList({ ...pageInfo })
      .then((res: ResponseResultPage<Bot>) => {
        setAgentList(prevList => {
          const newList = [...prevList, ...res.pageData];
          setHasMore(res.totalCount > newList.length);
          return newList;
        });
        setSearchLoading(false);
      })
      .catch(err => {
        setSearchLoading(false);
        message.error(err?.msg || t('networkError'));
      })
      .finally(() => {
        setLoading(false);
        onGettingPage.current = false;
      });
  };

  /**
   * collect or cancel collect bot
   * @param item
   * @param e
   */
  const handleCollect = (
    item: Bot,
    e: React.MouseEvent<HTMLDivElement>
  ): void => {
    e.stopPropagation();
    if (!item?.isFavorite) {
      collectBot({
        botId: item.botId,
      })
        .then(() => {
          message.success(t('home.collectionSuccess'));
          eventBus.emit('getFavoriteBotList');
          updateBotList(item.botId, true);
        })
        .catch(err => {
          message.error(err?.msg || t('networkError'));
        });
    } else {
      cancelFavorite({
        botId: item.botId,
      })
        .then(() => {
          message.success(t('home.cancelCollectionSuccess'));
          eventBus.emit('getFavoriteBotList');
          updateBotList(item.botId, false);
        })
        .catch(err => {
          message.error(err?.msg);
        });
    }
  };

  // update bot list
  const updateBotList = (botId: string | number, isFavorite: boolean): void => {
    setAgentList((agents: Bot[]) => {
      const currentBot: Bot | undefined =
        agents.find((t: Bot) => t.botId === botId) || ({} as Bot);
      currentBot.isFavorite = isFavorite;
      return [...agents];
    });
  };

  // observer favorite change
  const handleFavoriteChange = (botId: string | number): void => {
    if (botId) {
      updateBotList(botId, false);
    }
  };

  useEffect(() => {
    const params = {
      category: 'DOCUMENT_LINK',
      code: 'SparkBotHelpDoc',
    };
    if (user?.login || user?.uid) {
      getCommonConfig(params);
    }
    loadAgentTypeList();
    eventBus.on('favoriteChange', handleFavoriteChange);
    return (): void => {
      eventBus.off('favoriteChange', handleFavoriteChange);
    };
  }, []);

  const handleSearch = useCallback(
    debounce((value, pageInfo) => {
      handleStartSearch(value, pageInfo);
    }, 500),
    [handleBotTypeChange, handleStartSearch]
  );
  const debouncedSearchRef = useRef(handleSearch);

  // observe scrollTop change, if there is a pending botType change, execute
  useEffect(() => {
    if (pendingBotTypeChange !== null && scrollTop === 0) {
      handleBotTypeChange(pendingBotTypeChange);
      setPendingBotTypeChange(null);
    }
  }, [scrollTop, pendingBotTypeChange]);

  // IntersectionObserver observe sentinel element, implement infinite scroll loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          // sentinel element enter or near viewport
          if (
            entry.isIntersecting &&
            !loading &&
            hasMore &&
            !onGettingPage.current &&
            !searchLoading
          ) {
            onGettingPage.current = true;
            loadMore()
              .then(() => {
                setLoadingPage(loadingPage + 1);
              })
              .catch(err => {
                onGettingPage.current = false;
              });
          }
        });
      },
      {
        root: homeRef.current, // homeRef container as root element
        rootMargin: '100px', // before 100px
        threshold: 0, // sentinel element just enter
      }
    );

    // observe sentinel element
    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    observerRef.current = observer;

    return (): void => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore, onGettingPage, searchLoading, loadingPage, loadMore]);

  const handleValueChange = (e: any): void => {
    const value = e.target.value;
    setSearchInputValue(value);
    debouncedSearchRef.current(value, pageInfo);
  };

  // share bot
  const handleShareAgent = async (botInfo: Bot): Promise<void> => {
    await handleShare(botInfo.botName, botInfo.botId, t);
  };

  // 渲染助手列表
  const renderCardWrapper = (): React.ReactElement => {
    return (
      <div className={styles.card_wrapper}>
        {searchLoading ? (
          <div className={styles.loading_wrapper}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            {agentList?.length > 0 ? (
              <div className={styles.recent_card_wrapper}>
                <div
                  className={classnames(
                    styles.recent_card_list,
                    styles.recent_recent
                  )}
                >
                  {agentList.map((item: Bot, index: number) => (
                    <div
                      className={styles.recent_card_item}
                      key={index}
                      onClick={() => handleToChat(item?.botId)}
                    >
                      <div className={styles.info}>
                        <div className={styles.bot_info}>
                          <img
                            src={item?.botCoverUrl}
                            alt=""
                            className={styles.bot_avatar}
                          />
                          <div className={styles.bot_info_content}>
                            <div className={styles.title}>
                              <span>{item?.botName}</span>
                              <div onClick={e => e.stopPropagation()}>
                                <div onClick={() => handleShareAgent(item)} />
                                <div
                                  className={classnames({
                                    [styles.collect as string]:
                                      !!item?.isFavorite,
                                  })}
                                  onClick={e => {
                                    handleCollect(item, e);
                                  }}
                                />
                              </div>
                            </div>
                            <Tooltip
                              placement="bottomLeft"
                              title={item?.botDesc}
                              arrow={false}
                              overlayClassName="black-tooltip"
                            >
                              <div className={styles.desc}>{item?.botDesc}</div>
                            </Tooltip>
                          </div>
                        </div>

                        <div className={styles.author}>
                          <div className={styles.author_info}>
                            <img
                              src={require('@/assets/imgs/home/author.svg')}
                              alt=""
                            />
                            <div
                              style={{
                                minWidth: 0,
                                display: 'flex',
                                flexDirection: 'column',
                              }}
                            >
                              <span>
                                {item?.creator || t('home.officialAssistant')}
                              </span>
                              {item?.createTime ? (
                                <span
                                  title={formatCreateTime(item?.createTime)}
                                >
                                  {formatCreateTime(item?.createTime)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className={styles.tags}>
                            {item?.version &&
                              [1, 5].includes(item?.version) && (
                                <div className={styles.itag}>
                                  {t('home.instructionType')}
                                </div>
                              )}
                            {item?.version &&
                              [2, 3, 4].includes(item?.version) && (
                                <div className={styles.itag}>
                                  {t('home.workflowType')}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* observer sentinel element */}
                  <div ref={sentinelRef} style={{ height: '1px' }} />
                </div>
              </div>
            ) : (
              <div className={styles.good_card_list}>
                <div className={styles.empty_state}>
                  <img
                    src={
                      'https://openres.xfyun.cn/xfyundoc/2024-01-03/2e6bdf58-f307-4765-9dfa-157813ea5875/1704248820240/%E7%BB%841%402x.png'
                    }
                    alt=""
                  />
                  <span
                    onClick={() => {
                      eventBus.emit('createBot');
                    }}
                  >
                    {t('home.noRelatedSearchResults')}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  useEffect(() => {
    pageInfo.type && loadAgentListAll();
  }, [pageInfo]);

  return (
    <div className={styles.homeWrapper} ref={homeRef}>
      <div className={styles.home}>
        <div className={styles.all_agent}>
          <div className={styles.all_agent_title}>
            <div className={styles.all_agent_title_left}>
              {botTypes.map((item: BotType) => (
                <div
                  key={item.typeKey}
                  className={classnames(styles.bot_type_item, 'relative', {
                    [styles.activeTab as string]: botType === item.typeKey,
                  })}
                  onClick={() => {
                    handleBotTypeChange(item.typeKey);
                  }}
                >
                  {localeNow === 'en' ? item.typeNameEn : item.typeName}
                </div>
              ))}
            </div>
            <div className={styles.all_agent_title_right}>
              <Input
                placeholder={t('home.searchPlaceholder')}
                value={searchInputValue}
                onChange={e => {
                  handleValueChange(e);
                }}
                prefix={prefixIcon()}
              />
            </div>
          </div>
          {renderCardWrapper()}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
