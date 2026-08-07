import { useState, useEffect, useMemo, JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import ModelCard from './model-card';
import { CreateModal } from './modal-component';
import { getCategoryTree } from '@/services/model';
import { ModelInfo, CategoryNode } from '@/types/model';

interface Props {
  models: ModelInfo[];
  /* 是否展示「新建模型」卡片，默认 false */
  showCreate?: boolean;
  keyword: string;
  filterType?: number;
  setModels?: (value: ModelInfo[]) => void;
  refreshModels: () => void;
  showShelfOnly: boolean;
}

function ModelCardList({
  models,
  showCreate = false,
  keyword,
  filterType,
  setModels,
  refreshModels,
  showShelfOnly,
}: Props): JSX.Element {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState<boolean | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [modelId, setModelId] = useState<number | undefined>();
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]); // 个人模型新建时，需要展示的分类标签

  useEffect(() => {
    getCategoryTree()
      .then(data => {
        // 全部模型
        setCategoryTree(data);
      })
      .catch(error => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : t('model.getCategoryTreeFailed');
        message.error(errorMessage);
      });
  }, []);

  const renderList = useMemo(() => {
    const list = [...models];
    if (!keyword) return list;
    if (keyword.trim()) {
      const lower = keyword.toLowerCase();
      return list.filter(m => m.name.toLowerCase().includes(lower));
    }
    return list;
  }, [keyword, models]);

  return (
    <div>
      {/* 卡片网格 */}
      <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3`}>
        {/* 普通模型卡片 */}
        {renderList.map(model => (
          <ModelCard
            key={model.id}
            model={model}
            filterType={filterType}
            categoryTree={categoryTree}
            getModels={refreshModels}
            showShelfOnly={showShelfOnly}
          />
        ))}
      </div>

      {createModal && (
        <CreateModal
          setCreateModal={setCreateModal}
          getModels={refreshModels}
          modelId={modelId?.toString() || ''}
          categoryTree={categoryTree}
          setModels={setModels}
          filterType={filterType}
        />
      )}
    </div>
  );
}

export default ModelCardList;
