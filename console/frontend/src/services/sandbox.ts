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

export async function saveSkillSandboxConfig(
  params: SkillSandboxConfig
): Promise<SkillSandboxConfig> {
  return await http.put('/skill-sandbox/config', params);
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
  path: string,
  signal: AbortSignal,
  after?: string
): Promise<SandboxFileListing> {
  return http.get(sandboxFilesPath(kind, id), {
    params: { path, after },
    signal,
  });
}

export function downloadSandboxFile(
  kind: 'agent' | 'workflow',
  id: string,
  entry: SandboxFileEntry
): void {
  const query = new URLSearchParams({ path: entry.path });
  downloadFileWithHeaders(
    `/console-api${sandboxFilesPath(kind, id)}/download?${query}`,
    entry.name
  );
}
