import React, {
  AnchorHTMLAttributes,
  ClassAttributes,
  FC,
  StyleHTMLAttributes,
  SVGProps,
  useEffect,
} from 'react';
import ReactMarkdown, { ExtraProps } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { v4 as uuid } from 'uuid';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const GlobalMarkDown: FC<{
  content: string;
  isSending: boolean;
}> = ({
  content,
  isSending = false,
}: {
  content: string;
  isSending: boolean;
}) => {
  const globalMarkdownId = uuid();

  function addCursorToLastElement(): void {
    // 清除之前的光标类
    const container = document.getElementById(globalMarkdownId);
    const mdContainer = container?.querySelector('.global-markdown');
    const previousCursor = mdContainer?.querySelector(
      '.global-markdown-flashing-cursor'
    );
    if (previousCursor) {
      previousCursor.classList.remove('global-markdown-flashing-cursor');
    }

    // 获取最后一个子元素
    const lastElement = getLastDeepestChild(mdContainer as Element);

    if (lastElement) {
      lastElement.classList.add('global-markdown-flashing-cursor');
    }
  }
  function getLastDeepestChild(element: Element): Element {
    while (element?.lastElementChild) {
      element = element?.lastElementChild;
      if (element?.textContent?.trim()) {
        return element as Element;
      }
    }
    return element;
  }

  function clearCursorToLastElement(): void {
    const container = document.getElementById(globalMarkdownId);
    const previousCursor = container?.querySelectorAll(
      '.global-markdown-flashing-cursor'
    );
    if (previousCursor) {
      Array.from(previousCursor).forEach(function (element) {
        element.classList.remove('global-markdown-flashing-cursor');
      });
    }
  }

  useEffect(() => {
    if (isSending) {
      addCursorToLastElement();
    } else {
      clearCursorToLastElement();
    }
  }, [content, isSending]);

  const MyLink = ({
    href,
    children,
  }: ClassAttributes<HTMLAnchorElement> &
    AnchorHTMLAttributes<HTMLAnchorElement> &
    ExtraProps): React.ReactNode => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );

  const ImageRenderer = ({
    src,
    alt,
  }: SVGProps<SVGImageElement> &
    ExtraProps & {
      src?: string;
      alt?: string;
    }): React.ReactNode => (
    <img src={src} alt={alt} style={{ maxWidth: '100%' }} />
  );

  // 作用域化样式函数
  const scopeStyles = (styles: string, scopeClass: string): string => {
    // 添加作用域类到每个样式规则
    return styles.replace(
      /([^{]+)\{([^}]*)\}/g,
      (match, selectors, stylesBlock) => {
        // 处理每个选择器：为每个选择器添加作用域类，但排除@开头的规则（如媒体查询）
        if (selectors.trim().startsWith('@')) {
          return match; // 媒体查询
        }

        const scopedSelectors = selectors
          .split(',')
          .map((selector: string) => {
            const trimmed = selector.trim();
            // 选择器是:root或html/body等，特殊处理
            if (
              trimmed === ':root' ||
              trimmed === 'html' ||
              trimmed === 'body'
            ) {
              return `[data-${globalMarkdownId}]`;
            }
            return `.${scopeClass} ${trimmed}`;
          })
          .join(', ');

        return `${scopedSelectors} {${stylesBlock}}`;
      }
    );
  };

  const ScopedStyle = (
    props: ClassAttributes<HTMLStyleElement> &
      StyleHTMLAttributes<HTMLStyleElement> &
      ExtraProps
  ): React.ReactNode => {
    const { children, node, ...rest } = props;
    // 从style标签中获取样式内容
    const styleContent = Array.isArray(children)
      ? children.join('')
      : children || '';
    // 添加作用域
    const scopedStyles = scopeStyles(styleContent as string, 'markdown-body');

    return <style {...rest}>{scopedStyles}</style>;
  };

  return (
    <div
      id={globalMarkdownId}
      className="flex items-center justify-center markdown-body"
    >
      <ReactMarkdown
        skipHtml={false}
        className="global-markdown"
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeRaw, remarkGfm, rehypeKatex]}
        components={{
          a: MyLink,
          image: ImageRenderer,
          code(props) {
            const { children, className, node, ...rest } = props;

            const match = /language-(\w+)/.exec(className || '');
            return match && children ? (
              // @ts-ignore
              <SyntaxHighlighter
                {...rest}
                PreTag="div"
                children={String(children)}
                language={match[1]}
                style={github}
              />
            ) : (
              <code {...rest} className={className}>
                {children}
              </code>
            );
          },
          style: ScopedStyle,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default GlobalMarkDown;
