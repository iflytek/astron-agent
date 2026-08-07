import { fetchEventSource } from '@microsoft/fetch-event-source';

export interface SseHeaderContext {
  languageCode: string;
  accessToken: string | null;
  spaceId: string;
  spaceType: string;
  enterpriseId: string;
}

type FetchEventSourceInput = Parameters<typeof fetchEventSource>[0];
type FetchEventSourceOptions = Parameters<typeof fetchEventSource>[1];
type SseRequestOptions = FetchEventSourceOptions & {
  getContext: () => SseHeaderContext;
};

const buildSseHeaders = ({
  languageCode,
  accessToken,
  spaceId,
  spaceType,
  enterpriseId,
}: SseHeaderContext): Record<string, string> => ({
  'Accept-Language': languageCode,
  authorization: `Bearer ${accessToken}`,
  ...(spaceId ? { 'space-id': spaceId } : {}),
  ...(spaceType === 'team' && enterpriseId
    ? { 'enterprise-id': enterpriseId }
    : {}),
});

export const fetchSseWithContext = (
  input: FetchEventSourceInput,
  { getContext, ...options }: SseRequestOptions
): Promise<void> =>
  fetchEventSource(input, {
    ...options,
    headers: {
      ...options.headers,
      ...buildSseHeaders(getContext()),
    },
  });
