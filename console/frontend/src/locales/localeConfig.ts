import { zh } from './zh';
import { en } from './en';

export const localeConfig = {
  zh: zh,
  en: en,
} as unknown as {
  [key: string]: Record<string, string>;
};
