import { create } from 'zustand';

/** 创建调试指令型智能体所需store */

interface AgentDirectiveCreateState {
  agentType: [{ name: string; key: number }] | [];
  setAgentType: (agentType: [{ name: string; key: number }]) => void;
}

const useAgentDirectiveCreateStore = create<AgentDirectiveCreateState>(set => ({
  agentType: [], // 智能体分类信息
  setAgentType: (agentType: [{ name: string; key: number }]): void =>
    set({ agentType }),
}));

export default useAgentDirectiveCreateStore;
