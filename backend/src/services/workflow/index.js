// src/services/workflow/index.js
// Central export for workflow engine

const WorkflowService = require('./WorkflowService');
const WorkflowResolver = require('./WorkflowResolver');
const { getPipeline, getAllPipelines } = require('./pipelines');

module.exports = {
  WorkflowService,
  WorkflowResolver,
  getPipeline,
  getAllPipelines,
};

