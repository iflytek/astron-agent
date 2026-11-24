/** Legacy rows may contain plain text; preserve it while reading new JSON answers. */
export function readHistoryAnswer(raw: string): {
  content: string;
  reasoningContent: string;
  messageContent: string;
  option?: unknown[];
} {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const item = value as Record<string, unknown>;
      if (
        !['content', 'messageContent', 'reasoningContent', 'option'].some(
          key => key in item
        )
      )
        return { content: raw, reasoningContent: '', messageContent: '' };
      return {
        content: typeof item.content === 'string' ? item.content : '',
        reasoningContent:
          typeof item.reasoningContent === 'string'
            ? item.reasoningContent
            : '',
        messageContent:
          typeof item.messageContent === 'string' ? item.messageContent : '',
        ...(Array.isArray(item.option) ? { option: item.option } : {}),
      };
    }
    return {
      content: typeof value === 'string' ? value : raw,
      reasoningContent: '',
      messageContent: '',
    };
  } catch {
    return { content: raw || '', reasoningContent: '', messageContent: '' };
  }
}

export function readHistoryQuestion(
  raw: string
): Array<{ name: string; type: string; default: unknown }> {
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value))
      return value.filter(
        (item): item is { name: string; type: string; default: unknown } =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.name === 'string' &&
          typeof item.type === 'string'
      );
  } catch {
    /* Retain legacy text as the real question, without inventing events. */
  }
  return [{ name: 'AGENT_USER_INPUT', type: 'string', default: raw || '' }];
}

export function workflowRetryPath(runId: string | undefined): string {
  if (!runId) throw new Error('此历史没有可重试的运行标识，请发起新运行');
  return `/workflow/runs/${encodeURIComponent(runId)}/retry`;
}
