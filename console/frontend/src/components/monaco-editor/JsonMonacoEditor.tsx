import React from 'react';
import MonacoEditor from './index';
import { cn } from '@/utils';

function JsonMonacoEditor({
  value = '',
  onChange = (value?: string): void => {},
  options = {},
  className = '',
  ...reset
}): React.ReactElement {
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
}

export default JsonMonacoEditor;
