import React from 'react';
import DebuggerCheck from '@/components/workflow/drawer/debugger-check';
import AdvancedConfig from '@/components/workflow/drawer/advanced-config';
import VersionManagement from '@/components/workflow/drawer/version-management';
import NodeDetail from '@/components/workflow/drawer/node-detail';
import ChatResult from '@/components/workflow/drawer/chat-result';
import CodeIDEA from '@/components/workflow/drawer/code-idea';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';

function index(): React.ReactElement {
  const versionManagement = useFlowsManager(state => state.versionManagement);
  const setVersionManagement = useFlowsManager(
    state => state.setVersionManagement
  );
  const openOperationResult = useFlowsManager(
    state => state.openOperationResult
  );
  const setOpenOperationResult = useFlowsManager(
    state => state.setOpenOperationResult
  );

  return (
    <>
      <NodeDetail />
      <ChatResult />
      <DebuggerCheck
        open={openOperationResult}
        setOpen={setOpenOperationResult}
      />
      <AdvancedConfig />
      <VersionManagement
        open={versionManagement}
        setOpen={setVersionManagement}
        operationResultOpen={openOperationResult}
      />
      <CodeIDEA />
    </>
  );
}

export default index;
