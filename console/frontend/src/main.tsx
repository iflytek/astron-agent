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
import './styles/ui.scss';
import './styles/console.scss';
import 'reactflow/dist/style.css';
import 'katex/dist/katex.min.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <ConfigProvider
      locale={i18n.language === 'zh' ? zhCN : en_GB}
      theme={{
        token: {
          colorPrimary: '#315ff4',
          colorText: '#18243d',
          colorTextSecondary: '#607089',
          colorBorder: '#dfe6f1',
          colorBgContainer: '#ffffff',
          borderRadius: 7,
          controlHeight: 38,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
        },
      }}
    >
      <App />
    </ConfigProvider>
  );
}
