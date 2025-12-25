import ReactDOM from 'react-dom/client';
import monaco from '@/config/monaco-config';
monaco.editor.setTheme('custom-light-theme');
import App from './app';
import zhCN from 'antd/locale/zh_CN';
import en_GB from 'antd/locale/en_GB';
// for date-picker i18n
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';
import { ConfigProvider } from 'antd';
import i18n from '@/locales/i18n';

import 'github-markdown-css/github-markdown.css';
import 'antd/dist/reset.css';
import './styles/global.scss';
import './styles/applies.scss';
import './styles/classes.scss';
import './styles/antd.scss';
import './styles/flow.scss';
import 'reactflow/dist/style.css';
import 'katex/dist/katex.min.css';

console.log(
  '[main] before bootstrap, window.__APP_CONFIG__ = ',
  (window as any).__APP_CONFIG__
);

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <ConfigProvider locale={i18n.language === 'zh' ? zhCN : en_GB}>
      <App />
    </ConfigProvider>
  );
}
