import MonacoEditor from '../index';
import { cn } from '@/utils/utils';
import { FC } from 'react';
import { EditorProps } from '@monaco-editor/react';

const JsonMonacoEditor: FC<EditorProps> = ({
  value = '',
  onChange = (value?: string): void => {},
  options = {},
  className = '',
  ...reset
}) => {
  return (
    <MonacoEditor
      className={cn('global-monaco-editor-json', className)}
      height="120px"
      defaultLanguage="json"
      value={value}
      onChange={onChange}
      options={{
        lineNumbers: 'off',
        quickSuggestions: false,
        suggestOnTriggerCharacters: false,
        folding: false,
        renderIndentGuides: false,
        ...options,
      }}
      {...reset}
    />
  );
};

export default JsonMonacoEditor;
