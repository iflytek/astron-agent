import React from 'react';
import AddFlow from '@/components/workflow/modal/add-flow';
import AddRpa from '@/components/workflow/modal/add-rpa';
import AddKnowledge from '@/components/workflow/modal/add-knowledge';
import AddPlugin from '@/components/workflow/modal/add-plugin';
import IterativeAmplificationModal from '@/components/workflow/modal/iterative-amplification';
import KnowledgeDetail from '@/components/workflow/modal/knowledge-detail';
import SelectAgentPrompt from '@/components/workflow/modal/select-agent-prompt';
import SetDefaultValue from '@/components/workflow/modal/set-default-value';
import KnowledgeParameter from '@/components/workflow/modal/knowledge-parameter';
import KnowledgeProParameter from '@/components/workflow/modal/knowledge-pro-parameter';
import PromptOptimize from '@/components/workflow/modal/prompt-optimize';
import ClearFlowCanvas from '@/components/workflow/modal/clear-flow-canvas';

function index(): React.ReactElement {
  return (
    <>
      <AddFlow />
      <AddRpa />
      <AddKnowledge />
      <AddPlugin />
      <IterativeAmplificationModal />
      <KnowledgeDetail />
      <SelectAgentPrompt />
      <SetDefaultValue />
      <KnowledgeParameter />
      <KnowledgeProParameter />
      <PromptOptimize />
      <ClearFlowCanvas />
    </>
  );
}

export default index;
