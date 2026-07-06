// OpenClaw Node implementation for Astron Agent workflow engine
// This module provides the logic for executing an OpenClaw skill within a workflow.

const axios = require('axios');

class OpenClawNode {
  constructor(config) {
    this.id = config.id;
    this.skillId = config.skillId;
    this.inputMapping = config.inputMapping || {};
    this.outputMapping = config.outputMapping || {};
    this.preconditions = config.preconditions || [];
    this.postconditions = config.postconditions || [];
  }

  async execute(context) {
    // Evaluate preconditions
    for (const cond of this.preconditions) {
      if (!this.evaluateCondition(cond, context)) {
        throw new Error(`Precondition failed: ${cond}`);
      }
    }

    // Build API request payload from context using inputMapping
    const payload = {};
    for (const [paramName, contextKey] of Object.entries(this.inputMapping)) {
      payload[paramName] = context[contextKey];
    }

    // Call OpenClaw skill API
    const response = await axios.post(`https://api.openclaw.ai/v1/skills/${this.skillId}/execute`, payload, {
      headers: { 'Authorization': `Bearer ${process.env.OPENCLAW_API_KEY}` }
    });

    const result = response.data;

    // Map output back to workflow context
    const outputContext = {};
    for (const [contextKey, resultKey] of Object.entries(this.outputMapping)) {
      outputContext[contextKey] = result[resultKey];
    }

    // Evaluate postconditions
    for (const cond of this.postconditions) {
      if (!this.evaluateCondition(cond, { ...context, ...outputContext })) {
        throw new Error(`Postcondition failed: ${cond}`);
      }
    }

    return outputContext;
  }

  evaluateCondition(condition, context) {
    // Simplified condition evaluation: supports expressions like "context.a > 5"
    // In production, use a safe expression parser
    try {
      const fn = new Function('context', `return ${condition}`);
      return fn(context);
    } catch (e) {
      console.error('Condition evaluation error:', e);
      return false;
    }
  }
}

module.exports = OpenClawNode;
