export interface SkillSandboxConfig {
  provider: string;
  enabled: boolean;
  apiKey: string;
  apiKeyMasked?: boolean;
  timeoutSeconds: number;
  allowInternetAccess: boolean;
  e2bAllowInternetAccess?: boolean;
  localAvailable?: boolean;
  lastTestStatus?: string;
  lastTestMessage?: string;
  lastTestTime?: string;
  spaceId?: number;
}

export interface SandboxFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
}

export interface SandboxFileListing {
  entries: SandboxFileEntry[];
  truncated: boolean;
  nextCursor?: string | null;
}
