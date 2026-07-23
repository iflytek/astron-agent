export interface DebugSseHeaderContext {
  languageCode: string;
  accessToken: string | null;
  spaceId: string;
  spaceType: string;
  enterpriseId: string;
}

export const buildDebugSseHeaders = ({
  languageCode,
  accessToken,
  spaceId,
  spaceType,
  enterpriseId,
}: DebugSseHeaderContext): Record<string, string> => ({
  'Accept-Language': languageCode,
  authorization: `Bearer ${accessToken}`,
  ...(spaceId ? { 'space-id': spaceId } : {}),
  ...(spaceType === 'team' && enterpriseId
    ? { 'enterprise-id': enterpriseId }
    : {}),
});
