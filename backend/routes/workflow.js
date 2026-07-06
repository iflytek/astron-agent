const express = require('express');
const router = express.Router();

// In-memory storage for workflows (replace with DB)
let workflows = [];

// GET /api/workflows - List all workflows
router.get('/', (req, res) => {
  res.json(workflows);
});

// POST /api/workflows - Create a new workflow
router.post('/', (req, res) => {
  const { name, nodes, edges } = req.body;
  if (!name || !nodes || !edges) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const newWorkflow = {
    id: Date.now().toString(),
    name,
    nodes,
    edges,
    createdAt: new Date(),
  };
  workflows.push(newWorkflow);
  res.status(201).json(newWorkflow);
});

// PUT /api/workflows/:id - Update a workflow
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const index = workflows.findIndex((w) => w.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Workflow not found' });
  }
  const { name, nodes, edges } = req.body;
  if (name) workflows[index].name = name;
  if (nodes) workflows[index].nodes = nodes;
  if (edges) workflows[index].edges = edges;
  workflows[index].updatedAt = new Date();
  res.json(workflows[index]);
});

// DELETE /api/workflows/:id - Delete a workflow
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const index = workflows.findIndex((w) => w.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Workflow not found' });
  }
  workflows.splice(index, 1);
  res.status(204).send();
});

module.exports = router;