import React, { useRef, useEffect, memo, useState } from 'react';
import { cn } from '@/utils';
import { debounce } from 'lodash';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useTranslation } from 'react-i18next';
import { useMemoizedFn } from 'ahooks';

function FlowNodeInput({
  nodeId,
  className = '',
  value,
  onChange,
  ...reset
}): React.ReactElement {
  const { t } = useTranslation();
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const delayCheckNode = currentStore(state => state.delayCheckNode);
  const beforeUpdateNodeInputData = useRef(false);
  const updateNodeInputData = useFlowsManager(
    state => state.updateNodeInputData
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setInputValue(value);
  }, []);

  useEffect(() => {
    if (beforeUpdateNodeInputData.current !== updateNodeInputData) {
      setInputValue(value);
      beforeUpdateNodeInputData.current = updateNodeInputData;
    }
  }, [updateNodeInputData, value]);

  useEffect((): void | (() => void) => {
    const input = inputRef.current;

    if (input) {
      const handleKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
      ): void => {
        event.stopPropagation();
      };

      // 需要类型断言，因为原生addEventListener期望的是原生事件
      input.addEventListener(
        'keydown',
        handleKeyDown as unknown as EventListener
      );

      return (): void => {
        input.removeEventListener(
          'keydown',
          handleKeyDown as unknown as EventListener
        );
      };
    }
  }, []);

  const handleChangeDebounce = useMemoizedFn(
    debounce((value: string) => {
      onChange(value);
      delayCheckNode(nodeId);
    }, 500)
  );

  const handleValueChange = useMemoizedFn((value: string): void => {
    setInputValue(value);
    handleChangeDebounce(value);
  });

  return (
    <input
      ref={inputRef}
      placeholder={t('common.inputPlaceholder')}
      className={cn('flow-input nodrag px-2.5', className)}
      value={inputValue}
      onChange={e => handleValueChange(e.target.value)}
      {...reset}
    />
  );
}

export default memo(FlowNodeInput);
