import React, { Suspense, JSX } from 'react';
import { Spin } from 'antd';
import { Routes, Route } from 'react-router-dom';

const KnowledgePage = React.lazy(() => import('./knowledge-page'));
const KnowledgeDetail = React.lazy(() => import('./knowledge-detail'));
const UploadPage = React.lazy(() => import('./upload-page'));
const PluginPage = React.lazy(() => import('./plugin-page'));
const PluginDetail = React.lazy(() => import('./plugin-detail'));
const PluginCreate = React.lazy(() => import('./plugin-create'));
const DataBase = React.lazy(() => import('./database'));
const DataBaseDetail = React.lazy(() => import('./database-detail'));
const DataBaseTableAdd = React.lazy(
  () => import('./database-detail/database-table-add')
);
const RpaPage = React.lazy(() => import('./rpa-page'));
const RpaDetail = React.lazy(() => import('./rpa-detail'));
const SkillPage = React.lazy(() => import('./skill-page'));
const AutomationPage = React.lazy(() => import('./automation-page'));
const SandboxPage = React.lazy(() => import('./sandbox-page'));

function ResourceManagement(): JSX.Element {
  return (
    <div className="w-full h-full overflow-hidden">
      <Suspense
        fallback={
          <div className="flex items-center justify-center w-full h-full">
            <Spin />
          </div>
        }
      >
        <Routes>
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/knowledge/detail/*" element={<KnowledgeDetail />} />
          <Route path="/knowledge/upload" element={<UploadPage />} />
          <Route path="/plugin" element={<PluginPage />} />
          <Route path="/plugin/detail/*" element={<PluginDetail />} />
          <Route path="/plugin/create" element={<PluginCreate />} />
          <Route path="/database" element={<DataBase />} />
          <Route path="/database/:id" element={<DataBaseDetail />} />
          <Route path="/database/:id/add" element={<DataBaseTableAdd />} />
          <Route path="/rpa" element={<RpaPage />} />
          <Route path="/rpa/detail/:rpa_id" element={<RpaDetail />} />
          <Route path="/skill" element={<SkillPage />} />
          <Route path="/automation" element={<AutomationPage />} />
          <Route path="/sandbox" element={<SandboxPage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default ResourceManagement;
