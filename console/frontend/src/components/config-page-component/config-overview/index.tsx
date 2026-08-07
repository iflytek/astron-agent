import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBotInfo } from '@/services/spark-common';
import BotAnalysis from '@/components/config-page-component/bot-analysis';
import ConfigHeader from '@/components/config-page-component/config-header/ConfigHeader';

import styles from './index.module.scss';
import { BotInfoType } from '@/types/chat';

const ConfigOverview = ({
  currentRobot,
  currentTab,
  setCurrentTab,
}: {
  currentRobot: any;
  currentTab: any;
  setCurrentTab: any;
}) => {
  const [searchParams] = useSearchParams();
  const botId = searchParams.get('botId');
  const [detailInfo, setDetailInfo] = useState<BotInfoType>();

  useEffect(() => {
    getBotInfo({ botId: botId }).then(res => {
      setDetailInfo(res?.data || res); // NOTE: 这里的处理可能不对, 原来是直接用 res 赋值
    });
  }, [botId]);

  useEffect(() => {
    setCurrentTab('overview');
  }, []);

  return (
    <div className={styles.overview_container}>
      <ConfigHeader
        coverUrl={detailInfo?.avatar}
        baseinfo={detailInfo}
        botId={searchParams.get('botId') || ''}
        detailInfo={detailInfo}
        currentRobot={currentRobot}
        currentTab={currentTab}
      />
      <BotAnalysis botId={botId} detailInfo={detailInfo} />
    </div>
  );
};

export default ConfigOverview;
