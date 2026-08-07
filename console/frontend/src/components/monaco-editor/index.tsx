import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from 'react';
import Editor, { EditorProps, OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';

const editorOptions: EditorProps['options'] = {
  scrollbar: {
    verticalScrollbarSize: 4,
    horizontalScrollbarSize: 4,
    vertical: 'visible',
    horizontal: 'visible',
    useShadows: false,
  },
  minimap: { enabled: false }, // 如果不需要代码缩略图，可禁用 minimap
};

// 使用 forwardRef 让父组件可以获取子组件的 ref
const Index = forwardRef<
  { scrollToTop: () => void; scrollToBottom: () => void },
  EditorProps & {
    onWheel?: () => void;
    options?: EditorProps['options'] & { renderIndentGuides?: boolean };
  }
>(({ onWheel = null, options = {}, ...rest }, ref) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<null | HTMLDivElement>(null);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    scrollToTop: (): void => {
      if (editorRef.current) {
        editorRef?.current?.setScrollPosition({ scrollTop: 0 });
      }
    },
    scrollToBottom: (): void => {
      if (editorRef.current) {
        const editor = editorRef.current;
        const viewportHeight = editor.getLayoutInfo().height; // 获取可视区域高度
        const contentHeight = editor.getContentHeight() - viewportHeight; // 获取内容总高度

        // 计算滚动位置，使视口居中
        const scrollTop = contentHeight - viewportHeight / 2;

        // 设置滚动位置
        editor.setScrollTop(Math.max(0, scrollTop)); // 确保不会滚动到负值
      }
    },
  }));

  const handleEditorDidMount: OnMount = editor => {
    editorRef.current = editor;

    const container = editor.getDomNode();
    containerRef.current = container as HTMLDivElement;
    if (container && onWheel) {
      container.addEventListener('wheel', onWheel);
    }
  };

  useEffect(() => {
    const container = containerRef.current;

    return (): void => {
      if (container && onWheel) {
        container.removeEventListener('wheel', onWheel);
      }
    };
  }, [onWheel]);

  return (
    <Editor
      theme="vs-dark"
      options={{
        ...editorOptions,
        ...options,
      }}
      onMount={handleEditorDidMount} // 注册编辑器挂载回调
      {...rest}
    />
  );
});

export default Index;
