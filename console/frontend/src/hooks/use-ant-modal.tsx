import { useState, useCallback, useRef, MutableRefObject } from 'react';
import { useDebounceFn } from 'ahooks';
import { DebounceOptions } from 'ahooks/es/useDebounce/debounceOptions';

export type Option = {
  handleOkCallback?: Function;
  handleCancelCallback?: Function;
  requestErrorCallback?: Function;
  okDebounceOptions?: DebounceOptions;
};

export type CommonAntModalProps = {
  open: boolean;
  onOk: () => void;
  onCancel: () => void;
  okButtonProps: {
    loading: boolean;
  };
};

export type Result = {
  showModal: () => void;
  closeModal: () => void;
  handleOk: (...args: any) => void;
  handleCancel: (...args: any) => void;
  open: boolean;
  visible: boolean; // 作为老版本的兼容导出
  loading: boolean;
  successRef: MutableRefObject<boolean>;
  commonAntModalProps: CommonAntModalProps;
};

export const useAntModal = (options?: Option): Result => {
  const {
    handleOkCallback,
    handleCancelCallback,
    requestErrorCallback,
    okDebounceOptions = { wait: 500, leading: false, trailing: true },
  } = options || {};
  const [visible, setVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const successRef = useRef(true);

  const showModal = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const closeModal = useCallback(() => {
    setVisible(false);
  }, [setVisible]);

  const handleOk = useCallback(
    async (...args: any) => {
      setLoading(true);
      try {
        handleOkCallback && (await handleOkCallback(args));
        successRef.current && setVisible(false);
      } catch (error) {
        requestErrorCallback && requestErrorCallback(error);
      } finally {
        setLoading(false);
      }
    },
    [handleOkCallback, requestErrorCallback, setLoading, setVisible]
  );

  const { run } = useDebounceFn((...args: any) => {
    handleOk(args);
  }, okDebounceOptions);

  const handleCancel = useCallback(
    async (...args: any) => {
      handleCancelCallback && (await handleCancelCallback(args));
      setVisible(false);
    },
    [handleCancelCallback]
  );

  return {
    showModal,
    closeModal,
    handleOk: run,
    handleCancel,
    open: visible,
    visible,
    loading,
    successRef,
    commonAntModalProps: {
      open: visible,
      onOk: run,
      onCancel: handleCancel,
      okButtonProps: {
        loading,
      },
    },
  };
};

export default useAntModal;
