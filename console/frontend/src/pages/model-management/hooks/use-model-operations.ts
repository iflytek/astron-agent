import { useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import { useModelContext } from '../context/model-context';
import { getAllModels } from '@/services/model';
import { shouldShowRequestError } from '@/utils/http-error';
import { ModelInfo, ModelType, ShelfStatus } from '@/types/model';

/**
 * 模型操作Hook
 * 负责模型的增删改查等基本操作
 */
export const useModelOperations = (
  modelType: ModelType = 1
): {
  refreshModels: () => Promise<void>;
  setModels: (models: ModelInfo[]) => void;
  handleQuickFilter: () => void;
  handleCloseQuickFilter: () => void;
  handleCreateModel: () => void;
  handleEditModel: (modelId: number) => void;
  handleDeleteModel: (modelId: number) => void;
  handleCloseCreateModal: () => void;
  handleCloseDeleteModal: () => void;
  handleModelSaveSuccess: () => void;
  handleModelDeleteSuccess: () => void;
} => {
  const { state, actions, modelRequest } = useModelContext();
  const ownedRequest = useRef<AbortController | null>(null);
  const activeScope = useRef<{ type: ModelType; filter: number } | null>(null);
  useEffect(() => {
    activeScope.current = { type: modelType, filter: state.filterType };
    return (): void => {
      activeScope.current = null;
      ownedRequest.current?.abort();
    };
  }, [modelType, state.filterType]);

  // 刷新模型列表
  const refreshModels = useCallback(async (): Promise<void> => {
    // A completed card action may still hold a callback from an old filter or
    // an unmounted page. It must not cancel the current initialization.
    if (
      activeScope.current?.type !== modelType ||
      activeScope.current.filter !== state.filterType
    ) {
      return;
    }
    modelRequest.current?.abort();
    const controller = new AbortController();
    modelRequest.current = controller;
    ownedRequest.current = controller;
    try {
      actions.setLoading(true);

      const records = await getAllModels(
        {
          type: modelType,
          filter: modelType === 2 ? (state.filterType ?? 0) : 0,
        },
        controller.signal
      );
      if (controller.signal.aborted) return;

      actions.setModels(records);

      // 更新即将下架的模型
      const willBeRemoved = records.filter(
        m => m.shelfStatus === ShelfStatus.WAIT_OFF_SHELF
      );
      actions.setShelfOffModels(willBeRemoved);
    } catch (error) {
      if (controller.signal.aborted) return;
      // HTTP/business errors are already displayed by the shared interceptor.
      if (shouldShowRequestError(error)) {
        message.error(
          error instanceof Error ? error.message : '模型列表加载失败'
        );
      }
    } finally {
      if (!controller.signal.aborted) actions.setLoading(false);
    }
  }, [modelType, state.filterType, actions, modelRequest]);

  // 快速筛选即将下架的模型
  const handleQuickFilter = useCallback((): void => {
    actions.setShowShelfOnly(true);
    sessionStorage.setItem(
      modelType === 1 ? 'officialModelQueckFilter' : 'personalModelQueckFilter',
      '1'
    );
  }, [modelType, actions]);

  // 关闭快速筛选
  const handleCloseQuickFilter = useCallback((): void => {
    actions.setShowShelfOnly(false);
    if (modelType === 1) {
      sessionStorage.removeItem('officialModelQueckFilter');
    } else {
      sessionStorage.removeItem('personalModelQueckFilter');
    }
  }, [modelType, actions]);

  // 打开创建模型弹窗
  const handleCreateModel = useCallback((): void => {
    actions.setCurrentEditModel(undefined);
    actions.setCreateModal(true);
  }, [actions]);

  // 打开编辑模型弹窗
  const handleEditModel = useCallback(
    (modelId: number): void => {
      const model = state.models.find(m => m.id === modelId);
      if (model) {
        actions.setCurrentEditModel(model);
        actions.setCreateModal(true);
      }
    },
    [state.models, actions]
  );

  // 打开删除模型弹窗
  const handleDeleteModel = useCallback(
    (modelId: number): void => {
      const model = state.models.find(m => m.id === modelId);
      if (model) {
        actions.setCurrentEditModel(model);
        actions.setDeleteModal(true);
      }
    },
    [state.models, actions]
  );

  // 关闭创建/编辑弹窗
  const handleCloseCreateModal = useCallback((): void => {
    actions.setCreateModal(false);
    actions.setCurrentEditModel(undefined);
  }, [actions]);

  // 关闭删除弹窗
  const handleCloseDeleteModal = useCallback((): void => {
    actions.setDeleteModal(false);
    actions.setCurrentEditModel(undefined);
  }, [actions]);

  // 模型创建/更新成功后的回调
  const handleModelSaveSuccess = useCallback((): void => {
    handleCloseCreateModal();
    refreshModels();
  }, [handleCloseCreateModal, refreshModels]);

  // 模型删除成功后的回调
  const handleModelDeleteSuccess = useCallback((): void => {
    handleCloseDeleteModal();
    refreshModels();
  }, [handleCloseDeleteModal, refreshModels]);

  // 设置模型列表（用于兼容原有组件）
  const setModels = useCallback(
    (models: ModelInfo[]): void => {
      actions.setModels(models);
    },
    [actions]
  );

  return {
    // 数据操作
    refreshModels,
    setModels,

    // 筛选操作
    handleQuickFilter,
    handleCloseQuickFilter,

    // 模型操作
    handleCreateModel,
    handleEditModel,
    handleDeleteModel,

    // 弹窗控制
    handleCloseCreateModal,
    handleCloseDeleteModal,

    // 成功回调
    handleModelSaveSuccess,
    handleModelDeleteSuccess,
  };
};
