import http, { downloadFileWithHeaders } from '@/utils/http';
import type {
  SandboxFileEntry,
  SandboxFileListing,
  SkillSandboxConfig,
} from '@/types/sandbox';

export async function getSkillSandboxConfig(): Promise<SkillSandboxConfig> {
  return await http.get('/skill-sandbox/config');
}

export function revealSandboxCredential(
  signal: AbortSignal
): Promise<{ value: string }> {
  return http.post('/skill-sandbox/credential', {}, { signal });
}

export const SANDBOX_CONFIG_CHANGED = 'astron-sandbox-config-changed';

function notifySandboxConfigChange(): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(SANDBOX_CONFIG_CHANGED);
  channel.postMessage(null);
  channel.close();
}

export async function saveSkillSandboxConfig(
  params: SkillSandboxConfig
): Promise<SkillSandboxConfig> {
  const result: SkillSandboxConfig = await http.put(
    '/skill-sandbox/config',
    params
  );
  notifySandboxConfigChange();
  return result;
}

export async function testSkillSandboxConfig(
  params: SkillSandboxConfig
): Promise<SkillSandboxConfig> {
  return await http.post('/skill-sandbox/test', params);
}

function sandboxFilesPath(kind: 'agent' | 'workflow', id: string): string {
  const resource = kind === 'agent' ? 'agents' : 'workflow';
  return `/${resource}/${encodeURIComponent(id)}/sandbox-files`;
}

export function listSandboxFiles(
  kind: 'agent' | 'workflow',
  id: string,
  signal: AbortSignal,
  after?: string
): Promise<SandboxFileListing> {
  return http.get(sandboxFilesPath(kind, id), {
    params: { after },
    signal,
  });
}

export function downloadSandboxFile(
  kind: 'agent' | 'workflow',
  id: string,
  entry: SandboxFileEntry
): void {
  const query = new URLSearchParams({ path: entry.path });
  if (entry.fileRef) query.set('fileRef', entry.fileRef);
  downloadFileWithHeaders(
    `/console-api${sandboxFilesPath(kind, id)}/download?${query}`,
    entry.name
  );
}

export async function deleteSandboxFile(
  kind: 'agent' | 'workflow',
  id: string,
  path: string
): Promise<void> {
  await http.delete(`${sandboxFilesPath(kind, id)}/file`, { data: { path } });
}
