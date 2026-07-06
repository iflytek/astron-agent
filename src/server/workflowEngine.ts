import { Request, Response } from 'express';

interface WorkflowNode {
  id: string;
  type: string;
  data: any;
}

interface WorkflowEdge {
  source: string;
  target: string;
}

interface Workflow {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export async function executeWorkflow(workflow: Workflow, userMessage: string): Promise<string> {
  // Simplified topological execution
  const nodeMap = new Map<string, WorkflowNode>();
  workflow.nodes.forEach(node => nodeMap.set(node.id, node));

  // Build adjacency
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  workflow.nodes.forEach(node => {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  });
  workflow.edges.forEach(edge => {
    adj.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  const queue: string[] = [];
  inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });

  const outputs: Record<string, any> = {};
  outputs['trigger'] = userMessage;

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeMap.get(nodeId)!;

    switch (node.type) {
      case 'input':
        // Already handled
        break;
      case 'default': // planner
        // Mock AI planning
        outputs[nodeId] = `Planned action for: ${outputs[nodeId] || ''}`;
        break;
      case 'openclaw':
        // Execute OpenClaw skill (mock call)
        const skillId = node.data.skillId;
        const inputParams = node.data.inputParams;
        // Mock API call
        outputs[nodeId] = `Executed skill ${skillId} with params ${JSON.stringify(inputParams)}`;
        break;
      case 'output':
        outputs[nodeId] = `Final response: ${outputs[nodeId] || ''}`;
        break;
      default:
        outputs[nodeId] = `Unknown node ${node.type}`;
    }

    // Enqueue children
    const neighbors = adj.get(nodeId) || [];
    neighbors.forEach(neighbor => {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    });
  }

  // Find output nodes (type 'output')
  const outputNode = workflow.nodes.find(n => n.type === 'output');
  if (outputNode) {
    return outputs[outputNode.id] || 'No response';
  }
  return 'Workflow completed without output node';
}

export function handleExecuteRequest(req: Request, res: Response) {
  const { workflow, userMessage } = req.body;
  executeWorkflow(workflow, userMessage).then(response => {
    res.json({ success: true, response });
  }).catch(err => {
    res.status(500).json({ success: false, error: err.message });
  });
}
