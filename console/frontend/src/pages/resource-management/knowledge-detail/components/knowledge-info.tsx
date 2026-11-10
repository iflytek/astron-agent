import { RepoItem } from '@/types/resource';
import { type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
export const KnowledgeInfo: FC<{ knowledgeInfo: RepoItem }> = ({
  knowledgeInfo,
}) => {
  const { t } = useTranslation();
  return knowledgeInfo.bots?.length > 0 ? (
    <div className="flex items-center flex-wrap gap-2 min-w-0 text-sm text-[#607089]">
      <span>
        {knowledgeInfo.bots.length} {t('knowledge.relatedApplications')}
      </span>
      {knowledgeInfo.bots.map(item => (
        <Link
          key={item.id as string}
          to={`/space/bot/${item.id}/chat`}
          aria-label={`打开关联应用 ${item.id}`}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#dfe6f1]"
        >
          <img
            src={`${item.address}${item.avatarIcon}`}
            alt=""
            className="w-5 h-5"
          />
        </Link>
      ))}
    </div>
  ) : null;
};
