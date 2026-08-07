import React, { useMemo, useState, useEffect } from 'react';
import FlowHeader from '../components/flow-header';
import { isJSON } from '@/utils/utils';
import { useParams } from 'react-router-dom';
import BotAnalysis from '@/components/config-page-component/bot-analysis';
import { getBotInfo } from '@/services/spark-common';
import { getFlowDetailAPI } from '@/services/flow';

function index(): React.ReactElement {
  const { id } = useParams();
  const [botInfo, setBotInfo] = useState<unknown>({});
  const [currentFlow, setCurrentFlow] = useState({});
  const botId = useMemo(() => {
    return isJSON((currentFlow as unknown)?.ext)
      ? JSON.parse((currentFlow as unknown)?.ext)?.botId
      : '';
  }, [currentFlow]);

  useEffect(() => {
    id &&
      getFlowDetailAPI(id).then(data => {
        setCurrentFlow({
          ...data,
        });
      });
  }, [id]);
  useEffect(() => {
    if (botId) {
      getBotInfo({ botId }).then((data: unknown) => {
        setBotInfo({
          ...data,
        });
      });
    }
  }, [botId]);

  return (
    <div>
      <FlowHeader currentFlow={currentFlow} />
      {botId && <BotAnalysis botId={botId} detailInfo={botInfo} />}
    </div>
  );
}

export default index;
