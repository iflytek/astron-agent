import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/locales/i18n/index';

/** 支持的语言类型 */
export type SupportedLanguage = 'zh' | 'en';

/**
 * 处理语言代码，确保中文使用zh格式
 * @param lang 语言代码
 * @returns 简化后的语言代码
 */
const getSimpleLanguage = (lang: string): SupportedLanguage => {
  if (lang.toLowerCase().startsWith('zh')) {
    return 'zh';
  }
  return 'en';
};

/** 语言状态接口 */
export interface LocaleStore {
  locale: SupportedLanguage;
  setLocale: (locale: string) => void;
  toggleLocale: () => void;
}

/**
 * 创建语言状态存储
 */
export const useLocaleStore = create<LocaleStore>()(
  persist(
    set => ({
      // 确保初始状态使用简单格式
      locale: getSimpleLanguage(i18n.language || 'zh'),
      setLocale: (locale: string): void => {
        const simpleLocale = getSimpleLanguage(locale);
        i18n.changeLanguage(simpleLocale);
        set({ locale: simpleLocale });
      },
      toggleLocale: (): void =>
        set(state => {
          // 切换时使用简单格式
          const newLocale = state.locale === 'zh' ? 'en' : 'zh';
          i18n.changeLanguage(newLocale);
          return { locale: newLocale };
        }),
    }),
    {
      name: 'locale-storage',
    }
  )
);
