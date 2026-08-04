export const buildWorkflowChatUrl = (
  origin: string,
  botId: number,
  version?: string
): string => {
  const base = `${origin}/chat/${botId}`;
  return version ? `${base}/${encodeURIComponent(version)}` : base;
};

export const resolveWorkflowChatVersion = (
  explicitVersion?: string,
  routeVersion?: string
): string => explicitVersion ?? routeVersion ?? '';
