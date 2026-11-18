import { defaultModelAvatar } from '@/pages/model-management/utils/model-avatar';
import { getOfficialEndpointAvatar } from '@/pages/model-management/utils/official-provider-catalog';
import type { WorkflowModel } from '@/components/workflow/types/domain';

/** Match model management branding using only the server-approved public origin. */
export function workflowModelAvatar(model: WorkflowModel | undefined): string {
  if (!model) return defaultModelAvatar;
  if (model.llmSource === 0)
    return (
      getOfficialEndpointAvatar(model.avatarEndpoint) || defaultModelAvatar
    );
  return model.icon || defaultModelAvatar;
}
