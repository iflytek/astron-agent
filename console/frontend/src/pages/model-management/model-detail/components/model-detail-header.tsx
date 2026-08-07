import { CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import arrowLeft from '@/assets/imgs/common/back.png';
import { ModelInfo, ShelfStatus } from '@/types/model';
import React from 'react';

interface ModelDetailHeaderProps {
  modelDetail: ModelInfo | null;
  closed: boolean;
  setClosed: (closed: boolean) => void;
  formatDate: (d: Date) => string;
}

const ModelDetailHeader: React.FC<ModelDetailHeaderProps> = ({
  modelDetail,
  closed,
  setClosed,
  formatDate,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center w-[85%] mx-auto pt-[30px] pb-[24px]">
      {/* 返回按钮 */}
      <div
        className="flex items-center cursor-pointer gap-1 mr-4 shrink-0"
        onClick={() => navigate(-1)}
      >
        <img src={arrowLeft} className="w-[18px] h-[18px]" alt="" />
        <span className="font-medium">{t('model.back')}</span>
      </div>

      {/* 警告栏 */}
      {modelDetail &&
        modelDetail.shelfStatus === ShelfStatus.WAIT_OFF_SHELF &&
        !closed && (
          <div className="flex items-center h-[20px] justify-between gap-3 px-3 py-1.5 rounded-[10px] bg-[#FEEDEC] text-[#F74E43] text-sm flex-1">
            <span className="flex-1 text-center">
              {t('model.modelWillStopOn')}
              {modelDetail.shelfOffTime
                ? formatDate(new Date(modelDetail.shelfOffTime))
                : ''}
              {t('model.stopServicePleaseSwitch')}
            </span>
            <CloseOutlined
              className="cursor-pointer shrink-0"
              onClick={() => setClosed(true)}
            />
          </div>
        )}
    </div>
  );
};

export default ModelDetailHeader;
