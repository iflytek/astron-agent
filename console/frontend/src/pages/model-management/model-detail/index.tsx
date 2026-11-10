import React, { memo, useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Alert, Button, Skeleton } from 'antd';
import styles from '../model-workspace.module.scss';
import { getModelDetail } from '@/services/model';
import dayjs from 'dayjs';
import ModelDetailHeader from './components/model-detail-header';
import ModelInfoDisplay from './components/model-info-display';
import ModelConfigSection from './components/model-config-section';
import {
  ModelInfo,
  CategoryNode,
  ModelConfigParam,
  LLMSource,
} from '@/types/model';

import { v4 as uuid } from 'uuid';

// 辅助函数
function collectNames(nodes: CategoryNode[] = []): string[] {
  const res: string[] = [];
  function dfs(list: CategoryNode[]): void {
    list.forEach(item => {
      res.push(item.name);
      if (item.children?.length) {
        dfs(item.children);
      }
    });
  }
  dfs(nodes);
  return res;
}

const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const checkNameConventions = (string: string): boolean => {
  const regex = /^[a-zA-Z0-9_-]+$/;
  return regex.test(string);
};

const maskKey = (key = ''): string =>
  key.length <= 8
    ? key.replace(/./g, '*') // 太短直接全打码
    : `${key.slice(0, 4)}******${key.slice(-4)}`;

function index(): React.JSX.Element {
  const { state } = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const llmSource = searchParams.get('llmSource');
  const modelIcon = searchParams.get('modelIcon');
  const [modelDetail, setModelDetail] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  /* 控制提示框是否已手动关闭 */
  const [closed, setClosed] = useState(false);

  const model = state?.model;

  const bottomTexts = state?.bottomTexts || [];

  const [modelParams, setModelParams] = useState<ModelConfigParam[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setModelDetail(null);
    setModelParams([]);
    const params = {
      modelId: id ? parseInt(id, 10) : undefined,
      llmSource: llmSource ? parseInt(llmSource, 10) : undefined,
    };

    getModelDetail(params)
      .then(data => {
        if (!active) return;
        if (!data) throw new Error('未找到该模型');
        if (data) {
          setModelDetail({
            ...data,
            updateTime: data?.updateTime
              ? dayjs(data.updateTime).format('YYYY-MM-DD HH:mm:ss')
              : '',
          });

          if (data?.llmSource === LLMSource.CUSTOM) {
            setModelParams(
              (data.config ? JSON.parse(data.config) : [])?.map(
                (item: ModelConfigParam) => ({
                  ...item,
                  id: uuid(),
                  min: item?.constraintContent?.[0]?.name,
                  max: item?.constraintContent?.[1]?.name,
                })
              )
            );
          }
        }
      })
      .catch((error: unknown) => {
        if (active)
          setError(error instanceof Error ? error.message : '模型详情加载失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return (): void => {
      active = false;
    };
  }, [id, llmSource, revision]);

  const modelCategoryTags = useMemo(() => {
    const tags: string[] = [];
    ['modelCategory'].forEach(key => {
      let categoryTree: CategoryNode[] = [];
      if (model && model.categoryTree) {
        categoryTree = model.categoryTree;
      } else if (modelDetail?.categoryTree) {
        categoryTree = modelDetail.categoryTree;
      }
      const node = categoryTree?.find((n: CategoryNode) => n.key === key);
      if (node) {
        tags.push(...collectNames(node.children));
      }
    });
    return tags.filter((v, i, arr) => arr.indexOf(v) === i);
  }, [modelDetail, model]);

  const modelScenarioTags = useMemo(() => {
    const tags: string[] = [];
    ['modelScenario'].forEach(key => {
      let categoryTree: CategoryNode[] = [];
      if (model && model.categoryTree) {
        categoryTree = model.categoryTree;
      } else if (modelDetail?.categoryTree) {
        categoryTree = modelDetail.categoryTree;
      }
      const node = categoryTree?.find((n: CategoryNode) => n.key === key);
      if (node) {
        tags.push(...collectNames(node.children));
      }
    });
    return tags.filter((v, i, arr) => arr.indexOf(v) === i);
  }, [modelDetail, model]);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <ModelDetailHeader
          modelDetail={modelDetail}
          closed={closed}
          setClosed={setClosed}
          formatDate={formatDate}
        />
        {loading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : error ? (
          <Alert
            className={styles.feedback}
            type="error"
            showIcon
            message="模型详情加载失败"
            description={error}
            action={
              <Button onClick={() => setRevision(value => value + 1)}>
                重试
              </Button>
            }
          />
        ) : (
          <div className={styles.detail}>
            <ModelInfoDisplay
              modelDetail={modelDetail}
              modelIcon={modelIcon}
              modelCategoryTags={modelCategoryTags}
              modelScenarioTags={modelScenarioTags}
              bottomTexts={bottomTexts}
              llmSource={llmSource}
            />

            <ModelConfigSection
              modelDetail={modelDetail}
              llmSource={llmSource}
              modelParams={modelParams}
              setModelParams={setModelParams}
              checkNameConventions={checkNameConventions}
              maskKey={maskKey}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(index);
