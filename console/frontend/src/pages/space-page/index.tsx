import React, { Suspense, memo } from 'react';
import { Spin } from 'antd';
import { Routes, Route } from 'react-router-dom';

const AgentPage = React.lazy(() => import('./agent-page'));

function index() {
  return (
    <div className="w-full h-full overflow-hidden">
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <Spin />
          </div>
        }
      >
        <Routes>
          <Route path="/agent" element={<AgentPage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default memo(index);
