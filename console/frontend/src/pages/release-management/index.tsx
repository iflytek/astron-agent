import React, { Suspense, ReactElement } from 'react';
import { Spin } from 'antd';
import { Routes, Route } from 'react-router-dom';
import styles from './index.module.scss';

// NOTE: 发布管理布局页及 指令型、工作流列表页
const ReleasedPage = React.lazy(() => import('./released-page'));
const AgentList = React.lazy(() => import('./agent-list'));
const ApprovalList = React.lazy(() => import('./approval-list'));

// NOTE: 工作流详情布局页及 详情页、日志页
const DetailListPage = React.lazy(() => import('./detail-list-page'));
const DetailOverview = React.lazy(() => import('./detail-overview'));
const TracePage = React.lazy(() => import('./trace-logs'));

export default function Index(): ReactElement {
  return (
    <div
      className={styles.PublicContent}
      // style={{ width: "calc(100% - 262px)", margin: "0 auto" }}
    >
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <Spin />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<ReleasedPage />}>
            <Route index element={<AgentList AgentType="all" />} />
            <Route path="all" element={<AgentList AgentType="all" />} />
            <Route path="agent" element={<AgentList AgentType="agent" />} />
            <Route
              path="workflow"
              element={<AgentList AgentType="workflow" />}
            />
            <Route path="virtual" element={<AgentList AgentType="virtual" />} />
            <Route path="approval" element={<ApprovalList />} />
          </Route>
          <Route path="/detail/:botId" element={<DetailListPage />}>
            <Route index element={<DetailOverview />} />
            <Route path="trace" element={<TracePage />} />
          </Route>
        </Routes>
      </Suspense>
    </div>
  );
}
