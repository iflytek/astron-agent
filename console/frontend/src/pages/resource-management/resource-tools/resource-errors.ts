export type ResourceFailure = { title: string; description: string };
export type FailureContext = { title: string; recovery: string };

/** HTTP rejects both Error instances and the Console's {message, desc} payloads. */
export function resourceFailure(
  reason: unknown,
  context: FailureContext
): ResourceFailure {
  let detail = '';
  if (reason instanceof SyntaxError) {
    detail = 'JSON 格式无效，请检查括号、引号和逗号。';
  } else if (reason && typeof reason === 'object') {
    const value = reason as { message?: unknown; desc?: unknown };
    detail =
      [value.message, value.desc].find(
        (message): message is string =>
          typeof message === 'string' && Boolean(message.trim())
      ) || '';
  }
  return {
    title: context.title,
    description: detail ? `${detail} ${context.recovery}` : context.recovery,
  };
}

export const httpCallFailure: FailureContext = {
  title: 'HTTP 工具调用失败',
  recovery: '请检查请求参数、工具授权和服务状态，然后重新运行测试。',
};
export const mcpCallFailure: FailureContext = {
  title: 'MCP 工具调用失败',
  recovery: '请检查工具参数后重新运行测试；连接异常时请重新发现服务工具。',
};
export const mcpDiscoveryFailure: FailureContext = {
  title: 'MCP 工具发现失败',
  recovery: '请在 MCP 服务管理中检查连接与授权，然后重新发现。',
};
