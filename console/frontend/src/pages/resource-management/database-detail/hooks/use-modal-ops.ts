import { useCallback } from 'react';
import { useDatabaseContext } from '../context/database-context';

/**
 * 弹框操作Hook
 */
export const useModalOps = (): {
  openModal: (modal: 'import' | 'createDatabase' | 'addRow') => void;
  closeModal: (modal: 'import' | 'createDatabase' | 'addRow') => void;
} => {
  const { actions } = useDatabaseContext();

  const openModal = useCallback(
    (modal: 'import' | 'createDatabase' | 'addRow') => {
      actions.setModalState(modal, true);
    },
    [actions.setModalState]
  );

  const closeModal = useCallback(
    (modal: 'import' | 'createDatabase' | 'addRow') => {
      actions.setModalState(modal, false);
    },
    [actions.setModalState]
  );

  return { openModal, closeModal };
};
