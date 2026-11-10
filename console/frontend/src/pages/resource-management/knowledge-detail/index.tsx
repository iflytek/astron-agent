import React, { useEffect, useState, useRef, useCallback, FC } from 'react';
import { Routes, Route, useLocation, useSearchParams } from 'react-router-dom';
import { Alert, Button, Skeleton } from 'antd';
import { resourceStyles as styles } from '../knowledge-page/resource-surface';
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const initData = useCallback((): void => {
    const id = ++sequence.current;
    setLoading(true);
    setError('');
    void getKnowledgeDetail(repoId, tag || '')
      .then(data => {
        if (sequence.current === id) setKnowledgeInfo(data);
      })
      .catch(failure => {
        if (sequence.current === id)
          setError(
            failure instanceof Error
              ? failure.message
              : '知识库详情加载失败，请重试。'
          );
      })
      .finally(() => {
        if (sequence.current === id) setLoading(false);
      });
  }, [repoId, tag]);
  useEffect(() => {
    setKnowledgeInfo({} as RepoItem);
    initData();
    return () => {
      sequence.current += 1;
    };
  }, [initData]);

  return (
    <div className={styles.detail}>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={<Button onClick={initData}>重试</Button>}
        />
      )}
      {loading && !knowledgeInfo.id ? (
        <Skeleton active />
      ) : !knowledgeInfo.id ? null : (
        <>
          <KnowledgeHeader
            repoId={repoId}
            pid={pid}
            tag={tag || ''}
            knowledgeInfo={knowledgeInfo}
          />
          <div className={styles.detailBody}>
            <Routes>
              <Route
                path="/:id/document"
                element={
                  <DocumentPage tag={tag || ''} repoId={repoId} pid={pid} />
                }
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
        </>
      )}
    </div>
  );
};

export default KnowledgeDetail;
