import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CloseOutlined } from '@ant-design/icons';
import RetractableInput from '@/components/ui/global/retract-table-input';
import { Select } from 'antd';
import { SpaceButton } from '@/components/button-group';
import { ModelInfo } from '@/types/model';
import ArrowDownIconWhite from '@/assets/svgs/arrow-down-white.svg';
import { useModelContext } from '../context/model-context';

interface ModelManagementHeaderProps {
  activeTab: string;
  shelfOffModel: ModelInfo[];
  refreshModels?: () => void;
  searchInput: string;
  setSearchInput?: (value: string) => void;
  filterType?: number;
  setFilterType?: (val: number) => void;
  setShowShelfOnly: (val: boolean) => void;
}

const ModelManagementHeader: React.FC<ModelManagementHeaderProps> = ({
  activeTab: initialActiveTab,
  shelfOffModel,
  refreshModels,
  searchInput,
  setSearchInput,
  filterType = 0,
  setFilterType,
  setShowShelfOnly,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const { pathname } = useLocation();
  const { state, actions } = useModelContext();

  useEffect(() => {
    setActiveTab(initialActiveTab);
  }, [initialActiveTab]);

  /* 控制提示框是否已手动关闭 */
  const [closed, setClosed] = useState(false);

  /* 即将下架模型数量 */
  const offCount = useMemo(() => shelfOffModel.length, [shelfOffModel]);

  const getRobotsDebounce = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    if (setSearchInput) {
      setSearchInput(value);
    }
  };

  const handleTypeChange = (val: number): void => {
    setFilterType?.(val);
  };

  const handleClose = (): void => {
    setClosed(true);
    setShowShelfOnly(false);
    if (activeTab === 'officialModel') {
      sessionStorage.removeItem('officialModelQueckFilter');
    }

    if (activeTab === 'personalModel') {
      sessionStorage.removeItem('personalModelQueckFilter');
    }
  };

  const handleCreateClick = (): void => {
    actions.setCurrentEditModel(undefined);
    actions.setCreateModal(true);
  };

  return (
    <div>
      <div className="w-full relative z-10 flex flex-col justify-between rounded-2xl">
        <div className="flex items-center gap-3 w-full pt-5">
          {/* 标题 */}
          <h1 className="font-medium text-[20px] text-[#222529] leading-[26px] font-[PingFang-Sim]">
            {t('model.modelManagement')}
          </h1>

          {/* 警告条 */}
          {offCount > 0 && !closed && (
            <div className="flex-1 min-w-0 flex items-center justify-center bg-[#FEEDEC] text-[#F74E43] text-sm rounded-xl px-3 py-1">
              <span className="flex-1 text-center">
                {t('model.modelWillStopService')}
              </span>

              {/* 快速筛选 */}
              <span
                className="ml-auto mr-2 text-[#6356EA] cursor-pointer hover:underline"
                onClick={() => refreshModels?.()}
              >
                {t('model.quickFilter')}
              </span>

              {/* 关闭按钮 */}
              <CloseOutlined
                className="cursor-pointer hover:opacity-70"
                onClick={handleClose}
              />
            </div>
          )}
        </div>

        {/* Tab 切换 + 右侧控件 */}
        <div className="flex items-center mt-4">
          {/* 左侧 Tab */}
          <div className="flex items-center bg-[#F6F7FB] rounded-xl h-10 p-1 gap-1">
            <div
              className={`min-w-[86px] h-8 px-4 rounded-lg text-sm flex items-center justify-center cursor-pointer transition-colors
            ${
              pathname === '/management/model'
                ? 'bg-white text-[#6356EA] shadow'
                : 'text-[#7f7f7f] hover:text-[#6356EA]'
            }`}
              onClick={() => navigate('/management/model')}
            >
              {t('model.officialModel')}
            </div>
            <div
              className={`min-w-[86px] h-8 px-4 rounded-lg text-sm flex items-center justify-center cursor-pointer transition-colors
            ${
              pathname === '/management/model/personalModel'
                ? 'bg-white text-[#6356EA] shadow'
                : 'text-[#7f7f7f] hover:text-[#6356EA]'
            }`}
              onClick={() => navigate('/management/model/personalModel')}
            >
              {t('model.personalModel')}
            </div>
          </div>

          {/* 右侧控件 */}
          <div className="ml-auto flex items-center gap-2">
            {activeTab === 'personalModel' && (
              <Select
                className="ant-select-UI"
                placeholder={t('model.pleaseSelect')}
                value={filterType}
                style={{ width: 120 }}
                options={[
                  { label: t('model.all'), value: 0 },
                  { label: t('model.thirdPartyModel'), value: 1 },
                  { label: t('model.localModel'), value: 2 },
                ]}
                onChange={handleTypeChange}
              />
            )}
            <RetractableInput
              value={searchInput}
              restrictFirstChar={true}
              onChange={getRobotsDebounce}
            />
            {activeTab === 'personalModel' && (
              <SpaceButton
                config={{
                  key: 'create-model',
                  text: t('model.createModel'),
                  type: 'primary',
                  size: 'small',
                  icon: (
                    <img
                      src={ArrowDownIconWhite}
                      alt="arrow-down"
                      style={{ width: 14, height: 14 }}
                    />
                  ),
                  onClick: () => handleCreateClick?.(),
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelManagementHeader;
