import { ArrowLeftOutlined } from '@ant-design/icons';
import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ModelInfo, ShelfStatus } from '@/types/model';
import React from 'react';
import styles from '../../model-workspace.module.scss';
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
    <header>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/management/model/personalModel')}
      >
        {t('model.back')}
      </Button>
      {modelDetail?.shelfStatus === ShelfStatus.WAIT_OFF_SHELF && !closed && (
        <Alert
          className={styles.feedback}
          type="warning"
          showIcon
          closable
          onClose={() => setClosed(true)}
          message={`${t('model.modelWillStopOn')}${modelDetail.shelfOffTime ? formatDate(new Date(modelDetail.shelfOffTime)) : ''}${t('model.stopServicePleaseSwitch')}`}
        />
      )}
    </header>
  );
};
export default ModelDetailHeader;
