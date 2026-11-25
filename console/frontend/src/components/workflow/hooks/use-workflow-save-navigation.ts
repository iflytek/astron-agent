import { useEffect, useRef } from 'react';
import { useBlocker, useBeforeUnload } from 'react-router-dom';
import { message } from 'antd';
import useUserStore from '@/store/user-store';
import useFlowsManager from '../store/use-flows-manager';

/** Route transitions share the same barrier as version saves and debug runs. */
export function useWorkflowSaveNavigation(hasActiveRun = false): {
  blocked: boolean;
  proceed: () => void;
  reset: () => void;
} {
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const flushCurrentFlow = useFlowsManager(state => state.flushCurrentFlow);
  const request = useRef<string>();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !!currentFlow &&
      useUserStore.getState().getIsLogin() &&
      (hasActiveRun || useFlowsManager.getState().hasUnsavedCurrentFlow()) &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search)
  );
  const proceed = (): void => {
    if (blocker.state !== 'blocked') {
      request.current = undefined;
      return;
    }
    const key = blocker.location.key;
    if (request.current === key) return;
    request.current = key;
    void flushCurrentFlow()
      .then(() => {
        if (request.current === key) blocker.proceed();
      })
      .catch(() => {
        if (request.current !== key) return;
        if (useUserStore.getState().getIsLogin())
          message.error('工作流保存失败，已保留当前页面，请重试');
        blocker.reset();
        request.current = undefined;
      });
  };
  useEffect(() => {
    if (!hasActiveRun) proceed();
  }, [blocker, flushCurrentFlow, hasActiveRun]);
  useEffect(
    () => () => {
      request.current = undefined;
    },
    []
  );
  useBeforeUnload(event => {
    // Browsers cannot await an async save on hard reload/close. Keep their
    // standard unsaved-changes guard rather than launching an untracked write.
    if (!useUserStore.getState().getIsLogin()) return;
    const state = useFlowsManager.getState();
    if (hasActiveRun || state.hasUnsavedCurrentFlow()) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  return {
    blocked: blocker.state === 'blocked',
    proceed,
    reset: () => {
      request.current = undefined;
      if (blocker.state === 'blocked') blocker.reset();
    },
  };
}
