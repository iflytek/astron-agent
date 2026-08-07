import React, { FC } from 'react';
import { RepoItem } from '../../../../types/resource';
import RetractableInput from '@/components/ui/global/retract-table-input';
import ResourceEmpty from '../../resource-empty';
import CardItem from './card-item';
import { useTranslation } from 'react-i18next';

export const KnowledgeContent: FC<{
  knowledgeRef: React.RefObject<HTMLDivElement>;
  isHovered: boolean | null;
  setIsHovered: React.Dispatch<React.SetStateAction<boolean | null>>;
  knowledges: RepoItem[];
  getRobotsDebounce: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setCreateModal: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentKnowledge: React.Dispatch<React.SetStateAction<RepoItem>>;
  folderIcon: string;
}> = ({
  knowledgeRef,
  isHovered,
  setIsHovered,
  knowledges,
  getRobotsDebounce,
  setCreateModal,
  setDeleteModal,
  setCurrentKnowledge,
  folderIcon,
}) => {
  const { t } = useTranslation();
  return (
    <div className="h-full overflow-hidden">
      <div
        className="h-full w-full flex-1"
        ref={knowledgeRef as React.RefObject<HTMLDivElement>}
      >
        {knowledges?.length === 0 ? (
          <ResourceEmpty
            description={t('knowledge.emptyDescription')}
            buttonText={t('knowledge.createNewKnowledge')}
            onCreate={() => {
              setCreateModal(true);
            }}
          />
        ) : (
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-3 gap-6">
            {knowledges.map(k => (
              <CardItem
                key={k.id}
                knowledge={k}
                onDelete={knowledge => {
                  setCurrentKnowledge(knowledge);
                  setDeleteModal(true);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
