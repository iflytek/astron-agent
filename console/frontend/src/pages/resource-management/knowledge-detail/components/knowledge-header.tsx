import { useEffect, type FC } from 'react';
import { Button, Select } from 'antd';
import { ArrowLeftOutlined, FolderOutlined } from '@ant-design/icons';
import { NavLink, useNavigate } from 'react-router-dom';
import globalStore from '@/store/global-store';
import { useTranslation } from 'react-i18next';
import { RepoItem } from '@/types/resource';
import { KnowledgeInfo } from './knowledge-info';
import { resourceStyles as styles } from '../../knowledge-page/resource-surface';
const KnowledgeHeader: FC<{
  knowledgeInfo: RepoItem;
  repoId: string;
  pid: string;
  tag: string;
}> = ({ knowledgeInfo, repoId, pid, tag }) => {
  const { t } = useTranslation();
  const knowledges = globalStore(state => state.knowledges);
  const getKnowledges = globalStore(state => state.getKnowledges);
  const navigate = useNavigate();
  useEffect(() => {
    getKnowledges();
  }, [getKnowledges]);
  const choices = [
    knowledgeInfo,
    ...knowledges.filter(item => item.id !== knowledgeInfo.id),
  ].filter(item => item.id);
  return (
    <header className={styles.detailHeader}>
      <Button
        icon={<ArrowLeftOutlined />}
        aria-label="返回知识库列表"
        onClick={() => navigate('/resource/knowledge')}
      />
      <div className={styles.identity}>
        <FolderOutlined />
        <Select
          aria-label="当前知识库"
          value={knowledgeInfo.id}
          options={choices.map(item => ({ value: item.id, label: item.name }))}
          onChange={value => {
            const item = choices.find(row => row.id === value);
            if (item)
              navigate(
                `/resource/knowledge/detail/${item.id}/document?tag=${item.tag}`,
                { state: { parentId: -1 } }
              );
          }}
        />
      </div>
      {tag !== 'SparkDesk-RAG' && (
        <nav className={styles.tabs} aria-label="知识库详情">
          {[
            ['document', t('knowledge.document')],
            ['hit', t('knowledge.hitTest')],
            ['setting', t('knowledge.settings')],
          ].map(([key, label]) => (
            <NavLink
              key={key}
              to={`/resource/knowledge/detail/${repoId}/${key}?tag=${tag}`}
              state={{ parentId: pid }}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      )}
      <KnowledgeInfo knowledgeInfo={knowledgeInfo} />
    </header>
  );
};
export default KnowledgeHeader;
