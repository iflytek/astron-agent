import React, { useEffect, memo } from 'react';
import { cn } from '@/utils';
import { v4 as uuid } from 'uuid';

function FlowTextArea({
  className = '',
  value = '',
  adaptiveHeight = false,
  allowWheel = true,
  onKeyDown = (): void => {},
  ...reset
}): React.ReactElement {
  const textareaId = 'textarea' + uuid();

  useEffect((): (() => void) | void => {
    const textarea = document.getElementById(textareaId);
    if (textarea && !allowWheel) {
      const handleWheel = (e: WheelEvent): void => {
        e.stopPropagation();
      };

      textarea.addEventListener('wheel', handleWheel);

      return (): void => {
        textarea.removeEventListener('wheel', handleWheel);
      };
    }
    // 没有返回任何东西时，返回undefined（void）
  }, [textareaId, allowWheel]);

  useEffect(() => {
    if (value && adaptiveHeight) {
      const textarea = document.getElementById(textareaId);
      if (textarea) {
        textarea.style.height = '30px';
        textarea.style.height = textarea.scrollHeight + 2 + 'px';
      }
    }
  }, [value, adaptiveHeight]);

  return (
    <textarea
      id={textareaId}
      placeholder="请输入"
      value={value}
      className={cn('nodrag global-textarea flow-textarea', className)}
      onKeyDown={e => {
        e.stopPropagation();
        onKeyDown(e);
      }}
      {...reset}
    />
  );
}

export default memo(FlowTextArea);
