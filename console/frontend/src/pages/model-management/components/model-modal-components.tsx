import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useModelContext } from '../context/model-context';
import { useModelOperations } from '../hooks/use-model-operations';
import { CreateModal, DeleteModal } from './modal-component';
import { getCategoryTree } from '@/services/model';
import { CategoryNode, ModelType } from '@/types/model';

/**
 * 模型管理弹窗组件集合
 * 统一管理所有弹窗的显示状态
 */
interface ModelModalComponentsProps {
  modelType?: ModelType;
}

const ModelModalComponents: React.FC<ModelModalComponentsProps> = ({
  modelType = ModelType.OFFICIAL,
}) => {
  const { t } = useTranslation();
  const { state } = useModelContext();
  const operations = useModelOperations(modelType);

  // 分类树兜底：部分入口（例如个人模型列表为空时的「新建模型」）不会填充
  // state.categoryList，这里按需从接口补取，避免「模型类别」下拉为空导致必填项无法通过
  const [fetchedCategoryTree, setFetchedCategoryTree] = useState<
    CategoryNode[]
  >([]);

  useEffect(() => {
    if (!state.createModalOpen || state.categoryList.length > 0) {
      return;
    }

    getCategoryTree()
      .then(data => setFetchedCategoryTree(data))
      .catch(() => setFetchedCategoryTree([]));
  }, [state.createModalOpen, state.categoryList]);

  const categoryTree =
    state.categoryList.length > 0 ? state.categoryList : fetchedCategoryTree;

  return (
    <>
      {/* 创建/编辑模型弹窗 */}
      {state.createModalOpen && (
        <CreateModal
          setCreateModal={operations.handleCloseCreateModal}
          getModels={operations.refreshModels}
          modelId={state.currentEditModel?.modelId.toString()}
          categoryTree={categoryTree}
        />
      )}

      {/* 删除模型弹窗 */}
      {state.deleteModalOpen && state.currentEditModel && (
        <DeleteModal
          currentModel={state.currentEditModel}
          setDeleteModal={operations.handleCloseDeleteModal}
          getModels={operations.refreshModels}
          msg={t('model.deleteConfirmMessage')}
        />
      )}
    </>
  );
};

export default ModelModalComponents;
