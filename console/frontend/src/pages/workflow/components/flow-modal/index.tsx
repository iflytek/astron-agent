import React from 'react';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import AddFlow from '@/components/workflow/modal/add-flow';
import AddRpa from '@/components/workflow/modal/add-rpa';
import AddKnowledge from '@/components/workflow/modal/add-knowledge';
import AddPlugin from '@/components/workflow/modal/add-plugin';
import AddMcp from '@/components/workflow/modal/add-mcp';
import IterativeAmplificationModal from '@/components/workflow/modal/iterative-amplification';
import KnowledgeDetail from '@/components/workflow/modal/knowledge-detail';
import SelectAgentPrompt from '@/components/workflow/modal/select-agent-prompt';
import SetDefaultValue from '@/components/workflow/modal/set-default-value';
import KnowledgeParameter from '@/components/workflow/modal/knowledge-parameter';
import KnowledgeProParameter from '@/components/workflow/modal/knowledge-pro-parameter';
import PromptOptimize from '@/components/workflow/modal/prompt-optimize';
import ClearFlowCanvas from '@/components/workflow/modal/clear-flow-canvas';

function FlowModal(): React.ReactElement {
  const toolOpen = useFlowsManager(state => state.toolModalInfo.open);
  const mcpOpen = useFlowsManager(state => state.mcpModalInfo.open);
  const promptOpen = useFlowsManager(state => state.selectAgentPromptModalInfo.open);
  return (
    <>
      <AddFlow />
      <AddRpa />
      <AddKnowledge />
      {toolOpen && <AddPlugin />}
      {mcpOpen && <AddMcp />}
      <IterativeAmplificationModal />
      <KnowledgeDetail />
      {promptOpen && <SelectAgentPrompt />}
      <SetDefaultValue />
      <KnowledgeParameter />
      <KnowledgeProParameter />
      <PromptOptimize />
      <ClearFlowCanvas />
    </>
  );
}

export default FlowModal;
