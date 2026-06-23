import type { AgentSkill } from '@/types/skill';
import type { AgentTool } from '@/types/plugin-store';

export const isValidMcpServerUrl = (url: string): boolean => {
  const value = url.trim();
  if (!value) {
    return true;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

export const normalizeMcpServerUrls = (urls?: unknown): string[] => {
  if (!urls) {
    return [];
  }

  let source = urls;
  if (typeof urls === 'string') {
    try {
      source = JSON.parse(urls);
    } catch {
      source = urls.split(',');
    }
  }

  if (!Array.isArray(source)) {
    return [];
  }

  return Array.from(
    new Set(
      source
        .map(item => (typeof item === 'string' ? item.trim() : ''))
        .filter(url => Boolean(url) && isValidMcpServerUrl(url))
    )
  );
};

export const normalizeSkills = (skills?: unknown): AgentSkill[] => {
  let source = skills;
  if (typeof skills === 'string') {
    try {
      source = JSON.parse(skills);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(source)) {
    return [];
  }

  const seen = new Set<number>();
  const result: AgentSkill[] = [];
  for (const item of source) {
    const skillId = Number(item?.skillId ?? item?.id);
    if (!skillId || seen.has(skillId)) {
      continue;
    }
    seen.add(skillId);
    result.push({
      skillId,
      name: String(item?.name ?? ''),
      description: String(item?.description ?? ''),
    });
  }
  return result.slice(0, 30);
};

export const normalizeTools = (tools?: unknown): AgentTool[] => {
  let source = tools;
  if (typeof tools === 'string') {
    try {
      source = JSON.parse(tools);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(source)) {
    return [];
  }

  const seen = new Set<string>();
  const result: AgentTool[] = [];
  for (const item of source) {
    const toolId = String(item?.toolId ?? '').trim();
    if (!toolId || seen.has(toolId)) {
      continue;
    }
    seen.add(toolId);
    result.push({
      toolId,
      name: String(item?.name ?? ''),
      description: String(item?.description ?? ''),
      icon: item?.icon ? String(item.icon) : undefined,
    });
  }
  return result;
};

export const hasInvalidMcpServerUrls = (urls?: unknown): boolean => {
  if (!urls) {
    return false;
  }

  let source = urls;
  if (typeof urls === 'string') {
    try {
      source = JSON.parse(urls);
    } catch {
      source = urls.split(',');
    }
  }

  if (!Array.isArray(source)) {
    return false;
  }

  return source.some(item => {
    if (typeof item !== 'string') {
      return false;
    }
    const value = item.trim();
    return Boolean(value) && !isValidMcpServerUrl(value);
  });
};
