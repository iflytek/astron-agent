import { RepoItem } from '@/types/resource';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export const KnowledgeInfo: FC<{
  knowledgeInfo: RepoItem;
}> = ({ knowledgeInfo }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isHover, setIsHover] = useState(false);
  return (
    <div className="w-1/4 h-10 flex justify-end">
      {knowledgeInfo?.bots?.length > 0 && (
        <div className="flex items-center">
          <div className="flex items-center text-sm">
            <span>{knowledgeInfo?.bots?.length}</span>
            <span className="text-[#757575]">
              &nbsp;{t('knowledge.relatedApplications')}
            </span>
            <div
              className="flex p-1 rounded-xl ml-3"
              style={{
                background: isHover ? '#8299FF' : '',
              }}
            >
              <div
                className="flex items-center relative h-8 cursor-pointer transition-all"
                style={{
                  width: isHover
                    ? 36 * knowledgeInfo?.bots?.length + 4
                    : 20 * knowledgeInfo?.bots?.length + 12,
                }}
                onMouseEnter={() => setIsHover(true)}
                onMouseLeave={() => setIsHover(false)}
              >
                {knowledgeInfo?.bots?.map((item, index) => (
                  <div
                    key={item.id as string}
                    className="flex items-center justify-center w-8 h-8 absolute transition-all"
                    style={{
                      border: '1px solid #e2e8ff',
                      borderRadius: '10px',
                      boxShadow: '-2px 0px 8px 0px rgba(0,0,0,0.10)',
                      background: item.color as string,
                      right: isHover
                        ? (knowledgeInfo?.bots?.length - 1 - index) * 36 + 4
                        : (knowledgeInfo?.bots?.length - 1 - index) * 20,
                      top: 0,
                    }}
                    onClick={() => {
                      navigate(`/space/bot/${item.id}/chat`);
                    }}
                  >
                    <img
                      src={
                        ((item.address as string) + item.avatarIcon) as string
                      }
                      className="w-5 h-5"
                      alt=""
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
