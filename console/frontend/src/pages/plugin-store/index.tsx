/*
 * @Author: snoopyYang
 * @Date: 2025-09-23 10:08:36
 * @LastEditors: snoopyYang
 * @LastEditTime: 2025-09-23 10:08:47
 * @Description: 插件广场
 */
import React, {
  useEffect,
  useState,
  useRef,
  memo,
  ReactElement,
  JSX,
  useCallback,
  useMemo,
} from 'react';
import { message, Select, Spin } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listToolSquare } from '@/services/tool';
import { getTags } from '@/services/square';
import { useTranslation } from 'react-i18next';
import { useDebounceFn } from 'ahooks';
import RetractableInput from '@/components/ui/global/retract-table-input';
// import Banner from './components/banner';
import ToolCard from './components/tool-card';
import { Tool, ListToolSquareParams, Classify } from '@/types/plugin-store';
import type { ResponseBusinessError, ResponseResultPage } from '@/types/global';

import formSelect from '@/assets/svgs/icon-nav-dropdown.svg';
import defaultPng from '@/assets/imgs/tool-square/default.png';
import SiderContainer from '@/components/sider-container';
// todo-newImg
import './style.css';

function PluginStore(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { category, searchInput, tab } = Object.fromEntries(
    searchParams.entries()
  );
  const loadingRef = useRef<boolean>(false);
  const toolRef = useRef<HTMLDivElement | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [searchValue, setSearchValue] = useState<{
    page: number;
    pageSize: number;
    orderFlag: number;
  }>({
    page: 1,
    pageSize: 30,
    orderFlag: category ? Number(category) : 0,
  });
  const [content, setContent] = useState(searchInput || '');
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [classifyList, setClassifyList] = useState<Classify[]>([]);
  const [classify, setClassify] = useState<string | number>(
    tab ? Number(tab) : ''
  );
  const [hoverClassify, setHoverClassify] = useState<string | number>('');
  const [tagFlag, setTagFlag] = useState<string | number>(tab ? '' : 0);

  const { run } = useDebounceFn(
    inputValue => {
      getTools(inputValue);
    },
    { wait: 500 }
  );

  const getToolsDebounce = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setContent(value);
    run(value);
  };

  const handleScroll = (): void => {
    if (!loadingRef.current && hasMore) {
      moreTools();
    }
  };

  const moreTools = (): void => {
    loadingRef.current = true;
    setLoading(true);

    const params: ListToolSquareParams = {
      ...searchValue,
      content: content?.trim(),
      tags: classify,
      tagFlag,
    };

    listToolSquare(params)
      .then((data: { pageData: Tool[]; totalCount: number }) => {
        setTools(() =>
          data?.pageData ? [...tools, ...(data?.pageData || {})] : [...tools]
        );
        setSearchValue({
          ...(searchValue || {}),
          page: searchValue.page + 1,
        });
        if (tools.length + 30 < data.totalCount) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      })
      .catch((error: ResponseBusinessError) => {
        message.error(error?.message || '获取插件列表失败');
        setTools([]);
      })
      .finally(() => {
        setLoading(false);
        loadingRef.current = false;
      });
  };

  const getTools = (value?: string, orderFlag?: number): void => {
    setLoading(true);
    setTools(() => []);
    loadingRef.current = true;
    if (toolRef.current) {
      toolRef.current.scrollTop = 0;
    }
    const params: ListToolSquareParams = {
      ...searchValue,
      page: 1,
      orderFlag: orderFlag !== undefined ? orderFlag : searchValue.orderFlag,
      content: value !== undefined ? value?.trim() : content,
      tags: classify,
      tagFlag,
    };
    listToolSquare(params)
      .then((data: ResponseResultPage<Tool>) => {
        setTools(data?.pageData || []);
        setSearchValue(searchValue => ({ ...searchValue, page: 2 }));
        if (30 < data.totalCount) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      })
      .catch((error: ResponseBusinessError) => {
        message.error(error?.message || '获取插件列表失败');
        setTools([]);
      })
      .finally(() => {
        setLoading(false);
        loadingRef.current = false;
      });
  };

  useEffect(() => {
    getTags('tool_v2')
      .then((data: Classify[]) => {
        setClassifyList(data);
      })
      .catch((error: ResponseBusinessError) => {
        message.error(error?.message);
      });
  }, []);

  useEffect(() => {
    getTools();
  }, [classify, tagFlag]);

  const calcTabItemStyle = useCallback(
    (id: number | string, isAll: boolean = true) => {
      return [hoverClassify, isAll ? tagFlag : classify].includes(id)
        ? {
            background: '#FFFFFF',
            color: '#6356EA',
            boxShadow: '0px 2px 4px 0px rgba(46, 51, 68, 0.0373)',
          }
        : {
            background: '',
            color: '#676773',
          };
    },
    [hoverClassify, tagFlag, classify]
  );

  const TopBar = useMemo(
    () => (
      <div className="w-full max-w-[1425px] flex flex-col justify-start items-center">
        {/* 导航栏 */}
        <div className="w-full flex items-center justify-between max-w-[1425px]">
          <div className="flex items-center">
            <div className="flex rounded-lg flex justify-center items-center] relative">
              <div
                className="px-4 py-1.5 rounded-[10px] cursor-pointer text-sm flex items-center justify-center h-[32px] font-medium"
                style={calcTabItemStyle(0)}
                onMouseEnter={() => setHoverClassify(0)}
                onMouseLeave={() => setHoverClassify('')}
                onClick={() => {
                  setTagFlag(0);
                  setClassify('');
                }}
              >
                {t('common.storePlugin.all')}
              </div>

              {classifyList.map((item: any, index) => (
                <div
                  key={item.id}
                  className="px-4 py-1.5 rounded-[10px] cursor-pointer text-sm flex items-center justify-center font-medium h-[32px]"
                  style={calcTabItemStyle(item.id, false)}
                  onMouseEnter={() => setHoverClassify(item.id)}
                  onMouseLeave={() => setHoverClassify('')}
                  onClick={() => {
                    setTagFlag(1);
                    setClassify(item.id);
                  }}
                >
                  {item.name}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <Select
              suffixIcon={<img src={formSelect} className="w-4 h-4" />}
              className="ant-select-UI"
              value={searchValue.orderFlag}
              style={{ width: '160px' }}
              onChange={value => {
                setSearchValue(() => ({
                  ...searchValue,
                  orderFlag: value,
                }));
                getTools(content, value);
              }}
              options={[
                { label: t('common.storePlugin.mostPopular'), value: 0 },
                { label: t('common.storePlugin.recentlyUsed'), value: 1 },
              ]}
            ></Select>
            <div className="relative ml-[8px] search-input-rounded">
              <RetractableInput
                restrictFirstChar={true}
                onChange={getToolsDebounce}
                value={content}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    [
      setSearchValue,
      getToolsDebounce,
      content,
      t,
      getTools,
      setHoverClassify,
      calcTabItemStyle,
      setTagFlag,
    ]
  );

  const RightContent = useMemo(
    () => (
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* 2.卡片样式 */}
        {tools.length > 0 && (
          <div className="flex items-start justify-center flex-1 w-full">
            <div className="w-full grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-3 gap-5 max-w-[1425px]">
              {tools.map((tool: any) => (
                <ToolCard
                  key={tool.id || tool?.mcpTooId}
                  tool={tool}
                  onCardClick={() => {
                    navigate(
                      `/store/plugin/${tool.id || tool?.mcpTooId}?isMcp=${tool?.isMcp}&searchInput=${encodeURIComponent(content)}&category=${searchValue.orderFlag}&tab=${classify}`
                    );
                  }}
                />
              ))}
            </div>
          </div>
        )}
        {loading && <Spin className="mt-2" />}
        {!loading && tools.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2">
            <img src={defaultPng} className="w-[140px] h-[140px]" alt="" />
            <div>{t('common.storePlugin.noPlugins')}</div>
          </div>
        )}
      </div>
    ),
    [loading, tools, handleScroll]
  );

  return (
    <div className="w-full flex-1 flex flex-col overflow-hidden">
      <div className="w-full flex justify-between mb-5 page-container-inner-UI">
        <div className="flex items-center font-medium leading-normal tracking-wider">
          <span className="font-medium text-[20px] text-[#222529] leading-[26px] font-[PingFang-Sim]">
            {t('common.storePlugin.pluginSquare')}
          </span>
        </div>
      </div>
      {/* <Banner /> */}

      <SiderContainer
        topBar={TopBar}
        rightContent={RightContent}
        scrollToBottom={handleScroll}
      />
    </div>
  );
}

export default memo(PluginStore);
