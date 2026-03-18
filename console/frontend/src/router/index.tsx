import Loading from '@/components/loading';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '@/layouts/index';
import ConfigPage from '@/pages/config-page';

const CallbackPage = lazy(() => import('@/pages/callback'));
const HomePage = lazy(() => import('@/pages/home-page'));
const StorePlugin = lazy(() => import('@/pages/plugin-store'));
const ToolSquareDetail = lazy(() => import('@/pages/plugin-store/detail'));
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

const ChatPage = lazy(() => import('@/pages/chat-page'));
const PersonalSpace = lazy(() => import('@/pages/space/personal'));
const SpaceDetail = lazy(() => import('@/pages/space/space-detail'));
const EnterpriseSpace = lazy(() => import('@/pages/space/enterprise'));
const SpacePage = lazy(() => import('@/pages/space-page'));
const TeamCreate = lazy(() => import('@/pages/space/team-create'));
// const SmartRedirect = lazy(() => import('@/pages/smart-redirect'));
const ReleaseManagement = lazy(() => import('@/pages/release-management'));
const BotApi = lazy(() => import('@/pages/bot-api/api'));
const SharePage = lazy(() => import('@/pages/share-page'));
const AppListPage = lazy(() => import('@/pages/bot-api/app-list'));

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
        element: <Navigate to="/home" />,
      },
      {
        path: '/home',
        element: (
          <Suspense fallback={<Loading />}>
            <HomePage />
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
  {
    path: '/callback',
    element: (
      <Suspense fallback={<Loading />}>
        <CallbackPage />
      </Suspense>
    ),
  },
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
            <StorePlugin />
          </Suspense>
        ),
      },
      {
        path: '/store/plugin/:id',
        element: (
          <Suspense fallback={<Loading />}>
            <ToolSquareDetail />
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
