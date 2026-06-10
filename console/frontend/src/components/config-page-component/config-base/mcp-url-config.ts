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
