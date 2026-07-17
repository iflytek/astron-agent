import { message, Modal } from 'antd';
import { ReactElement } from 'react';
import warningIcon from '@/assets/imgs/sidebar/warning.svg';
import { useTranslation } from 'react-i18next';
import { clearChatList } from '@/services/chat';
import useChatStore from '@/store/chat-store';
import useBotInfoStore from '@/store/bot-info-store';
const DeleteModal = (props: {
  open: boolean;
  onCancel: () => void;
}): ReactElement => {
  const { open, onCancel } = props;
  const { t } = useTranslation();
  const setChatFileListNoReq = useChatStore(
    state => state.setChatFileListNoReq
  );
  const setBotInfo = useBotInfoStore(state => state.setBotInfo);
  const setMessageList = useChatStore(state => state.setMessageList); //  设置消息列表
  const setCurrentChatId = useChatStore(state => state.setCurrentChatId); //  设置当前聊天id
  const currentChatId = useChatStore(state => state.currentChatId); //  当前聊天id
  const botInfo = useBotInfoStore(state => state.botInfo); //  机器人信息

  //清除对话历史确认
  const handleClearChatList = () => {
    clearChatList(currentChatId, botInfo.botId)
      .then(res => {
        setCurrentChatId(res.id);
        setBotInfo({ chatId: res.id });
        setMessageList([]);
        setChatFileListNoReq([]);
        onCancel();
      })
      .catch(() => {
        message.error(t('chatPage.chatWindow.clearChatHistoryFailed'));
      });
  };
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      closeIcon={null}
      wrapClassName="delete_mode"
      centered
      width={352}
      maskClosable={false}
      onOk={handleClearChatList}
      okText={t('chatPage.chatWindow.confirm')}
      cancelText={t('chatPage.chatWindow.cancel')}
    >
      <div className="text-black flex tems-center font-medium text-base">
        <img src={warningIcon} alt="" className="w-[22px] h-[22px] mr-2" />
        <span>{t('chatPage.chatWindow.confirmDeleteChat')}</span>
      </div>
    </Modal>
  );
};

export default DeleteModal;
