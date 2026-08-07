import React, { memo, FC } from 'react';
import { useTranslation } from 'react-i18next';
import { DeleteModal } from './components/modal-component';
import { useNavigate } from 'react-router-dom';
import { usePluginPage } from './hooks/use-plugin-page';
import CardItem from './components/card-item';
import ResourceEmpty from '../resource-empty';
import SiderContainer from '@/components/sider-container';

const PluginPage: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    user,
    tools,
    getTools,
    getToolsDebounce,
    isHovered,
    setIsHovered,
    deleteModal,
    setDeleteModal,
    currentTool,
    setCurrentTool,
    searchValue,
    setSearchValue,
    handleCreatePlugin,
    handleCardClick,
    handleDeleteClick,
  } = usePluginPage();

  return (
    <div className="w-full h-full overflow-hidden">
      {deleteModal && (
        <DeleteModal
          currentTool={currentTool}
          setDeleteModal={setDeleteModal}
          getTools={() => {
            if (searchValue) {
              setSearchValue('');
            } else {
              getTools();
            }
          }}
        />
      )}

      <SiderContainer
        rightContent={
          <div className="w-full h-full">
            {tools.length === 0 ? (
              <ResourceEmpty
                description={
                  searchValue
                    ? t('plugin.noSearchResults')
                    : t('plugin.emptyDescription')
                }
                buttonText={t('plugin.createPlugin')}
                onCreate={handleCreatePlugin}
              />
            ) : (
              <div className="grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-3 gap-6">
                {tools.map((tool: any) => (
                  <CardItem
                    key={tool.id}
                    tool={tool}
                    onCardClick={handleCardClick}
                    onDeleteClick={handleDeleteClick}
                  />
                ))}
              </div>
            )}
          </div>
        }
      />
    </div>
  );
};

export default memo(PluginPage);
