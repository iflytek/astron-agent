import React, {
  useState,
  useEffect,
  JSX,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { debounce } from 'lodash';
import { SpaceButton } from '../button-group';
import RetractableInput from '../ui/global/retract-table-input';
import ArrowDownIconWhite from '@/assets/svgs/arrow-down-white.svg';
import styles from './index.module.scss';

const tabs = [
  {
    key: 'plugin',
    path: '/resource/plugin',
    iconClass: 'plugin-icon',
    title: 'common.header.plugin',
    searchPlaceholder: 'common.inputPlaceholder',
    createButtonText: 'plugin.createPlugin',
    createButtonKey: 'create-plugin',
  },
  {
    key: 'knowledge',
    path: '/resource/knowledge',
    iconClass: 'knowledge-icon',
    title: 'common.header.knowledge',
    searchPlaceholder: 'common.inputPlaceholder',
    createButtonText: 'knowledge.createNewKnowledge',
    createButtonKey: 'create-knowledge',
  },
  {
    key: 'database',
    path: '/resource/database',
    iconClass: 'database-icon',
    title: 'common.header.database',
    searchPlaceholder: 'common.inputPlaceholder',
    createButtonText: 'database.createDatabase',
    createButtonKey: 'create-database',
  },
  {
    key: 'rpa',
    path: '/resource/rpa',
    iconClass: 'rpa-icon',
    title: 'common.header.rpa',
    searchPlaceholder: 'common.inputPlaceholder',
    createButtonText: 'rpa.createRpa',
    createButtonKey: 'create-rpa',
  },
  {
    key: 'skill',
    path: '/resource/skill',
    iconClass: 'plugin-icon',
    title: 'common.header.skill',
    searchPlaceholder: 'common.inputPlaceholder',
    createButtonText: 'common.create',
    createButtonKey: 'create-skill',
  },
  {
    key: 'automation',
    path: '/resource/automation',
    iconClass: 'plugin-icon',
    title: 'automation.title',
    searchPlaceholder: 'common.inputPlaceholder',
    createButtonText: 'automation.createTask',
    createButtonKey: 'create-automation',
  },
  {
    key: 'sandbox',
    path: '/resource/sandbox',
    iconClass: 'plugin-icon',
    title: '脚本沙箱',
    hideTools: true,
  },
];

interface HeaderProps {
  onSearch?: (value: string, type: string) => void;
  onCreate?: (type: string) => void;
}

function index({ onSearch, onCreate }: HeaderProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTab, setCurrentTab] = useState<string>('');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setCurrentTab(location?.pathname?.split('/')?.pop() as string);
  }, [location]);

  // 获取当前路由对应的配置
  const currentTabConfig = useMemo(() => {
    return tabs.find(tab => tab.key === currentTab);
  }, [currentTab]);

  // 搜索防抖处理 - 只对 onSearch 进行防抖
  const debouncedSearch = useRef(
    debounce(
      (
        value: string,
        tab: string,
        callback?: (value: string, type: string) => void
      ) => {
        callback?.(value, tab);
      },
      500
    )
  ).current;

  const handleSearchDebounce = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const value = e.target.value;
      setSearchValue(value); // 立即更新输入框的值
      debouncedSearch(value, currentTab, onSearch); // 防抖调用 onSearch
    },
    [currentTab, onSearch, debouncedSearch]
  );

  // 处理新建按钮点击
  const handleCreateClick = (type: string): void => {
    onCreate?.(type);
  };

  const handleTabClick = (type: string): void => {
    if (type === currentTab) {
      return;
    }
    navigate(tabs.find(tab => tab.key === type)?.path as string);
    setCurrentTab(type);
    // 切换tab时清空搜索框
    setSearchValue('');
  };

  const renderTabTitle = (title: string): string => {
    return title.includes('.') ? t(title) : title;
  };

  return (
    <div
      className="mx-auto max-w-[1425px]"
      style={{
        width: '86%',
      }}
    >
      <div className={styles.headerTitle}>
        {t('sidebar.resourceManagement')}
      </div>

      <div className="flex items-center justify-between relative">
        <div className="flex items-center">
          {tabs.map((item, index) => (
            <div
              key={index}
              onClick={() => {
                handleTabClick(item?.key);
              }}
              className={`${styles.headerTab} ${currentTab === item?.key ? styles.headerTabActive : ''}`}
            >
              <span>{renderTabTitle(item?.title)}</span>
            </div>
          ))}
        </div>

        {/* 右侧工具区域 */}
        <div className={styles.toolsContainer}>
          {/* 搜索框 */}
          {currentTabConfig && !currentTabConfig.hideTools && (
            <div className={styles.searchContainer}>
              <RetractableInput
                restrictFirstChar={true}
                onChange={handleSearchDebounce}
                placeholder={t(currentTabConfig.searchPlaceholder || '')}
                value={searchValue}
              />
            </div>
          )}

          {/* 新建按钮 */}
          {currentTabConfig && !currentTabConfig.hideTools && (
            <SpaceButton
              config={{
                key: currentTabConfig.createButtonKey || currentTab,
                text: t(currentTabConfig.createButtonText || ''),
                type: 'primary',
                size: 'small',
                icon: (
                  <img
                    src={ArrowDownIconWhite}
                    alt="arrow-down"
                    style={{ width: 14, height: 14 }}
                  />
                ),
                onClick: () => handleCreateClick(currentTab),
              }}
              className={styles.createButton}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default index;
