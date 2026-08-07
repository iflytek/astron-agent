import { useEffect, useCallback, useRef } from 'react';
import { useBeforeUnload, useBlocker, type Blocker } from 'react-router-dom';

interface BeforeUnloadEvent {
  returnValue: string;
  preventDefault: () => void;
}

const usePrompt = (hasUnsavedChanges: boolean, message: string): void => {
  const onLocationChange = useCallback(() => {
    if (hasUnsavedChanges) {
      return !window.confirm(message);
    }
    return false;
  }, [hasUnsavedChanges]);

  Prompt({ onLocationChange, hasUnsavedChanges });
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent): void => {
        if (hasUnsavedChanges) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [hasUnsavedChanges]
    ),
    { capture: false }
  );

  return;
};

interface PromptProps {
  onLocationChange: () => boolean;
  hasUnsavedChanges: boolean;
}

function Prompt({ onLocationChange, hasUnsavedChanges }: PromptProps) {
  const blocker = useBlocker(
    hasUnsavedChanges ? onLocationChange : false
  ) as Blocker;
  const prevState = useRef(blocker.state);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
    prevState.current = blocker.state;
  }, [blocker]);
}

export default usePrompt;
