import { v4 as uuid } from 'uuid';
import { baseURL } from '@/utils/http';

export const getFixedUrl = (path: string): string => {
  return `${baseURL}${path}`;
};

const baseWsURL = (): string => {
  // 在客户端环境下检查是否为localhost
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
  ) {
    return 'ws://172.29.201.92:8080';
  }

  // 通过import.meta.env.MODE获取构建时的环境模式
  const mode = import.meta.env.MODE;
  switch (mode) {
    case 'development':
      return 'ws://172.29.202.54:8080';
    case 'test':
      return 'ws://172.29.201.92:8080';
    default:
      // production和其他环境保持原有逻辑
      return 'ws://172.29.201.92:8080';
  }
};

export const getWsFixedUrl = (path: string): string => {
  return `${baseWsURL()}${path}`;
};

export const getAuthorization = (): string => {
  return `Bearer ${localStorage.getItem('accessToken')}`;
};

export const handleFlowExport = (currentFlow: unknown): void => {
  fetch(getFixedUrl(`/workflow/export/${currentFlow?.id}`), {
    method: 'GET',
    headers: {
      Authorization: getAuthorization(),
    },
  }).then(async res => {
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFlow?.name}.yml`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  });
};

export const findPathToNode = (tree, key, path = []): unknown => {
  for (const node of tree) {
    const label =
      node?.type === 'array-object' ? node?.label + '[0]' : node?.label;
    const newPath = [...path, label];
    if (node.id === key) {
      return newPath;
    }
    if (node.children) {
      const result = findPathToNode(node.children, key, newPath);
      if (result) {
        return result;
      }
    }
  }
  return null;
};

export const findNodeByKey = (data, key): unknown => {
  for (const node of data) {
    if (node.id === key) {
      return node;
    }
    if (node.children) {
      const found = findNodeByKey(node.children, key);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

export const getCurrentLineContent = (): string | undefined => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const selectedNode = range.startContainer;

  // 查找到包含光标的最高父元素（如 <div>）
  let currentLine = selectedNode;
  while (currentLine && currentLine.nodeType !== Node.ELEMENT_NODE) {
    currentLine = currentLine.parentNode;
  }

  if (currentLine) {
    const nodes = Array.from(currentLine.childNodes);
    let nearbyContent = '';

    nodes.forEach(node => {
      const nodeText = node.textContent || '';
      const isCursorInNode =
        range.startContainer === node || node.contains(range.startContainer);

      if (isCursorInNode) {
        // 光标在此节点内，返回此节点内容
        nearbyContent = nodeText;
      }
    });

    return nearbyContent;
  }
  return;
};

export const handleReplaceInput = (replaceSpanRef): void => {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  const currentLineContent = getCurrentLineContent();
  const cursorPosition = range.startOffset;
  const textBeforeCursor = currentLineContent?.slice(0, cursorPosition);

  // 检查是否输入了 "{"
  if (textBeforeCursor?.endsWith('{') && !replaceSpanRef.current) {
    replaceSpanRef.current = true;

    // 创建包含 "{{}}" 的 <span> 元素
    const span = document.createElement('span');
    span.textContent = '{{}}';
    span.style.color = 'blue'; // 可根据需求自定义样式

    // 获取光标所在的文本节点和偏移量
    const startContainer = range.startContainer;
    const offset = range.startOffset;

    if (startContainer.nodeType === Node.TEXT_NODE) {
      // 在当前文本节点中替换内容
      const textBefore = startContainer.textContent.slice(0, offset - 1); // 去掉最后一个 "{"
      const textAfter = startContainer.textContent.slice(offset);

      // 更新当前文本节点内容，去掉最后输入的 "{"
      startContainer.textContent = textBefore + textAfter;

      // 在当前光标位置插入 <span>
      range.setStart(startContainer, textBefore.length);
      range.insertNode(span);
    } else {
      // 若非 TextNode，直接插入 <span> 包裹的内容
      range.insertNode(span);
    }

    // const textNode = document.createTextNode('x')
    // span?.parentNode?.insertBefore(textNode, span?.nextSibling);

    // 设置光标在 "{{}}" 中间的 `{` 后
    range.setStart(span.firstChild, 2); // 光标位于 "{{}}" 中的 `{` 后
    range.collapse(true);

    // 清除现有的选区并设置新的 Range
    selection.removeAllRanges();
    selection.addRange(range);
    setTimeout(() => {
      replaceSpanRef.current = false;
    }, 100);
  }
};

export const handleReplaceSpan = (isComposingRef): void => {
  if (isComposingRef.current) return;
  // 获取光标位置的范围
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);

  // 获取当前光标的父元素
  const parentNode = range.startContainer.parentNode;

  // 判断是否在 `{{input}}` 的 `span` 标签之后
  if (parentNode.tagName === 'SPAN' && parentNode.style.color === 'blue') {
    // 确保光标位置在 `</span>` 后
    const span = parentNode;
    if (range.startOffset === span.textContent.length) {
      // 在 `span` 外部插入文字
      const str = span.textContent;
      const regex = /\}\}(.)/;
      const match = str.match(regex);
      const index = match?.index + 2;
      if (match) {
        const newTextNode = document.createTextNode(
          range.startContainer.nodeValue.slice(index)
        );
        span.textContent = span.textContent?.slice(0, index);
        span.parentNode.insertBefore(newTextNode, span.nextSibling);

        // 修正光标位置到新插入的文字节点
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.setStart(newTextNode, newTextNode.length);
        selection.addRange(newRange);

        // 删除光标多余内容（防止重复输入）
        range.startContainer.nodeValue = span.textContent;
      }
    } else if (range.startOffset === 1) {
      // 在 span 开始位置插入文本节点
      const index = 1;
      const newTextNode = document.createTextNode(
        range.startContainer.nodeValue.slice(0, index)
      );
      span.textContent = span.textContent?.slice(index);
      span.parentNode.insertBefore(newTextNode, span);

      // 修正光标位置到新插入的文字节点
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStart(newTextNode, 1);
      selection.addRange(newRange);
    }
  }
};

export const findNodeByValue = (value, nodes): unknown | null => {
  for (const node of nodes) {
    // 检查当前节点的值是否匹配
    if (node.value === value) {
      return {
        ...node,
        id: uuid(),
      };
    }

    // 如果当前节点有子节点，递归查找
    if (node.children) {
      const found = findNodeByValue(value, node.children);
      if (found) {
        return {
          ...found,
          id: uuid(),
        }; // 找到匹配的节点
      }
    }

    // 检查当前节点的引用
    if (node.references) {
      const found = findNodeByValue(value, node.references);
      if (found) {
        return {
          ...found,
          id: uuid(),
        }; // 找到匹配的节点
      }
    }
  }

  return null; // 如果没有找到匹配的节点
};
