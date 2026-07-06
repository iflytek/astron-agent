import { useCallback } from 'react';
import { useReactFlow } from 'react-flow-renderer';

export const useNodeConfig = (nodeId: string) => {
  const { getNode, setNodes } = useReactFlow();

  const config = getNode(nodeId)?.data || {};

  const updateConfig = useCallback(
    (newConfig: any) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...newConfig } }
            : node
        )
      );
    },
    [nodeId, setNodes]
  );

  const openConfigPanel = useCallback(() => {
    // Dispatch event to open a side panel or modal with the node id
    window.dispatchEvent(new CustomEvent('open-node-config', { detail: { nodeId } }));
  }, [nodeId]);

  return { config, updateConfig, openConfigPanel };
};