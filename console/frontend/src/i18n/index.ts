import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { zh } from '../locales/zh';
import { en } from '../locales/en';

// Try to get the language from localStorage
const getSavedLanguage = (): string | null => {
  try {
    // Check for language in the Zustand persist storage
    const recoilPersist = localStorage.getItem('recoil-persist');
    if (recoilPersist) {
      const parsedData = JSON.parse(recoilPersist);
      if (parsedData.locale) {
        // 将可能的zh-CN格式转换为简单的zh
        if (parsedData.locale.startsWith('zh')) {
          return 'zh';
        }
        return parsedData.locale;
      }
    }

    // Check for direct language storage
    const directLanguage = localStorage.getItem('locale-storage');
    if (directLanguage) {
      // 将可能的zh-CN格式转换为简单的zh
      if (directLanguage.startsWith('zh')) {
        return 'zh';
      }
      return directLanguage;
    }

    return null;
  } catch (e) {
    console.error('Error retrieving language from storage:', e);
    return null;
  }
};

// Initialize i18next
i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: en,
      },
      zh: {
        translation: zh,
      },
    },
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'locale-storage',
      caches: ['localStorage'],
    },
    lng: getSavedLanguage() || 'zh', // Use saved language if available
    // 确保使用简单的语言代码
    load: 'languageOnly',
    lowerCaseLng: true,
  });

export default i18n;
