import React, { useState } from 'react';
import { message } from 'antd';
import { DeleteIcon } from '@/components/svg-icons';
import { useTranslation } from 'react-i18next';

interface InputBoxProps {
  onSend: (text: string) => void;
  onClear?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  footerExtra?: React.ReactNode;
  showClear?: boolean;
}

const InputBox = ({
  onSend,
  onClear,
  isLoading = false,
  placeholder,
  value,
  onChange,
  footerExtra,
  showClear = false,
}: InputBoxProps) => {
  const { t } = useTranslation();
  const [internalValue, setInternalValue] = useState('');
  const [isComposing, setIsComposing] = useState<boolean>(false);

  // 使用受控模式还是非受控模式
  const isControlled = value !== undefined;
  const inputValue = isControlled ? value : internalValue;
  const setInputValue = isControlled
    ? (val: string) => onChange?.(val)
    : setInternalValue;

  // 按下回车键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSendBtnClick();
    }
  };

  // 点击发送按钮
  const handleSendBtnClick = () => {
    if (isLoading) {
      message.warning(t('configBase.promptTry.answerPleaseTryAgainLater'));
      return;
    }

    const question = inputValue.trim();
    if (!question) {
      message.info(t('configBase.promptTry.pleaseEnterQuestion'));
      return;
    }

    onSend(question);
    setInputValue('');
  };

  // 清除聊天记录
  const handleClear = () => {
    if (isLoading) {
      message.warning(t('configBase.promptTry.answerPleaseTryAgainLater'));
      return;
    }
    onClear?.();
  };

  return (
    <div className="relative w-full rounded-md h-[95px] flex">
      {showClear && onClear && (
        <div
          className="w-[107px] h-[26px] absolute top-[-34px] left-0 bg-white border border-[#e4ebf9] rounded-[13px] flex items-center justify-center text-[12px] text-[#535875] z-[40] cursor-pointer hover:text-[#6b89ff]"
          onClick={handleClear}
        >
          <DeleteIcon style={{ pointerEvents: 'none', marginRight: '6px' }} />
          {t('configBase.promptTry.clearHistory')}
        </div>
      )}
      <textarea
        className="rounded-[8px] absolute left-[2px] bottom-[2px] w-[calc(100%-4px)] leading-[25px] min-h-[95px] max-h-[180px] resize-none outline-none border border-[#d2dbe7] text-[14px] py-[10px] pl-[16px] text-[#07133e] z-[32] placeholder:text-[#d0d0da]"
        style={{ paddingRight: footerExtra ? 280 : 100 }}
        placeholder={placeholder || t('chatPage.chatWindow.defaultPlaceholder')}
        onKeyDown={handleKeyDown}
        value={inputValue}
        onChange={e => {
          setInputValue(e.target.value);
        }}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
      />
      {footerExtra && (
        <div className="absolute bottom-[10px] right-[92px] h-[38px] z-[36] flex items-center">
          {footerExtra}
        </div>
      )}
      <div
        className="absolute bottom-[10px] right-[10px] w-[70px] h-[38px] rounded-[8px] text-white text-center leading-[38px] text-[14px] cursor-pointer transition-all duration-300 z-[35] hover:bg-[#257eff] hover:opacity-100"
        style={{
          background: inputValue ? '#257eff' : '#8aa5e6',
          opacity: inputValue ? 1 : 0.7,
        }}
        onClick={handleSendBtnClick}
      >
        {t('configBase.promptTry.send')}
      </div>
    </div>
  );
};

export default InputBox;
