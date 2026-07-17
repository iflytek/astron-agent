import workflow from './workflow';
import common from './common';
import model from './model';
import plugin from './plugin';
import knowledge from './knowledge';
import effectEvaluation from './effectEvaluation';
import database from './database';
import openPlatformZHModule from './openPlatformZHModule';
import rpa from './rpa';
import mcp from './mcp';
import automation from './automation';

export default {
  ...openPlatformZHModule,
  workflow,
  common,
  model,
  plugin,
  knowledge,
  effectEvaluation,
  database,
  rpa,
  mcp,
  automation,
};
