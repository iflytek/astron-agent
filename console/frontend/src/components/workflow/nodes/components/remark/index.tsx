import React, { useRef, useEffect, useState } from 'react';
import styles from './index.module.scss';
import { useSize } from 'ahooks';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import cloneDeep from 'lodash/cloneDeep';
import { useDebounceFn } from 'ahooks';
import { useTranslation } from 'react-i18next';

const Remark = (props: unknown): React.ReactElement => {
  const { id, data } = props;
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const setNodes = currentStore(state => state.setNodes);
  const setNode = currentStore(state => state.setNode);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentSize = useSize(containerRef);
  const [top, setTop] = useState(0);
  const [active, setActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const [height, setHeight] = useState(120);
  const [width, setWidth] = useState(583);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const [value, setValue] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    setValue(data?.nodeParam?.remark);
  }, [data]);

  useEffect(() => {
    if (contentSize) {
      setTop(contentSize.height);
    }
  }, [contentSize]);

  useEffect(() => {
    const element = document.getElementById(id);
    const width = element?.offsetWidth;
    setWidth(width ?? 583);
  }, []);

  useEffect((): void | (() => void) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const handleWheel = (event: WheelEvent): void => {
        event.stopPropagation();
      };
      textarea.addEventListener('wheel', handleWheel);
      return (): void => {
        textarea.removeEventListener('wheel', handleWheel);
      };
    }
  }, []);

  useEffect((): void | (() => void) => {
    const container = containerRef.current;
    if (container) {
      const handleStop = (e: MouseEvent): void => {
        e.stopPropagation();
      };
      container.addEventListener('mousedown', handleStop);
      return (): void => {
        container.removeEventListener('mousedown', handleStop);
      };
    }
  }, []);

  const handleFocus = (): void => {
    setActive(true);
    setNodes(nodes =>
      nodes?.map(node => ({
        ...node,
        selected: false,
      }))
    );
  };
  const handleBlur = (): void => {
    setActive(false);
  };

  const handleKeyDown = (e: KeyboardEvent): void => {
    e.stopPropagation();
  };

  const { run } = useDebounceFn(
    (value): void => {
      setNode(id, old => {
        old.data.nodeParam.remark = value;
        return {
          ...cloneDeep(old),
        };
      });
      autoSaveCurrentFlow();
    },
    { wait: 500 }
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const inputValue = e.target.value;
    setValue(inputValue);
    run(inputValue);
  };

  const handleDrag = (e: MouseEvent): void => {
    e.stopPropagation();
    if (!isDraggingRef.current) return;
    // 计算垂直移动距离
    const dy = e.clientY - startYRef.current;
    let newHeight = startHeightRef.current + -dy;
    newHeight = Math.max(120, Math.min(newHeight, 600));
    setHeight(newHeight);
  };

  // 停止拖拽
  const stopDrag = (e: MouseEvent): void => {
    if (e) {
      e.stopPropagation();
    }
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
  };

  const startDrag = (e: MouseEvent): void => {
    e.stopPropagation();
    e.preventDefault();
    startYRef.current = e.clientY;
    startHeightRef.current = containerRef.current.clientHeight;
    isDraggingRef.current = true;
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  useEffect((): void | (() => void) => {
    const handleEle = handleRef.current;
    if (handleEle) {
      handleEle.addEventListener('mousedown', startDrag);
    }
    return (): void => {
      if (handleEle) {
        handleEle.removeEventListener('mousedown', startDrag);
      }
    };
  }, []);

  return (
    <div
      className={`${styles.remark}`}
      style={{
        top: data.status ? -(top + 28) : -(top + 28),
        visibility: top > 0 ? 'visible' : 'hidden',
      }}
      onClick={(e): void => {
        e.stopPropagation();
      }}
    >
      <div
        ref={containerRef}
        className={`${styles.textContainer} ${active ? styles.active : ''}`}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder={`${t('workflow.nodes.common.inputPlaceholder')}...`}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
        />
        <div ref={handleRef} className={styles.handle}>
          <div className={styles.line}></div>
          <div className={styles.line}></div>
        </div>
      </div>
    </div>
  );
};

export default Remark;
