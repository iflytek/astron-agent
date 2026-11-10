import React from 'react';
import { Alert, Button, Empty, Skeleton } from 'antd';
import ModelManagementHeader from '../components/model-management-header';
import ModelCardList from '../components/model-card-list';
import ModelModalComponents from '../components/model-modal-components';
import { ModelProvider, useModelContext } from '../context/model-context';
import { useModelInitializer } from '../hooks/use-model-initializer';
import { useModelOperations } from '../hooks/use-model-operations';
import { useModelFilters } from '../hooks/use-model-filters';
import styles from '../model-workspace.module.scss';

const PersonalModelContent: React.FC = () => {
  const { state, actions } = useModelContext();
  useModelInitializer(2);
  const operations = useModelOperations(2);
  const filters = useModelFilters();
  const filtered = Boolean(
    state.searchInput || state.filterType || state.showShelfOnly
  );
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <ModelManagementHeader
          activeTab="personalModel"
          shelfOffModel={state.shelfOffModels}
          searchInput={state.searchInput}
          setSearchInput={filters.handleSearchInputChange}
          refreshModels={operations.handleQuickFilter}
          onReload={() => void operations.refreshModels()}
          filterType={state.filterType}
          setFilterType={filters.handleFilterTypeChange}
          setShowShelfOnly={operations.handleCloseQuickFilter}
        />
        {state.error && (
          <Alert
            className={styles.feedback}
            type="error"
            showIcon
            message="模型列表加载失败"
            description={state.error}
            action={
              <Button onClick={() => void operations.refreshModels()}>
                重试
              </Button>
            }
          />
        )}
        {state.loading && state.models.length === 0 ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : filters.filteredModels.length > 0 ? (
          <ModelCardList
            models={filters.filteredModels}
            keyword={state.searchInput}
            filterType={state.filterType}
            setModels={operations.setModels}
            refreshModels={operations.refreshModels}
            showShelfOnly={state.showShelfOnly}
          />
        ) : (
          !state.error && (
            <Empty
              description={
                filtered
                  ? '没有匹配的模型，请调整搜索或筛选条件。'
                  : '暂无已接入模型，添加模型后可在 Agent 和工作流中使用。'
              }
            >
              {filtered ? (
                <Button
                  onClick={() => {
                    actions.setSearchInput('');
                    actions.setFilterType(0);
                    operations.handleCloseQuickFilter();
                  }}
                >
                  清除搜索与筛选
                </Button>
              ) : (
                <Button type="primary" onClick={operations.handleCreateModel}>
                  新建模型
                </Button>
              )}
            </Empty>
          )
        )}
      </div>
      <ModelModalComponents modelType={2} />
    </div>
  );
};

// 个人模型页面主组件（带Provider）
function PersonalModel(): React.JSX.Element {
  return (
    <ModelProvider>
      <PersonalModelContent />
    </ModelProvider>
  );
}

export default PersonalModel;
