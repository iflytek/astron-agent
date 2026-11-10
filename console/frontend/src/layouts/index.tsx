import React, { FC, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import CrashErrorComponent from '@/components/crash-error-component';
import ResourceNavigation from '@/components/resource-navigation';
import Header from '@/components/header';
import useSpaceStore from '@/store/space-store';

const hasHeaderList = [
  'knowledge',
  'database',
  'rpa',
  'skill',
  'sandbox',
  'automation',
];

interface BasicLayoutProps {
  showHeader?: boolean;
}

const BasicLayout: FC<BasicLayoutProps> = ({ showHeader }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const spaceName = useSpaceStore(state => state.spaceName);
  const enterpriseId = useSpaceStore(state => state.enterpriseId);
  const isCatalog = ['/space/agent', '/space/workflows'].includes(
    location.pathname
  );
  const isResource = location.pathname.startsWith('/resource/');
  const isModel = location.pathname.startsWith('/management/model');
  const managementLabel = location.pathname.startsWith('/management/release')
    ? '发布管理'
    : location.pathname.startsWith('/management/platform-account')
      ? '平台账号'
      : location.pathname.startsWith('/management/app') ||
          location.pathname.startsWith('/management/bot-api')
        ? '应用管理'
        : location.pathname.startsWith('/store/agent')
          ? 'Agent 市场'
          : location.pathname === '/space' ||
              location.pathname.startsWith('/space/space-detail') ||
              location.pathname.startsWith('/space/invitations') ||
              location.pathname.startsWith('/enterprise/')
            ? '空间与团队'
            : '';

  // 如果没有显式传入 showHeader，则使用原来的逻辑判断
  const shouldShowHeader =
    showHeader !== undefined
      ? showHeader
      : hasHeaderList.includes(location?.pathname?.split('/')?.pop() as string);

  // 处理搜索功能
  const handleSearch = useCallback((value: string, type: string) => {
    // 这里可以通过事件总线或其他方式通知各个页面进行搜索
    // 由于各个页面的搜索逻辑不同，我们通过自定义事件来传递搜索信息
    const searchEvent = new CustomEvent('headerSearch', {
      detail: { value, type },
    });
    window.dispatchEvent(searchEvent);
  }, []);

  // 处理新建功能
  const handleCreate = useCallback(
    (type: string) => {
      switch (type) {
        case 'plugin': {
          // 插件新建通过模态框处理，触发自定义事件
          const createPluginEvent = new CustomEvent('headerCreatePlugin', {
            detail: { type },
          });
          window.dispatchEvent(createPluginEvent);
          break;
        }
        case 'knowledge': {
          // 知识库新建通过模态框处理，触发自定义事件
          const createEvent = new CustomEvent('headerCreateKnowledge', {
            detail: { type },
          });
          window.dispatchEvent(createEvent);
          break;
        }
        case 'database': {
          // 数据库新建通过模态框处理，触发自定义事件
          const createDbEvent = new CustomEvent('headerCreateDatabase', {
            detail: { type },
          });
          window.dispatchEvent(createDbEvent);
          break;
        }
        case 'rpa': {
          // 数据库新建通过模态框处理，触发自定义事件
          const createRPAEvent = new CustomEvent('headerCreateRPA', {
            detail: { type },
          });
          window.dispatchEvent(createRPAEvent);
          break;
        }
        case 'skill': {
          const createSkillEvent = new CustomEvent('headerCreateSkill', {
            detail: { type },
          });
          window.dispatchEvent(createSkillEvent);
          break;
        }
        case 'automation': {
          const createAutomationEvent = new CustomEvent(
            'headerCreateAutomation',
            {
              detail: { type },
            }
          );
          window.dispatchEvent(createAutomationEvent);
          break;
        }
        default:
          break;
      }
    },
    [navigate]
  );

  return (
    <ErrorBoundary
      onReset={() => {
        window.location.href = '/';
      }}
      FallbackComponent={CrashErrorComponent}
    >
      <div className="console-shell">
        <ResourceNavigation />

        <div className="console-main">
          {(isCatalog || isResource || isModel || managementLabel) && (
            <div className="console-breadcrumb">
              <div>
                <span>
                  {spaceName ||
                    (enterpriseId ? '请选择团队空间' : '我的个人资源')}
                </span>
                <span>/</span>
                <strong>
                  {managementLabel ||
                    (isResource
                      ? '资源管理'
                      : isModel
                        ? '模型管理'
                        : '应用构建')}
                </strong>
              </div>
              <a
                href="https://www.xfyun.cn/doc/spark/Agent01-%E5%B9%B3%E5%8F%B0%E4%BB%8B%E7%BB%8D.html"
                target="_blank"
                rel="noreferrer"
              >
                使用文档
              </a>
            </div>
          )}
          {shouldShowHeader && !isResource && (
            <Header onSearch={handleSearch} onCreate={handleCreate} />
          )}
          <Outlet />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default BasicLayout;
