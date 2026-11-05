import { useMemo } from 'react';
import useFlowsManager from '../store/use-flows-manager';
import { workflowExecutionView } from '../store/workflow-execution-view';
import type { FlowType } from '../types';

export function useWorkflowExecutionView(): FlowType | undefined {
  const draft = useFlowsManager(state => state.currentFlow);
  const historical = useFlowsManager(state => state.historyVersion);
  const version = useFlowsManager(state => state.historyVersionData);
  return useMemo(
    () => workflowExecutionView(draft, historical, version),
    [draft, historical, version]
  );
}
