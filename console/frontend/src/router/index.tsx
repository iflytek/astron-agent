import Loading from '@/components/loading';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '@/layouts/index';
import ConfigPage from '@/pages/config-page';

const AccountAccess = lazy(() => import('@/pages/account-access'));
const ResourceTools = lazy(
  () => import('@/pages/resource-management/resource-tools')
);
const OfficialModel = lazy(
  () => import('@/pages/model-management/official-model/official-model-home')
);
const PersonalModel = lazy(
  () => import('@/pages/model-management/personal-model/personal-model-home')
);
const ModelDetail = lazy(() => import('@/pages/model-management/model-detail'));
const ResourceManagement = lazy(() => import('@/pages/resource-management'));
const WorkFlow = lazy(() => import('@/pages/workflow'));
const WorkFlowAnalysis = lazy(
  () => import('@/pages/workflow/workflow-analysis')
);
const WorkFlowFiles = lazy(() => import('@/pages/workflow/workflow-files'));

const ChatPage = lazy(() => import('@/pages/chat-page'));
const PersonalSpace = lazy(() => import('@/pages/space/personal'));
const SpaceInvitations = lazy(() => import('@/pages/space/invitations'));
const SpaceDetail = lazy(() => import('@/pages/space/space-detail'));
const EnterpriseSpace = lazy(() => import('@/pages/space/enterprise'));
const SpacePage = lazy(() => import('@/pages/space-page'));
const TeamCreate = lazy(() => import('@/pages/space/team-create'));
// const SmartRedirect = lazy(() => import('@/pages/smart-redirect'));
const ReleaseManagement = lazy(() => import('@/pages/release-management'));
const BotApi = lazy(() => import('@/pages/bot-api/api'));
const SharePage = lazy(() => import('@/pages/share-page'));
const AppListPage = lazy(() => import('@/pages/bot-api/app-list'));
const PlatformAccountManagement = lazy(
  () => import('@/pages/platform-account-management')
);

const routes = [
  {
    path: '/',
    element: (
      <Suspense fallback={<Loading />}>
        <Layout />
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/resource/knowledge" replace />,
      },
      {
        path: '/home',
        element: (
          <Suspense fallback={<Loading />}>
            <Navigate to="/resource/knowledge" replace />
          </Suspense>
        ),
      },
      {
        path: '/management/bot-api',
        element: (
          <Suspense fallback={<Loading />}>
            <BotApi />
            {/* <BotApiPublish /> */}
          </Suspense>
        ),
      },
      {
        path: '/management/release/*',
        element: (
          <Suspense fallback={<Loading />}>
            <ReleaseManagement />
          </Suspense>
        ),
      },
      {
        path: '/management/model',
        element: (
          <Suspense fallback={<Loading />}>
            <OfficialModel />
          </Suspense>
        ),
      },
      {
        path: '/management/model/personalModel',
        element: (
          <Suspense fallback={<Loading />}>
            <PersonalModel />
          </Suspense>
        ),
      },
      {
        path: '/management/model/detail/:id',
        element: (
          <Suspense fallback={<Loading />}>
            <ModelDetail />
          </Suspense>
        ),
      },
      {
        path: '/resource/*',
        element: (
          <Suspense fallback={<Loading />}>
            <ResourceManagement />
          </Suspense>
        ),
      },
      {
        path: '/space/invitations',
        element: (
          <Suspense fallback={<Loading />}>
            <SpaceInvitations />
          </Suspense>
        ),
      },
      // 个人空间管理路由
      {
        path: '/space',
        element: (
          <Suspense fallback={<Loading />}>
            <PersonalSpace />
          </Suspense>
        ),
      },
      {
        path: '/space/space-detail/:spaceId',
        element: (
          <Suspense fallback={<Loading />}>
            <SpaceDetail />
          </Suspense>
        ),
      },
      // 企业空间管理路由
      {
        path: '/enterprise/:enterpriseId/*',
        element: (
          <Suspense fallback={<Loading />}>
            <EnterpriseSpace />
          </Suspense>
        ),
      },
      {
        path: '/management/app',
        element: (
          <Suspense fallback={<Loading />}>
            <AppListPage />
          </Suspense>
        ),
      },
      {
        path: '/management/platform-account',
        element: (
          <Suspense fallback={<Loading />}>
            <PlatformAccountManagement />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/space',
    element: (
      <Suspense fallback={<Loading />}>
        <Layout showHeader={false} />
      </Suspense>
    ),
    children: [
      {
        path: '/space/*',
        element: (
          <Suspense fallback={<Loading />}>
            <SpacePage />
          </Suspense>
        ),
      },
    ],
  },
  ...(['login', 'register', 'reset-password', 'account'] as const).map(
    path => ({
      path: `/${path}`,
      element: (
        <Suspense fallback={<Loading />}>
          <AccountAccess mode={path === 'reset-password' ? 'reset' : path} />
        </Suspense>
      ),
    })
  ),
  {
    path: '/team/create/:type',
    element: (
      <Suspense fallback={<Loading />}>
        <TeamCreate />
      </Suspense>
    ),
  },
  {
    path: '/store',
    element: (
      <Suspense fallback={<Loading />}>
        <Layout showHeader={false} />
      </Suspense>
    ),
    children: [
      {
        path: '/store/plugin',
        element: (
          <Suspense fallback={<Loading />}>
            <ResourceTools market />
          </Suspense>
        ),
      },
      {
        path: '/store/plugin/:id',
        element: (
          <Suspense fallback={<Loading />}>
            <Navigate to="/store/plugin" replace />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/chat/:botId/:version?',
    element: (
      <Suspense fallback={<Loading />}>
        <ChatPage />
      </Suspense>
    ),
  },
  // {
  //   path: '/share',
  //   element: (
  //     <Suspense fallback={<Loading />}>
  //       <SmartRedirect />
  //     </Suspense>
  //   ),
  // },
  {
    path: '/space',
    children: [
      {
        path: '/space/config/*',
        element: <ConfigPage />,
      },
    ],
  },
  {
    path: '/work_flow/:id/arrange',
    element: (
      <Suspense fallback={<Loading />}>
        <WorkFlow />
      </Suspense>
    ),
  },
  {
    path: '/work_flow/:id/overview',
    element: (
      <Suspense fallback={<Loading />}>
        <WorkFlowAnalysis />
      </Suspense>
    ),
  },
  {
    path: '/work_flow/:id/files',
    element: (
      <Suspense fallback={<Loading />}>
        <WorkFlowFiles />
      </Suspense>
    ),
  },
  {
    path: '/sharepage',
    children: [
      {
        path: '/sharepage',
        element: (
          <Suspense fallback={<Loading />}>
            <SharePage />
          </Suspense>
        ),
      },
    ],
  },
];

const router: ReturnType<typeof createBrowserRouter> =
  createBrowserRouter(routes);

export default router;
