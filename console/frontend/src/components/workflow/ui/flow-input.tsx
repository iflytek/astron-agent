import React, { useRef, useEffect, memo } from 'react';
import { cn } from '@/utils';

function FlowInput({ className = '', ...reset }): React.ReactElement {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect((): void | (() => void) => {
    const input = inputRef.current;

    if (input) {
      const handleKeyDown = (event: KeyboardEvent): void => {
        event.stopPropagation();
      };

      input.addEventListener('keydown', handleKeyDown);

      return (): void => {
        input.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, []);

  return (
    <input
      ref={inputRef}
      placeholder="请输入"
      className={cn('flow-input nodrag px-2.5', className)}
      {...reset}
    />
  );
}

export default memo(FlowInput);
