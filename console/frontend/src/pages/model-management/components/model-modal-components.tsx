import React from 'react';
import { useTranslation } from 'react-i18next';
import { useModelContext } from '../context/model-context';
import { useModelOperations } from '../hooks/use-model-operations';
import { CreateModal, DeleteModal } from './modal-component';
import { ModelType } from '@/types/model';

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

  return (
    <>
      {/* 创建/编辑模型弹窗 */}
      {state.createModalOpen && (
        <CreateModal
          setCreateModal={operations.handleCloseCreateModal}
          getModels={operations.refreshModels}
          modelId={state.currentEditModel?.modelId.toString()}
          categoryTree={state.categoryList}
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
