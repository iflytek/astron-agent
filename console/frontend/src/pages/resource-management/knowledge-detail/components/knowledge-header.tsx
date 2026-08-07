import { useState, useEffect, useRef, useMemo, FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveKey } from '@/utils/utils';

import globalStore from '@/store/global-store';
import { useTranslation } from 'react-i18next';

import arrowLeft from '@/assets/imgs/knowledge/icon_zhishi_arrow-left.png';
import formSelect from '@/assets/imgs/knowledge/icon_form_select.png';
import folderIcon from '@/assets/imgs/knowledge/folder_icon.svg';
import { RepoItem } from '../../../../types/resource';
import { KnowledgeInfo } from './knowledge-info';

const KnowledgeHeader: FC<{
  knowledgeInfo: RepoItem;
  repoId: string;
  pid: string;
  tag: string;
}> = ({ knowledgeInfo, repoId, pid, tag }) => {
  const { t } = useTranslation();
  const knowledges = globalStore(state => state.knowledges);
  const getKnowledges = globalStore(state => state.getKnowledges);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState<string | undefined>('');
  const [showDropList, setShowDropList] = useState(false);

  useEffect(() => {
    const activeTab = getActiveKey();
    setCurrentTab(activeTab);
  }, [repoId]);
  useEffect(() => {
    getKnowledges();
    document.body.addEventListener('click', clickOutside);
    return (): void => document.body.removeEventListener('click', clickOutside);
  }, []);

  function clickOutside(event: MouseEvent): void {
    if (
      optionsRef.current &&
      !optionsRef.current.contains(event.target as Node)
    ) {
      setShowDropList(false);
    }
  }

  const filterKnowledges = useMemo(() => {
    return knowledges.filter(k => k.id !== knowledgeInfo.id) || [];
  }, [knowledges, knowledgeInfo]);

  return (
    <div
      className="w-full h-[80px] bg-[#fff] border-b border-[#e2e8ff] flex justify-between px-6 py-5"
      style={{
        borderRadius: '0px 0px 24px 24px',
      }}
    >
      <div className="flex w-1/4 items-center gap-2">
        <img
          src={arrowLeft}
          className="w-7 h-7 cursor-pointer"
          alt=""
          onClick={() => navigate('/resource/knowledge')}
        />
        <div
          className="flex items-center gap-2"
          onClick={e => {
            e.stopPropagation();
            filterKnowledges.length > 0 && setShowDropList(true);
          }}
        >
          <div
            className="flex items-center gap-2 relative cursor-pointer rounded-lg py-1 px-1.5"
            style={{
              background: showDropList ? '#F9FAFB' : '',
            }}
          >
            <img
              src={folderIcon}
              className="w-[26px] h-[26px] flex-shrink-0"
              alt=""
            />
            <h1 className="flex-1 text-overflow" title={knowledgeInfo.name}>
              {knowledgeInfo.name}
            </h1>
            {filterKnowledges.length > 0 && (
              <img src={formSelect} className="w-4 h-4" alt="" />
            )}
            {showDropList && (
              <div
                className="w-full absolute  left-0 top-[38px] list-options py-3.5 pt-2 max-h-[255px] overflow-auto bg-[#fff] min-w-[150px] z-50"
                ref={optionsRef}
              >
                {filterKnowledges.map(item => (
                  <div
                    key={item.id}
                    className="w-full px-5 py-2.5 pr-4 text-desc font-medium hover:bg-[#F9FAFB] cursor-pointer flex items-center"
                    onClick={e => {
                      e.stopPropagation();
                      setShowDropList(false);
                      navigate(
                        `/resource/knowledge/detail/${item.id}/document?tag=${item?.tag}`,
                        {
                          state: {
                            parentId: -1,
                          },
                        }
                      );
                    }}
                  >
                    <img
                      src={folderIcon}
                      className="w-[26px] h-[26px]"
                      alt=""
                    />
                    <span
                      className="text-desc font-medium ml-[14px] text-overflow"
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {tag !== 'SparkDesk-RAG' ? (
        <div className="flex w-1/2 items-center gap-6 justify-center">
          <div
            className={`flex items-center px-5 py-2.5 rounded-xl font-medium cursor-pointer  ${
              currentTab === 'document'
                ? 'config-tabs-active'
                : 'config-tabs-normal'
            }`}
            onClick={() => {
              setCurrentTab('document');
              navigate(
                `/resource/knowledge/detail/${repoId}/document?tag=${tag}`,
                {
                  state: {
                    parentId: pid,
                  },
                }
              );
            }}
          >
            <span className="document-icon"></span>
            <span className="ml-2">{t('knowledge.document')}</span>
          </div>
          <div
            className={`flex items-center px-5 py-2.5 rounded-xl font-medium cursor-pointer  ${
              currentTab === 'hit' ? 'config-tabs-active' : 'config-tabs-normal'
            }`}
            onClick={() => {
              setCurrentTab('hit');
              navigate(`/resource/knowledge/detail/${repoId}/hit?tag=${tag}`, {
                state: {
                  parentId: pid,
                },
              });
            }}
          >
            <span className="hit-icon"></span>
            <span className="ml-2">{t('knowledge.hitTest')}</span>
          </div>
          <div
            className={`flex items-center px-5 py-2.5 rounded-xl font-medium cursor-pointer  ${
              currentTab === 'setting'
                ? 'config-tabs-active'
                : 'config-tabs-normal'
            }`}
            onClick={() => {
              setCurrentTab('setting');
              navigate(
                `/resource/knowledge/detail/${repoId}/setting?tag=${tag}`,
                {
                  state: {
                    parentId: pid,
                  },
                }
              );
            }}
          >
            <span className="document-setting"></span>
            <span className="ml-2">{t('knowledge.settings')}</span>
          </div>
        </div>
      ) : (
        <div className="flex w-1/2 items-center"></div>
      )}
      <KnowledgeInfo knowledgeInfo={knowledgeInfo} />
    </div>
  );
};

export default KnowledgeHeader;
