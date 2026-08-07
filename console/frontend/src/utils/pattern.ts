export interface PatternRule {
  pattern: RegExp;
  message: string;
}

export const patterns: Record<string, PatternRule> = {
  spaceName: {
    pattern: /^[a-zA-Z0-9\u4e00-\u9fa5_]+$/,
    message: '仅支持中英文、数字、下划线',
  },
  phoneNumber: {
    pattern: /^1[3-9]\d{9}$/,
    message: '请输入正确的手机号',
  },
};
