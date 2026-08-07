import { create } from 'zustand';
import { BotInfoType } from '@/types/chat';

interface BotInfoStore {
  botInfo: BotInfoType;
  setBotInfo: (botInfo: Partial<BotInfoType>) => void;
}

const useBotInfoStore = create<BotInfoStore>(set => ({
  botInfo: {
    pcBackground: '',
    botStatus: 0,
    chatId: 0,
    supportUploadConfig: [],
    model: '',
    botId: 0,
    creatorNickname: '',
    prologue: '',
    mine: false,
    botName: '',
    avatar: '',
    botDesc: '',
    version: 1,
    inputExample: [],
    supportContext: false,
    isFavorite: 0,
    openedTool: '',
    advancedConfig: '',
    vcnCn: '',
    config: [],
  },
  setBotInfo: (newBotInfo: Partial<BotInfoType>): void =>
    set(state => ({ botInfo: { ...state.botInfo, ...newBotInfo } })),
}));

export default useBotInfoStore;
