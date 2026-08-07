import { create } from 'zustand';

interface HomeStore {
  botType: number;
  botOrigin: 'sys' | 'search' | 'home';
  scrollTop: number;
  loadingPage: number;
  searchInputValue: string;
}
interface HomeActions {
  setBotType: (botType: number) => void;
  setBotOrigin: (botOrigin: 'sys' | 'search' | 'home') => void;
  setScrollTop: (scrollTop: number) => void;
  setLoadingPage: (loadingPage: number) => void;
  setSearchInputValue: (searchInputValue: string) => void;
}

const useHomeStore = create<HomeStore & HomeActions>(set => ({
  botType: 0,
  botOrigin: 'home',
  scrollTop: 0,
  loadingPage: 1,
  searchInputValue: '',
  setBotType: (botType: number): void => set({ botType }),
  setBotOrigin: (botOrigin: 'sys' | 'search' | 'home'): void =>
    set({ botOrigin }),
  setScrollTop: (scrollTop: number): void => set({ scrollTop }),
  setLoadingPage: (loadingPage: number): void => set({ loadingPage }),
  setSearchInputValue: (searchInputValue: string): void =>
    set({ searchInputValue }),
}));

export default useHomeStore;
