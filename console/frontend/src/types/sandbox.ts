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
  size: number;
  modifiedAt: string;
  fileRef?: string;
}

export interface SandboxFileListing {
  provider: string | null;
  directory: string | null;
  canDelete?: boolean;
  entries: SandboxFileEntry[];
  partial?: boolean;
  truncated: boolean;
  nextCursor?: string | null;
}
