import { create } from 'zustand';

interface LoginState {
  isLoginModalVisible: boolean;
  showLoginModal: () => void;
  hideLoginModal: () => void;
  toggleLoginModal: () => void;
}

export const useLoginStore = create<LoginState>(set => ({
  isLoginModalVisible: false,

  showLoginModal: (): void => set({ isLoginModalVisible: true }),

  hideLoginModal: (): void => set({ isLoginModalVisible: false }),

  toggleLoginModal: (): void =>
    set(state => ({
      isLoginModalVisible: !state.isLoginModalVisible,
    })),
}));
