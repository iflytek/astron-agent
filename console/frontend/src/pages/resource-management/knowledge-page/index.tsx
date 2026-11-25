import { memo, type FC } from 'react';
import { Button } from 'antd';
import { DeleteModal, CreateModal } from './components/modal-component';
import { useKnowledgePage } from './hooks/use-knowledge-page';
import CardItem from './components/card-item';
import { ResourceCatalog, resourceStyles as styles } from './resource-surface';

const KnowledgePage: FC = () => {
  const page = useKnowledgePage();
  return (
    <>
      <ResourceCatalog
        title="知识库"
        description="管理知识文档与检索配置，为 Agent 和工作流提供参考内容。"
        search={page.searchValue}
        onSearch={page.search}
        onCreate={page.create}
        createText="新建知识库"
        onRefresh={page.getKnowledges}
        loading={page.isLoading}
        error={page.error}
        empty={!page.knowledges.length}
      >
        <div className={styles.grid}>
          {page.knowledges.map(knowledge => (
            <CardItem
              key={knowledge.id}
              knowledge={knowledge}
              onDelete={item => {
                page.setCurrentKnowledge(item);
                page.setDeleteModal(true);
              }}
            />
          ))}
        </div>
        {page.hasMore && (
          <div className={styles.more}>
            <Button loading={page.isLoading} onClick={page.loadMore}>
              加载更多
            </Button>
          </div>
        )}
      </ResourceCatalog>
      {page.deleteModal && (
        <DeleteModal
          setDeleteModal={page.setDeleteModal}
          currentKnowledge={page.currentKnowledge}
          getKnowledges={page.getKnowledges}
        />
      )}
      {page.createModal && <CreateModal setCreateModal={page.setCreateModal} />}
    </>
  );
};
export default memo(KnowledgePage);
