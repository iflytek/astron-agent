import React, { useEffect, memo, useState, useCallback } from 'react';
import { cn } from '@/utils';
import { v4 as uuid } from 'uuid';
import { debounce } from 'lodash';

function FlowNodeTextArea({
  className = '',
  value = '',
  adaptiveHeight = false,
  allowWheel = true,
  onChange,
  ...reset
}): React.ReactElement {
  const textareaId = 'textarea' + uuid();
  const [textareaValue, setTextareaValue] = useState('');

  useEffect(() => {
    setTextareaValue(value);
  }, []);

  useEffect((): void | (() => void) => {
    const textarea = document.getElementById(textareaId);

    if (textarea) {
      const handleKeyDown = (event): void => {
        event.stopPropagation();
      };

      textarea.addEventListener('keydown', handleKeyDown);

      return () => {
        textarea.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, []);

  useEffect((): void | (() => void) => {
    const textarea = document.getElementById(textareaId);
    if (textarea && !allowWheel) {
      const handleWheel = (e): void => {
        e.stopPropagation();
      };

      textarea.addEventListener('wheel', handleWheel);

      return () => {
        textarea.removeEventListener('wheel', handleWheel);
      };
    }
  }, []);

  useEffect(() => {
    if (textareaValue && adaptiveHeight) {
      const textarea = document.getElementById(textareaId);
      if (textarea) {
        textarea.style.height = '30px';
        textarea.style.height = textarea.scrollHeight + 2 + 'px';
      }
    }
  }, [textareaValue, adaptiveHeight]);

  const handleChangeDebounce = useCallback(
    debounce(value => {
      onChange(value);
    }, 500),
    []
  );

  const handleValueChange = useCallback(value => {
    setTextareaValue(value);
    handleChangeDebounce(value);
  }, []);

  return (
    <textarea
      id={textareaId}
      placeholder="请输入"
      value={textareaValue}
      className={cn('nodrag global-textarea flow-textarea', className)}
      onChange={e => handleValueChange(e.target.value)}
      {...reset}
    />
  );
}

export default memo(FlowNodeTextArea);
