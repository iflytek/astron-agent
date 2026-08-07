import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, Element, Parent } from 'hast';

/**
 * 自定义脚注的 Rehype 插件 (适用于 react-markdown)
 * 匹配格式: [^1^] 或 [^12^] (最多支持2位数)
 * 转换为: <span class="custom-footnote" data-index="1">1</span>
 */

interface FootnoteElement extends Element {
  type: 'element';
  tagName: 'span';
  properties: {
    className: string[];
    dataIndex: string;
  };
  children: Text[];
}

/**
 * 创建脚注 span 元素
 */
function createFootnoteElement(number: string): FootnoteElement {
  return {
    type: 'element',
    tagName: 'span',
    properties: {
      className: ['custom-footnote'],
      dataIndex: number,
    },
    children: [
      {
        type: 'text',
        value: number,
      },
    ],
  };
}

/**
 * 自定义脚注插件 - 作为 rehype 插件使用
 */
const customFootnotePlugin: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(
      tree,
      'text',
      (node: Text, index: number | undefined, parent: Parent | undefined) => {
        if (!parent || typeof index === 'undefined') return;

        const text = node.value;
        const footnoteRegex = /\[\^(\d{1,2})\^\]/g;

        // 检查是否包含脚注格式
        if (!footnoteRegex.test(text)) return;

        // 重置正则表达式状态
        footnoteRegex.lastIndex = 0;

        const newChildren: (Text | FootnoteElement)[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        // 处理所有匹配的脚注
        while ((match = footnoteRegex.exec(text)) !== null) {
          const matchStart = match.index;
          const matchEnd = matchStart + match[0].length;
          const footnoteNumber = match[1];

          // 添加脚注前的文本
          if (matchStart > lastIndex) {
            const beforeText = text.slice(lastIndex, matchStart);
            if (beforeText) {
              newChildren.push({
                type: 'text',
                value: beforeText,
              });
            }
          }

          // 创建脚注元素（确保 footnoteNumber 存在）
          if (footnoteNumber) {
            newChildren.push(createFootnoteElement(footnoteNumber));
          }

          lastIndex = matchEnd;
        }

        // 添加剩余文本
        if (lastIndex < text.length) {
          const remainingText = text.slice(lastIndex);
          if (remainingText) {
            newChildren.push({
              type: 'text',
              value: remainingText,
            });
          }
        }

        // 替换原文本节点
        if (newChildren.length > 0) {
          parent.children.splice(index, 1, ...newChildren);
        }
      }
    );
  };
};

export default customFootnotePlugin;
