import React, { useEffect, useState, FC } from 'react';
import { Routes, Route, useLocation, useSearchParams } from 'react-router-dom';
import { getKnowledgeDetail } from '@/services/knowledge';

import KnowledgeHeader from './components/knowledge-header';

import DocumentPage from './document-page';
import HitPage from './hit-page';
import SettingPage from './setting-page';
import SegmentationPage from './segmentation-page';
import FilePage from './file-page';
import { RepoItem } from '../../../types/resource';
import { getRouteId } from '@/utils/utils';

const KnowledgeDetail: FC = () => {
  const [searchParams] = useSearchParams();
  const tag = searchParams.get('tag');
  const repoId = getRouteId();
  const location = useLocation();
  const pid = location.state?.parentId || -1;
  const [knowledgeInfo, setKnowledgeInfo] = useState<RepoItem>({} as RepoItem);

  useEffect(() => {
    tag && initData();
  }, [location, tag]);

  function initData(): void {
    getKnowledgeDetail(repoId, tag || '').then((data: RepoItem) => {
      setKnowledgeInfo(data);
    });
  }

  return (
    <div className="flex flex-col w-full h-full gap-6 px-6">
      <KnowledgeHeader
        repoId={repoId}
        pid={pid}
        tag={tag || ''}
        knowledgeInfo={knowledgeInfo}
      />
      <div className="flex-1 w-full h-full pb-6 overflow-hidden">
        <Routes>
          <Route
            path="/:id/document"
            element={<DocumentPage tag={tag || ''} repoId={repoId} pid={pid} />}
          />
          <Route path="/:id/hit" element={<HitPage repoId={repoId} />} />
          <Route
            path="/:id/setting"
            element={
              <SettingPage
                repoId={repoId}
                knowledgeInfo={knowledgeInfo}
                initData={initData}
              />
            }
          />
          <Route path="/:id/file" element={<FilePage />} />
          <Route path="/:id/segmentation" element={<SegmentationPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default KnowledgeDetail;
