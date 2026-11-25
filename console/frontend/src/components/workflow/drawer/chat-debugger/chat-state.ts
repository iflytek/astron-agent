import type {
  ChatListItem,
  FileItem,
  FileUploadItem,
  StartNodeType,
} from '../../types/drawer/chat-debugger';

function isConfigObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reopen and late graph loading initialize inputs; runtime node clones do not. */
export function createStartInputInitializer(): (
  open: boolean,
  flowId: string | undefined,
  outputs: unknown[] | undefined
) => boolean {
  let initialized: string | undefined;
  return (open, flowId, outputs) => {
    if (!open) {
      initialized = undefined;
      return false;
    }
    if (!outputs) return false;
    const key = JSON.stringify([flowId, outputs]);
    if (key === initialized) return false;
    initialized = key;
    return true;
  };
}

export function readConfigObject(
  value: string | undefined
): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return isConfigObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function appendChatReply(
  chats: ChatListItem[],
  key: 'messageContent' | 'reasoningContent' | 'content',
  value: string
): ChatListItem[] {
  const last = chats[chats.length - 1];
  if (!last) return chats;
  return [...chats.slice(0, -1), { ...last, [key]: (last[key] ?? '') + value }];
}

export function isUploadFile(value: unknown): value is FileUploadItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'size' in value &&
    typeof value.size === 'number' &&
    'url' in value &&
    typeof value.url === 'string'
  );
}

function isFileItem(value: unknown): value is FileItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'url' in value &&
    typeof value.url === 'string'
  );
}

export function isStartInputValue(
  value: unknown
): value is StartNodeType['default'] {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (Array.isArray(value) &&
      (value.every(item => typeof item === 'string') ||
        value.every(isFileItem)))
  );
}

export function finishFileUpload(
  params: StartNodeType[],
  index: number,
  fileId: string,
  response: unknown
): StartNodeType[] {
  if (
    typeof response !== 'object' ||
    response === null ||
    !('code' in response) ||
    response.code !== 0 ||
    !('data' in response) ||
    !Array.isArray(response.data) ||
    typeof response.data[0] !== 'string' ||
    !response.data[0]
  ) {
    return params;
  }
  const url = response.data[0];
  return params.map((param, paramIndex) => {
    if (paramIndex !== index || !Array.isArray(param.default)) return param;
    const files = param.default.filter(isFileItem);
    if (!files.some(file => isUploadFile(file) && file.id === fileId))
      return param;
    return {
      ...param,
      default: files.map(file =>
        isUploadFile(file) && file.id === fileId
          ? { ...file, loading: false, url }
          : file
      ),
    };
  });
}
