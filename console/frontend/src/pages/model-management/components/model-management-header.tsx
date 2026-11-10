import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Alert, Button, Input, Select } from 'antd';
import { ModelInfo } from '@/types/model';
import { useModelContext } from '../context/model-context';
import styles from '../model-workspace.module.scss';

interface ModelManagementHeaderProps {
  activeTab: string;
  shelfOffModel: ModelInfo[];
  refreshModels?: () => void;
  onReload?: () => void;
  searchInput: string;
  setSearchInput?: (value: string) => void;
  filterType?: number;
  setFilterType?: (val: number) => void;
  setShowShelfOnly: (val: boolean) => void;
}

const ModelManagementHeader: React.FC<ModelManagementHeaderProps> = ({
  activeTab,
  shelfOffModel,
  refreshModels,
  onReload,
  searchInput,
  setSearchInput,
  filterType = 0,
  setFilterType,
  setShowShelfOnly,
}) => {
  const { t } = useTranslation();
  const { actions } = useModelContext();
  const [closed, setClosed] = useState(false);
  const personal = activeTab === 'personalModel';
  return (
    <header className={styles.header}>
      <div className={styles.heading}>
        <div>
          <h1>{t('model.modelManagement')}</h1>
          <p className={styles.hint}>
            选择供应商配置模型，或管理已接入的模型与调用参数。
          </p>
        </div>
        {personal && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              actions.setCurrentEditModel(undefined);
              actions.setCreateModal(true);
            }}
          >
            {t('model.createModel')}
          </Button>
        )}
      </div>
      <nav className={styles.tabs} aria-label="模型分类">
        <NavLink to="/management/model" end>
          {t('model.officialModel')}
        </NavLink>
        <NavLink to="/management/model/personalModel">
          {t('model.personalModel')}
        </NavLink>
      </nav>
      {shelfOffModel.length > 0 && !closed && (
        <Alert
          type="warning"
          showIcon
          closable
          message={t('model.modelWillStopService')}
          className={styles.feedback}
          action={
            <Button size="small" onClick={() => refreshModels?.()}>
              {t('model.quickFilter')}
            </Button>
          }
          onClose={() => {
            setClosed(true);
            setShowShelfOnly(false);
            sessionStorage.removeItem(
              personal ? 'personalModelQueckFilter' : 'officialModelQueckFilter'
            );
          }}
        />
      )}
      <div className={styles.toolbar}>
        <Input
          className={styles.search}
          aria-label="搜索模型"
          placeholder={personal ? '搜索模型名称' : '搜索供应商或模型'}
          prefix={<SearchOutlined />}
          allowClear
          value={searchInput}
          onChange={e => setSearchInput?.(e.target.value)}
        />
        <div className={styles.actions}>
          {personal && (
            <Select
              aria-label="模型类型"
              value={filterType}
              style={{ width: 160 }}
              options={[
                { label: t('model.all'), value: 0 },
                { label: t('model.thirdPartyModel'), value: 1 },
                { label: t('model.localModel'), value: 2 },
              ]}
              onChange={setFilterType}
            />
          )}
          {onReload && (
            <Button icon={<ReloadOutlined />} onClick={onReload}>
              刷新
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
export default ModelManagementHeader;
