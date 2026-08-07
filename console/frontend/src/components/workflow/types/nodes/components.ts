import { RefInput } from '@/components/workflow/types/drawer';
import { ReactFlowNode } from '@/components/workflow/types/drawer';

export interface UseNodeDebuggerReturn {
  open: boolean;
  setOpen: (open: boolean) => void;
  refInputs: RefInput[];
  setRefInputs: (refInputs: RefInput[]) => void;
  handleNodeDebug: () => void;
  nodeDebugExect: (
    currentNode: ReactFlowNode,
    debuggerNode: ReactFlowNode
  ) => void;
  remarkStatus: 'show' | 'hide' | null;
  remarkClick: () => void;
  labelInputId: string;
}
