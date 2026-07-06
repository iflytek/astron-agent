const mongoose = require('mongoose');

const OpenClawSkillSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  inputParams: [{ name: String, type: String, required: Boolean }],
  outputParams: [{ name: String, type: String }],
  preConditions: [{ condition: String, value: String }],
  postConditions: [{ condition: String, value: String }],
  logic: { type: String, default: '' } // 可微调逻辑的文本表示
});

module.exports = mongoose.model('OpenClawSkill', OpenClawSkillSchema);
