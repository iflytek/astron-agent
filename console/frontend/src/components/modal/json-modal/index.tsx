import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Space } from 'antd';
import Editor from '@monaco-editor/react';
import { useTranslation } from 'react-i18next';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import './index.css';

import close from '@/assets/imgs/workflow/modal-close.png';
import { JsonObject } from '@/types/resource';

interface JsonEditorModalProps {
  visible: boolean;
  initialValue?: string | object;
  onConfirm?: (jsonString: string, jsonObj: JsonObject) => void;
  onCancel?: () => void;
  width?: number | string;
  height?: number | string;
}

// t('workflow.nodes.toolNode.jsonError')

const JsonEditorModal: React.FC<JsonEditorModalProps> = ({
  visible,
  initialValue = '',
  onConfirm,
  onCancel,
  width = '50vw',
  height = '50vh',
}) => {
  const [jsonValue, setJsonValue] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { t } = useTranslation();

  // 初始化编辑器的值
  useEffect(() => {
    if (!visible) return;

    try {
      // 处理初始值（支持对象或字符串）
      const initialString =
        typeof initialValue === 'string'
          ? initialValue
          : JSON.stringify(initialValue, null, 2);
      setJsonValue(initialString || '{}');
      validateJson(initialString || '{}');
    } catch (error) {
      setJsonValue('{}');
      setIsValid(false);
      setErrorMessage(t('workflow.nodes.common.jsonError'));
    }

    return (): void => {
      editorRef.current = null;
    };
  }, [visible, initialValue]);

  // 验证JSON格式
  const validateJson = (value: string): void => {
    try {
      if (value.trim() === '' || value.trim() === '[]') {
        setIsValid(false);
        setErrorMessage(t('workflow.nodes.common.jsonError'));
        return;
      }
      JSON.parse(value);
      setIsValid(true);
      setErrorMessage('');
    } catch (error) {
      setIsValid(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('workflow.nodes.common.jsonError')
      );
    }
  };

  const handleEditorChange = (value: string | undefined): void => {
    const newValue = value || '';
    setJsonValue(newValue);
    validateJson(newValue);
  };

  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor
  ): void => {
    editorRef.current = editor;
  };

  // 确认提交
  const handleConfirm = (): void => {
    if (!isValid) {
      setIsValid(false);
      setErrorMessage(t('workflow.nodes.common.jsonError'));
      return;
    }

    try {
      const jsonObj = jsonValue.trim() ? JSON.parse(jsonValue) : null;
      onConfirm?.(jsonValue, jsonObj);
    } catch (error) {
      setIsValid(false);
      setErrorMessage(t('workflow.nodes.common.jsonError'));
    }
  };

  return (
    <Modal
      title={t('workflow.nodes.common.jsonExtract')}
      open={visible}
      onCancel={() => onCancel?.()}
      width={width}
      closeIcon={<img src={close} alt="" className="w-3 h-3 cursor-pointer" />}
      footer={
        <Space>
          <Button onClick={() => onCancel?.()}>
            {t('workflow.nodes.common.cancel')}
          </Button>
          <Button type="primary" onClick={handleConfirm} disabled={!isValid}>
            {t('workflow.nodes.toolNode.save')}
          </Button>
        </Space>
      }
      styles={{
        body: {
          paddingTop: 8,
        },
      }}
      centered
      destroyOnClose
    >
      <div className="border border-[#E4EAF] bg-[#E4EAF] rounded-lg py-3">
        <Editor
          height={height}
          language="json"
          value={jsonValue}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          className="json-editor"
          options={{
            minimap: { enabled: false },
            overviewRulerLanes: 0,
            scrollBeyondLastLine: false,
            hideCursorInOverviewRuler: true, // 不在 ruler 中显示光标
            overviewRulerBorder: false,
            automaticLayout: true,
            fontSize: 14,
            placeholder: `{${t('workflow.nodes.common.inputPlaceholder')}}`,
            lineNumbers: 'off',
            folding: false,
            glyphMargin: false,
            formatOnType: true,
            formatOnPaste: true,
            scrollbar: {
              verticalScrollbarSize: 10,
            },
          }}
        />
      </div>
      {!isValid && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: '#fff2f0',
            borderTop: '1px solid #ffccc7',
            color: '#ff4d4f',
          }}
        >
          {errorMessage}
        </div>
      )}
    </Modal>
  );
};

export default JsonEditorModal;
