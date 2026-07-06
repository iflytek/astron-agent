import { NodeTypes } from 'reactflow';
import OpenClawNode from '../components/nodes/OpenClawNode';

export const nodeTypes: NodeTypes = {
  openclaw: OpenClawNode,
};

export const defaultNodeData = {
  openclaw: {
    label: 'OpenClaw Action',
    skillId: '',
    inputParams: {},
    outputParams: {},
    preConditions: [],
    postConditions: [],
  },
};