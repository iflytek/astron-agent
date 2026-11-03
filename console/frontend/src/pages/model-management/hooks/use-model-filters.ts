import { useMemo, useCallback } from 'react';
import { useModelContext } from '../context/model-context';
import { ModelInfo, CategoryNode, ShelfStatus } from '@/types/model';
import { getModelProviderFromInfo } from '../utils/provider';

export const useModelFilters = (): {
  filteredModels: ModelInfo[];
  checkedLeaves: CategoryNode[];
  contextLength?: number;
  contextMaxLength?: number;
  searchInput: string;
  filterType: number;
  providerFilter: string;
  showShelfOnly: boolean;
  handleCategorySelect: (checkedLeaves: CategoryNode[]) => void;
  handleContextLengthChange: (length?: number) => void;
  handleSearchInputChange: (value: string) => void;
  handleFilterTypeChange: (type: number) => void;
  handleProviderFilterChange: (provider?: string) => void;
  handleSetContextMaxLength: (length: number) => void;
} => {
  const { state, actions } = useModelContext();

  const treeContainsAnyLeaf = useCallback(
    (node: CategoryNode, required: Set<string>): boolean => {
      if (!node.children?.length) {
        return required.has(node.name);
      }

      return node.children.some((child: CategoryNode) =>
        treeContainsAnyLeaf(child, required)
      );
    },
    []
  );

  const treeContainsContextLengthGreaterThan = useCallback(
    (node: CategoryNode, val: number): boolean => {
      if (!node.children?.length) {
        if (node.key !== 'contextLengthTag') return false;

        const matchedNumber = String(node.name).match(/(\d+)/);
        const numericValue = matchedNumber ? Number(matchedNumber[1]) : 0;
        return numericValue <= val;
      }

      return node.children.some((child: CategoryNode) =>
        treeContainsContextLengthGreaterThan(child, val)
      );
    },
    []
  );

  const filterModels = useCallback(
    (
      models: ModelInfo[],
      checkedLeaves: CategoryNode[],
      contextLength?: number
    ): ModelInfo[] => {
      let filtered = models;

      const offShelfNode = checkedLeaves.find(node => node.id === -1);
      const toBeOffShelfNode = checkedLeaves.find(node => node.id === -2);

      if (offShelfNode || toBeOffShelfNode) {
        filtered = filtered.filter(model => {
          if (offShelfNode && model.shelfStatus === ShelfStatus.OFF_SHELF) {
            return true;
          }

          if (
            toBeOffShelfNode &&
            model.shelfStatus === ShelfStatus.WAIT_OFF_SHELF
          ) {
            return true;
          }

          return false;
        });
      }

      const realLeaves = checkedLeaves.filter(
        node => node.id !== -1 && node.id !== -2 && node.name !== '多语言'
      );

      if (realLeaves.length) {
        const requiredNames = new Set(realLeaves.map(node => node.name));
        filtered = filtered.filter(model =>
          model.categoryTree?.some((tree: CategoryNode) =>
            treeContainsAnyLeaf(tree, requiredNames)
          )
        );
      }

      if (
        contextLength != null &&
        contextLength !== 0 &&
        contextLength !== state.contextMaxLength
      ) {
        filtered = filtered.filter(model =>
          model.categoryTree?.some((tree: CategoryNode) =>
            treeContainsContextLengthGreaterThan(tree, contextLength)
          )
        );
      }

      return filtered;
    },
    [
      state.contextMaxLength,
      treeContainsAnyLeaf,
      treeContainsContextLengthGreaterThan,
    ]
  );

  const filteredModels = useMemo(() => {
    let models = state.showShelfOnly ? state.shelfOffModels : state.models;

    models = filterModels(models, state.checkedLeaves, state.contextLength);

    if (state.searchInput.trim()) {
      const searchLower = state.searchInput.toLowerCase();
      models = models.filter(model =>
        model.name.toLowerCase().includes(searchLower)
      );
    }

    if (state.providerFilter) {
      models = models.filter(
        model => getModelProviderFromInfo(model) === state.providerFilter
      );
    }

    return models;
  }, [
    filterModels,
    state.checkedLeaves,
    state.contextLength,
    state.models,
    state.providerFilter,
    state.searchInput,
    state.showShelfOnly,
    state.shelfOffModels,
  ]);

  const handleCategorySelect = useCallback(
    (checkedLeaves: CategoryNode[]): void => {
      actions.setCheckedLeaves(checkedLeaves);
    },
    [actions]
  );

  const handleContextLengthChange = useCallback(
    (length?: number): void => {
      actions.setContextLength(length);
    },
    [actions]
  );

  const handleSearchInputChange = useCallback(
    (value: string): void => {
      actions.setSearchInput(value);
    },
    [actions]
  );

  const handleFilterTypeChange = useCallback(
    (type: number): void => {
      actions.setFilterType(type);
    },
    [actions]
  );

  const handleProviderFilterChange = useCallback(
    (provider?: string): void => {
      actions.setProviderFilter(provider || '');
    },
    [actions]
  );

  const handleSetContextMaxLength = useCallback(
    (length: number): void => {
      actions.setContextMaxLength(length);
    },
    [actions]
  );

  return {
    filteredModels,
    checkedLeaves: state.checkedLeaves,
    contextLength: state.contextLength,
    contextMaxLength: state.contextMaxLength,
    searchInput: state.searchInput,
    filterType: state.filterType,
    providerFilter: state.providerFilter,
    showShelfOnly: state.showShelfOnly,
    handleCategorySelect,
    handleContextLengthChange,
    handleSearchInputChange,
    handleFilterTypeChange,
    handleProviderFilterChange,
    handleSetContextMaxLength,
  };
};
