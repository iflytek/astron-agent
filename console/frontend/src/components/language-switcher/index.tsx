import React from 'react';
import { Button } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface LanguageSwitcherProps {
  className?: string;
  style?: React.CSSProperties;
}

// 语言切换器组件
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className,
  style,
}) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const toggleLanguage = () => {
    // 使用简单的语言代码格式: zh 和 en
    const newLang = currentLanguage.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
    localStorage.setItem('locale-storage', newLang);
    localStorage.setItem('locale', newLang);

    // 添加短暂延迟后刷新页面，确保语言设置已保存
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <Button
      type="text"
      icon={<GlobalOutlined />}
      onClick={toggleLanguage}
      className={className}
      style={style}
    >
      {currentLanguage.startsWith('zh') ? 'EN' : 'ZH'}
    </Button>
  );
};

export default LanguageSwitcher;
