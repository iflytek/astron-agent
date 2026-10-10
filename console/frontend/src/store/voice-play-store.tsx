import { create } from 'zustand';

const useVoicePlayStore = create<{
  currentPlayingId: string | number | null; // 当前正在播放的消息ID
  activeVcn: {
    //当前激活的语音
    vcn_cn: string;
  };
  setCurrentPlayingId: (id: string | number | null) => void;
  setActiveVcn: (activeVcn: { vcn_cn: string }) => void;
}>(set => ({
  currentPlayingId: null,
  activeVcn: {
    vcn_cn: '',
  },
  setCurrentPlayingId: (id): void => set({ currentPlayingId: id }),
  setActiveVcn: (activeVcn): void => set({ activeVcn }),
}));

export default useVoicePlayStore;
