import type { AgentFile, AgentRun } from '@/services/agents';

export const isFileAvailable = (file: AgentFile): boolean =>
  !file.legacy &&
  file.available !== false &&
  !file.id.startsWith('legacy-file-');

export const inputFiles = (run: AgentRun): AgentFile[] =>
  (run.files || []).filter(file => file.direction !== 'output');

export const needsFileUpload = (run: AgentRun): boolean =>
  inputFiles(run).some(file => !isFileAvailable(file));
