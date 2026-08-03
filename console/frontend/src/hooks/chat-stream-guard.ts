export const shouldIgnoreChatStreamCallback = (
  streamSettled: boolean,
  signal: AbortSignal
): boolean => streamSettled || signal.aborted;
