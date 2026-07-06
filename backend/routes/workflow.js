const express = require('express');
const router = express.Router();
const Workflow = require('../models/Workflow');

// 创建工作流
router.post('/', async (req, res) => {
  try {
    const workflow = new Workflow(req.body);
    await workflow.save();
    res.status(201).json(workflow);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 获取所有工作流
router.get('/', async (req, res) => {
  try {
    const workflows = await Workflow.find();
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个工作流
router.get('/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新工作流（包含节点和边）
router.put('/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json(workflow);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 删除工作流
router.delete('/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findByIdAndDelete(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json({ message: 'Workflow deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
