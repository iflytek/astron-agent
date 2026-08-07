import DOMPurify from 'dompurify';

/**
 * 清理HTML标签 - 方案1: 使用 DOMPurify 库（最安全的方式）
 * @param html - 需要清理的HTML字符串
 * @param allowHtml - 是否允许安全的HTML标签，默认为 false（移除所有HTML）
 * @returns 清理后的字符串
 */
export const sanitizeHTML = (
  html: string,
  allowHtml: boolean = false
): string => {
  if (!html) return '';

  if (allowHtml) {
    // 允许安全的HTML标签，移除危险的脚本和属性
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'em',
        'u',
        'span',
        'div',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'a',
      ],
      ALLOWED_ATTR: ['href', 'title', 'target'],
      ALLOW_DATA_ATTR: false,
    });
  } else {
    // 移除所有HTML标签，只保留纯文本
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [],
      KEEP_CONTENT: true,
    });
  }
};

/**
 * 为 dangerouslySetInnerHTML 创建安全的HTML内容 - 方案3
 * @param html - 需要渲染的HTML字符串
 * @returns 清理后可以安全渲染的对象
 */
export const createSafeHTML = (html: string): { __html: string } => {
  const sanitized = sanitizeHTML(html, true);
  return { __html: sanitized };
};

/**
 * 移除所有HTML标签并返回纯文本
 * @param html - 需要清理的HTML字符串
 * @returns 纯文本内容
 */
export const getTextContent = (html: string): string => {
  return sanitizeHTML(html, false);
};
