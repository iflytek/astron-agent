import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, message } from 'antd';
import { deleteBotAPI, deleteAgent } from '@/services/agent';
import dialogDel from '@/assets/imgs/main/icon_dialog_del.png';
import { handleAgentStatus } from '@/services/release-management';
import eventBus from '@/utils/event-bus';
import useUserStore from '@/store/user-store';

type BotDetail = {
  botStatus?: number;
  botId?: string | number;
  id?: string | number;
  name?: string;
  botName?: string;
  uid?: string;
};

interface DeleteBotProps {
  botDetail: BotDetail;
  setDeleteModal: (visible: boolean) => void;
  initData: () => void;
  type?: boolean;
}

function index({
  botDetail,
  setDeleteModal,
  initData,
  type,
}: DeleteBotProps): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const user = useUserStore((state: any) => state.user);

  async function handleOk(): Promise<void> {
    if (type && botDetail?.uid && user?.uid && botDetail.uid !== user.uid) {
      message.warning(
        '\u65e0\u6cd5\u5220\u9664\u4ed6\u4eba\u521b\u5efa\u7684\u667a\u80fd\u4f53'
      );
      setDeleteModal(false);
      return;
    }
    // 从智能体Tab传入Bot的删除 -- 调用星火方面接口
    setLoading(true);
    if (botDetail?.botStatus === 2) {
      await handleAgentStatus(botDetail.botId as number, {
        action: 'OFFLINE',
        publishType: 'MARKET',
        publishData: { reason: '维护更新' },
      });
    }
    if (type) {
      deleteAgent({ botId: botDetail.botId })
        .then(data => {
          setDeleteModal(false);
          initData();
          eventBus.emit('chatListChange');
          message.success(t('agentPage.deleteBot.deleteSuccess'));
        })
        .finally(() => {
          setLoading(false);
        });
      return;
    }

    deleteBotAPI(Number(botDetail.id as number))
      .then(data => {
        setDeleteModal(false);
        initData();
        message.success(t('agentPage.deleteBot.deleteSuccess'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <div className="mask">
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md w-[310px]">
        <div className="flex items-center">
          <div className="bg-[#fff5f4] w-10 h-10 flex justify-center items-center rounded-lg">
            <img src={dialogDel} className="w-7 h-7" alt="" />
          </div>
          <p className="ml-2.5">{t('agentPage.deleteBot.confirmDelete')}</p>
        </div>
        <div className="w-full h-10 bg-[#F9FAFB] text-center mt-7 py-2 text-ellipsis overflow-hidden whitespace-nowrap">
          {botDetail.name || botDetail.botName}
        </div>
        <p className="mt-6 text-desc">
          {botDetail?.botStatus == 2
            ? t('agentPage.deleteBot.publishedWarning')
            : type
              ? t('agentPage.deleteBot.deletionNotice1')
              : t('agentPage.deleteBot.deletionNotice2')}
        </p>
        <div className="flex flex-row-reverse gap-3 mt-7">
          <Button
            type="text"
            loading={loading}
            onClick={handleOk}
            className="delete-btn px-6"
            style={{ textAlign: 'center' }}
          >
            {t('agentPage.deleteBot.deleteButton')}
          </Button>
          <Button
            type="text"
            className="origin-btn px-6"
            onClick={() => setDeleteModal(false)}
            style={{ textAlign: 'center' }}
          >
            {t('agentPage.deleteBot.cancelButton')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default index;
