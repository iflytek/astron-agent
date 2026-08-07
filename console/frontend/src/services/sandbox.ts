import http from '@/utils/http';
import type { SkillSandboxConfig, WorkflowArtifact } from '@/types/sandbox';

export async function getSkillSandboxConfig(): Promise<SkillSandboxConfig> {
  return await http.get('/skill-sandbox/config');
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

export async function listWorkflowArtifacts(
  workflowId: string | number
): Promise<WorkflowArtifact[]> {
  return await http.get(`/workflow/${workflowId}/artifacts`);
}

export async function getWorkflowArtifactDownload(
  artifactId: string | number
): Promise<WorkflowArtifact> {
  return await http.get(`/workflow/artifacts/${artifactId}/download`);
}

export async function deleteWorkflowArtifact(
  artifactId: string | number
): Promise<void> {
  await http.delete(`/workflow/artifacts/${artifactId}`);
}
