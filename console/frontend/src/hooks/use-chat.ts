import { useNavigate } from 'react-router-dom';

/** Navigation shared by the remaining product entry points. */
export default function useChat() {
  const navigate = useNavigate();
  return {
    handleToChat: (botId: number): void => navigate(`/chat/${botId}`),
    handleFlowToChat: (item: {
      botId?: number | string;
      version?: string;
    }): void => {
      if (!item.botId) return;
      const version = item.version
        ? `/${encodeURIComponent(item.version)}`
        : '';
      window.open(
        `${window.location.origin}/chat/${item.botId}${version}`,
        '_blank'
      );
    },
  };
}
