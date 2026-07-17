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
import { Input, message, Popover, Spin, Tooltip } from 'antd';
import classnames from 'classnames';
import eventBus from '@/utils/event-bus';
import { debounce } from 'lodash';
import useChat from '@/hooks/use-chat';
import useUserStore from '@/store/user-store';
import useHomeStore from '@/store/home-store';
import { getLanguageCode } from '@/utils/http';
import { BotType, Bot, SearchBotParam, Banner } from '@/types/agent-square';
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
  const currentLang = getLanguageCode();

  const [bannerList] = useState<Banner[]>([
    // NOTE: isOpen: open new page
    {
      src: 'https://openres.xfyun.cn/xfyundoc/2025-09-01/ec2409cf-17cc-4276-b8f3-acdca4abac42/1756696685915/agentRewardBanner.png',
      srcEn:
        'https://openres.xfyun.cn/xfyundoc/2025-09-01/ec2409cf-17cc-4276-b8f3-acdca4abac42/1756696685915/agentRewardBanner.png',
      url: `${window.location.origin}/activitySummer`,
      isOpen: false,
    },
    {
      src: 'https://openres.xfyun.cn/xfyundoc/2025-07-28/1b4d1b3b-5fc0-44e5-938a-f11cd399ea09/1753666916737/banner01-07.28.jpg',
      srcEn:
        'https://openres.xfyun.cn/xfyundoc/2025-07-29/e6c12f1d-9e5c-4623-b668-d05d2d826a1f/1753771451925/banner-en02.jpg',
      url: `${window.location.origin}/chat?sharekey=e1e62e4027b882aa7a43d4b25ed4974c&botId=2963659`,
      isOpen: false,
    },
    {
      src: 'https://openres.xfyun.cn/xfyundoc/2025-07-28/057e265c-d206-42a0-bcc4-e35d1a5950ad/1753666916740/banner02-07.28.jpg',
      srcEn:
        'https://openres.xfyun.cn/xfyundoc/2025-07-29/453698ff-0f08-41d7-b847-9db6640852c6/1753771451926/banner-en03.jpg',
      url: `${window.location.origin}/chat?sharekey=b17abc6f0d4a356ed09a9fe1631ffd2c&botId=2958065`,
      isOpen: false,
    },
    {
      src: 'https://openres.xfyun.cn/xfyundoc/2025-07-28/d88084c2-16c8-4210-b5cb-7ef3e298a1bb/1753666916741/banner03-07.28.jpg',
      srcEn:
        'https://openres.xfyun.cn/xfyundoc/2025-07-29/0d319c45-816c-4d5b-a94c-91bc489c374d/1753771451926/banner-en04.jpg',
      url: `${window.location.origin}/chat?sharekey=003e4873f478e5f1f9ed82930d0bb4e7&botId=2216831`,
      isOpen: false,
    },
    {
      src: 'https://openres.xfyun.cn/xfyundoc/2025-07-28/79576df5-7d4c-4cf0-b7cf-b1c343acc11a/1753666916742/banner04-07.28.jpg',
      srcEn:
        'https://openres.xfyun.cn/xfyundoc/2025-07-29/4818e1ba-8af5-4374-8238-db7250a14e84/1753771451927/banner-en05.jpg',
      url: `${window.location.origin}/chat?sharekey=9991b23791117619a3c3608a44c1c499&botId=2813049`,
      isOpen: false,
    },
  ]);
  const [botTypes, setBotTypes] = useState<BotType[]>([]);
  const {
    botType,
    botOrigin,
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

  // filter banner by language
  const filteredBanners: Banner[] = bannerList
    .filter((banner: Banner) => currentLang !== 'en' || banner.srcEn)
    .map((banner: Banner) => ({
      ...banner,
      src: currentLang === 'en' ? banner.srcEn : banner.src,
    }));

  // handle banner click
  const handleBannerClick = (item: Banner): void => {
    if (item.url) {
      if (item.isOpen) {
        window.open(item.url, '_blank');
      } else {
        window.location.href = item.url;
      }
    }
  };

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
  const handleStartSearch = (value: string, pageInfo: SearchBotParam) => {
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
  const updateBotList = (botId: string | number, isFavorite: boolean) => {
    setAgentList((agents: Bot[]) => {
      const currentBot: Bot | undefined =
        agents.find((t: Bot) => t.botId === botId) || ({} as Bot);
      currentBot.isFavorite = isFavorite;
      return [...agents];
    });
  };

  // observer favorite change
  const handleFavoriteChange = (botId: string | number) => {
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
    return () => {
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

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore, onGettingPage, searchLoading, loadingPage, loadMore]);

  const handleValueChange = (e: any) => {
    const value = e.target.value;
    setSearchInputValue(value);
    debouncedSearchRef.current(value, pageInfo);
  };

  // share bot
  const handleShareAgent = async (botInfo: Bot): Promise<void> => {
    await handleShare(botInfo.botName, botInfo.botId, t);
  };

  // 渲染助手列表
  const renderCardWrapper = () => {
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
