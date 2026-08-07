import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import back from '@/assets/imgs/common/back.png';
import { DatabaseProvider } from './context/database-context';
import DatabaseSidebar from './components/database-sidebar';
import MainContent from './components/main-content';
import ModalComponents from './components/modal-components';
import { useDatabaseInitializer } from './hooks/use-database-initializer';

/**
 * 返回按钮组件
 */
const BackButton: React.FC = memo(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleBack = (): void => navigate(-1);

  return (
    <button
      className="flex items-center gap-2 mt-6 mb-8 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={handleBack}
      type="button"
    >
      <img src={back} className="w-[18px] h-[18px]" alt="返回" />
      <div className="mr-1 font-medium text-4">{t('database.back')}</div>
      <span className="text-[#7F7F7F] text-[14px]">
        {t('database.database')}
      </span>
    </button>
  );
});

BackButton.displayName = 'BackButton';

/**
 * 数据库详情页面内容组件
 */
const DatabaseDetailContent: React.FC = memo(() => {
  // 初始化数据加载
  useDatabaseInitializer();

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden mx-auto pb-6"
      style={{ width: '85%' }}
    >
      <BackButton />

      {/* 主要内容区域：侧边栏 + 主内容 */}
      <div className="flex items-start flex-1 w-full gap-2 h-[0]">
        <DatabaseSidebar />
        <MainContent />
      </div>

      {/* 弹框组件 */}
      <ModalComponents />
    </div>
  );
});

DatabaseDetailContent.displayName = 'DatabaseDetailContent';

/**
 * 数据库详情页面
 * 主入口组件，提供Context包装
 */
const DatabaseDetailPage: React.FC = () => {
  return (
    <DatabaseProvider>
      <DatabaseDetailContent />
    </DatabaseProvider>
  );
};

export default memo(DatabaseDetailPage);
