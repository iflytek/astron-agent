import { NodeDefinition } from '../types';
import { OpenClawNode } from '../components/OpenClawNode';
import { OpenClawNodeConfig } from '../config/OpenClawNodeConfig';

export const openClawNodeDefinition: NodeDefinition = {
  type: 'openClaw',
  label: 'OpenClaw Skill',
  description: 'Node for executing OpenClaw skills',
  component: OpenClawNode,
  configComponent: OpenClawNodeConfig,
  defaultData: {
    skillName: '',
    parameters: {},
    preConditions: [],
    postConditions: []
  },
  handles: {
    inputs: [{ id: 'input', position: 'top' }],
    outputs: [{ id: 'output', position: 'bottom' }]
  }
};