import { useEffect } from 'react';
import { useModelContext } from '../context/model-context';
import { getModelList } from '@/services/model';
import {
  ModelFilterParams,
  ModelInfo,
  CategoryNode,
  ShelfStatus,
  ModelType,
  CategorySource,
} from '@/types/model';

/**
 * 模型初始化Hook
 * 专门负责页面初始化时的数据加载
 */
export const useModelInitializer = (
  modelType: ModelType = ModelType.OFFICIAL
): void => {
  const { state, actions } = useModelContext();

  // 构建分类树
  const buildMergedTree = (list: ModelInfo[]): CategoryNode[] => {
    // key -> {一级节点, childMap}
    const map = new Map<
      string,
      { root: CategoryNode; childMap: Map<number, CategoryNode> }
    >();

    // 遍历所有 categoryTree
    for (const item of list) {
      if (!item.categoryTree) continue;
      for (const node of item.categoryTree) {
        if (
          node.key === 'modelCategory' ||
          node.key === 'languageSupport' ||
          node.key === 'contextLengthTag' ||
          node.key === 'modelProvider' ||
          node.key === 'modelScenario'
        ) {
          // 初始化一级节点
          if (!map.has(node.key)) {
            map.set(node.key, {
              root: {
                id: node.id,
                key: node.key,
                name:
                  node.key === 'contextLengthTag' ? '上下文长度' : node.name,
                sortOrder: node.sortOrder,
                children: [],
                source: CategorySource.SYSTEM,
              },
              childMap: new Map(),
            });
          }

          // 合并 children（按 id 去重）
          const mapEntry = map.get(node.key);
          if (!mapEntry) continue;
          const { childMap } = mapEntry;
          for (const child of node.children) {
            childMap.set(child.id, {
              ...child,
              source: CategorySource.SYSTEM,
              children: child.children || [],
            });
          }
        }
      }
    }

    // 组装 children 并返回
    return Array.from(map.values())
      .map(({ root, childMap }) => {
        root.children = Array.from(childMap.values()).sort(
          (a, b) => a.id - b.id
        );
        return root;
      })
      .sort((a, b) => b.sortOrder - a.sortOrder);
  };

  // 初始化加载数据
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        actions.setLoading(true);

        const params: ModelFilterParams = {
          type: modelType,
          page: 1,
          pageSize: 9999,
          name: state.searchInput || '',
          filter: modelType === 2 ? state.filterType : 0,
        };

        const data = await getModelList(params);
        const records = data?.records ?? [];

        // 设置模型列表
        actions.setModels(records);

        // 设置即将下架的模型
        const willBeRemoved = records.filter(
          m => m.shelfStatus === ShelfStatus.WAIT_OFF_SHELF
        );
        actions.setShelfOffModels(willBeRemoved);

        // 只有官方模型需要构建分类树
        if (modelType === 1) {
          const trees = buildMergedTree(records);
          actions.setCategoryList(trees);
        }
      } catch (error) {
        actions.setModels([]);
        actions.setShelfOffModels([]);
        if (modelType === 1) {
          actions.setCategoryList([]);
        }
      } finally {
        actions.setLoading(false);
      }
    };

    loadData();
  }, [modelType, state.filterType, actions]);

  // 从sessionStorage恢复状态（仅官方模型）
  useEffect(() => {
    if (modelType !== 1) return;

    try {
      const cached = JSON.parse(
        sessionStorage.getItem('officialModelFilter') || '{}'
      );

      if (cached.checkedLeaves) {
        actions.setCheckedLeaves(cached.checkedLeaves);
      }
      if (cached.contextLength !== undefined) {
        actions.setContextLength(cached.contextLength);
      }
      if (cached.searchInput) {
        actions.setSearchInput(cached.searchInput);
      }
    } catch {
      // 忽略解析错误
    }

    try {
      const showShelfOnly =
        sessionStorage.getItem('officialModelQueckFilter') === '1';
      actions.setShowShelfOnly(showShelfOnly);
    } catch {
      // 忽略解析错误
    }
  }, [modelType, actions]);

  // 保存筛选状态到sessionStorage（仅官方模型）
  useEffect(() => {
    if (modelType !== 1) return;

    sessionStorage.setItem(
      'officialModelFilter',
      JSON.stringify({
        checkedLeaves: state.checkedLeaves,
        contextLength: state.contextLength,
        searchInput: state.searchInput,
      })
    );
  }, [modelType, state.checkedLeaves, state.contextLength, state.searchInput]);
};
