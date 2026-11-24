import React, { FC, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Alert } from 'antd';
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
  const isResource = location.pathname.startsWith('/resource/');
  const { enterpriseId, spaceId } = useSpaceStore();
  const requiresSpace =
    isResource ||
    /^\/management\/(model|release)(\/|$)/.test(location.pathname) ||
    ['/management/bot-api', '/space/agent', '/space/workflows'].includes(
      location.pathname
    );
  const needsSpace = Boolean(enterpriseId && !spaceId && requiresSpace);

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
          {shouldShowHeader && !isResource && !needsSpace && (
            <Header onSearch={handleSearch} onCreate={handleCreate} />
          )}
          {needsSpace ? (
            <Alert
              className="m-4"
              type="info"
              showIcon
              message="请从侧栏选择团队空间"
              action={
                <Link to={`/enterprise/${enterpriseId}/space`}>
                  查看团队空间
                </Link>
              }
            />
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default BasicLayout;
