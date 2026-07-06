export { default as OpenClawNode } from './components/OpenClawNode';
export { default as OpenClawNodeConfig } from './components/OpenClawNodeConfig';
export { default as chatClawTemplate } from './templates/ChatClawTemplate';

export const registerOpenClawNode = (nodeTypes: any) => {
  nodeTypes['openClawNode'] = require('./components/OpenClawNode').default;
};

export const registerChatClawTemplate = (addTemplate: (template: any) => void) => {
  addTemplate(chatClawTemplate);
};