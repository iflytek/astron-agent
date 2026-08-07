export const DEFAULT_LANG: string = 'zh';
export const VALID_LANGS: string[] = ['zh', 'en'];

/**
 * 语言代码简化为 zh 或 en
 */
export function transformSimpleLanguage(lang: string): string | null {
  if (!lang?.trim()) return null;

  const simpleLang = lang.toLowerCase().split('-')[0] as string;

  if (VALID_LANGS.includes(simpleLang)) {
    return simpleLang;
  }

  return null;
}

// 扩展 Navigator 接口以支持 IE 属性
interface ExtendedNavigator extends Navigator {
  userLanguage?: string;
  browserLanguage?: string;
}

/**
 * 获取浏览器当前设置的语言
 * 兼容 IE、Firefox、Chrome、Edge、Safari 等主流浏览器
 * @param defaultLang 默认语言，默认为 'zh'
 * @returns 语言代码字符串，如 'zh', 'en' 等
 */
export function getBrowserLanguage(defaultLang: string = DEFAULT_LANG): string {
  // 确保在浏览器环境中运行
  if (typeof navigator === 'undefined') {
    return defaultLang;
  }

  const extendedNavigator = navigator as ExtendedNavigator;

  // 按优先级顺序尝试获取语言
  const languageSources = [
    // 现代浏览器首选语言
    navigator.language,
    // 现代浏览器支持的语言列表（取第一个）
    navigator.languages?.[0],
    // IE 浏览器用户语言
    extendedNavigator.userLanguage,
    // 旧版 IE 浏览器语言
    extendedNavigator.browserLanguage,
  ];

  // 遍历所有语言源，找到第一个有效的语言
  for (const lang of languageSources) {
    if (lang) {
      const transformedLang = transformSimpleLanguage(lang);
      if (transformedLang) {
        return transformedLang;
      }
    }
  }

  // 如果都获取不到，返回默认语言
  return defaultLang;
}

/**
 * dayjs format 转换为日期插件可用语言
 * @param language 语言代码
 * @returns 日期插件可用语言
 * @example
 * dayjsFormat('zh') => 'zh-cn'
 * dayjsFormat('en') => 'en'
 */
export function dayjsLangFormat(language: string = DEFAULT_LANG): string {
  const lang = language.toLowerCase();

  if (lang.startsWith('zh')) {
    return 'zh-cn';
  }

  if (lang.startsWith('en')) {
    return 'en';
  }

  return language;
}
