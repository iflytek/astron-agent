import { fetchEventSource } from '@microsoft/fetch-event-source';
import { ensureCsrfToken } from './session.js';

export interface SseHeaderContext {
  languageCode: string;
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
  spaceId,
  spaceType,
  enterpriseId,
}: SseHeaderContext): Record<string, string> => ({
  'Accept-Language': languageCode,
  ...(spaceId ? { 'space-id': spaceId } : {}),
  ...(spaceType === 'team' && enterpriseId
    ? { 'enterprise-id': enterpriseId }
    : {}),
});

export const fetchSseWithContext = async (
  input: FetchEventSourceInput,
  { getContext, ...options }: SseRequestOptions
): Promise<void> => {
  const csrfToken = await ensureCsrfToken();
  return fetchEventSource(input, {
    ...options,
    headers: {
      ...options.headers,
      ...buildSseHeaders(getContext()),
      'X-CSRFToken': csrfToken,
    },
  });
};
