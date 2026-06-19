import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { Drawer, message, Spin, Tooltip, Input } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { codeRun } from '@/services/flow';
import useUserStore from '@/store/user-store';
import { isJSON } from '@/utils';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { getCommonConfig } from '@/services/common';
import MonacoEditor from '@/components/monaco-editor';
import { useMemoizedFn } from 'ahooks';
import JsonMonacoEditor from '@/components/monaco-editor/JsonMonacoEditor';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { getFixedUrl, getAuthorization } from '@/components/workflow/utils';
import { useAICodeInputBoxProps } from '@/components/workflow/types';

// 类型导入
import {
  CodeIDEADrawerlInfo,
  CodeIDEAMaskProps,
  VarData,
  CodeRunParams,
  CodeRunResponse,
  AICodeParams,
  AICodeResponse,
  FlowType,
} from '@/components/workflow/types';

// 从统一的图标管理中导入
import { Icons } from '@/components/workflow/icons';

// 获取 Code IDEA 模块的图标
const icons = Icons.codeIdea;

const CodeIDEAHeader = ({
  setShowPythonPackageModal,
  canvasesDisabled,
  temporaryStorageCode,
  value,
  setAiCodeInputShow,
  aiCodeInputShow,
}): React.ReactElement => {
  const { t } = useTranslation();
  const setCodeIDEADrawerlInfo = useFlowsManager(
    state => state.setCodeIDEADrawerlInfo
  );
  const setShowNodeList = useFlowsManager(state => state.setShowNodeList);
  const handleCloseDrawer = useMemoizedFn((): void => {
    setCodeIDEADrawerlInfo({ open: false, nodeId: '' });
    setShowNodeList(true);
  });
  return (
    <div className="flex items-center justify-between px-[14px] py-5 bg-[#41414d]">
      <div className="flex items-center gap-4 font-semibold text-lg">
        <span className="text-[#fff]">
          {t('workflow.nodes.codeIDEA.language')}
        </span>
        <span className="text-[#8D8DB0] flex items-center gap-2">
          <span>python</span>
          <span className="w-[1px] h-[10px] bg-[#8D8DB0] mt-1"></span>
          <div className="flex items-center gap-2 text-[#fff] text-sm mt-1">
            <span>{t('workflow.nodes.codeIDEA.pythonPackages')}</span>
            <div
              className="flex items-center gap-2 cursor-pointer text-[#6356EA]"
              onClick={() => setShowPythonPackageModal(true)}
            >
              <span>{t('workflow.nodes.codeIDEA.viewDetails')}</span>
              <img src={icons.arrowLeft} className="w-[6px] h-[12px]" alt="" />
            </div>
          </div>
        </span>
      </div>
      <div className="flex items-center gap-5">
        {!canvasesDisabled && (
          <div
            className="rounded-lg bg-[#4a5961] flex items-center px-[14px] py-2 gap-1.5 text-[#fff] cursor-pointer"
            onClick={() => {
              temporaryStorageCode.current = value;
              setAiCodeInputShow(true);
            }}
          >
            <img src={icons.aiCode} className="w-5 h-5" alt="" />
            <span>{t('workflow.nodes.codeIDEA.aiCode')}</span>
          </div>
        )}
        {!aiCodeInputShow && (
          <img
            src={icons.close}
            className="w-3 h-3 cursor-pointer"
            alt=""
            onClick={() => handleCloseDrawer()}
          />
        )}
      </div>
    </div>
  );
};

const CodeEditor = ({
  editorRef,
  value,
  canvasesDisabled,
  handleChangeNodeParam,
}): React.ReactElement => {
  return (
    <div className="flex-1 global-monaco-editor-python">
      <MonacoEditor
        ref={editorRef}
        defaultLanguage="python"
        value={value}
        onChange={(val: string) =>
          handleChangeNodeParam((data, v) => (data.nodeParam.code = v), val)
        }
        options={{
          readOnly: canvasesDisabled,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          renderWhitespace: 'all',
        }}
      />
    </div>
  );
};

const useAICodeInputBox = ({
  value,
  inputs,
  isReciving,
  wsMessageStatus,
  editorRef,
  setUserWheel,
  setIsReciving,
  setGenerateAIcode,
  prompt,
  setRePrompt,
  setPrompt,
  handleChangeNodeParam,
  errCodeMsg,
  textQueue,
  controllerRef,
}): useAICodeInputBoxProps => {
  const { t } = useTranslation();
  const extractInputs = useMemoizedFn((functionString: string): string[] => {
    const pattern = /\((.*?)\)/;
    const match = functionString.match(pattern);

    if (match) {
      return match[1].replace(/\s+/g, '').split(',');
    }
    return [];
  });
  const varDatas = useMemo<VarData[]>(() => {
    return (
      inputs?.map(
        (input): VarData => ({
          name: input?.name || '',
          type: input?.schema?.type,
        })
      ) || []
    );
  }, [inputs]);
  const handleAiCode = useMemoizedFn(
    (inputPrompt?: string, codeRevision = false): void => {
      if (isReciving) return;
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
      textQueue.current = [];
      controllerRef.current = new AbortController();
      const vars = extractInputs(value || '');
      const params: AICodeParams = {
        code: value || '',
        prompt: inputPrompt || prompt,
        var: JSON.stringify(
          varDatas?.filter(item => vars?.includes(item?.name))
        ),
        errMsg: codeRevision ? errCodeMsg : '',
      };
      wsMessageStatus.current = 'start';
      if (editorRef.current) {
        editorRef.current.scrollToTop();
      }
      setUserWheel(false);
      setIsReciving(true);
      setGenerateAIcode(false);
      if (prompt) setRePrompt(prompt);
      setPrompt('');
      handleChangeNodeParam((data, value) => (data.nodeParam.code = value), '');
      fetchEventSource(getFixedUrl('/prompt/ai-code'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: getAuthorization(),
        },
        body: JSON.stringify(params),
        signal: controllerRef.current.signal,
        openWhenHidden: true,
        onerror() {
          controllerRef.current?.abort();
          controllerRef.current = null;
          wsMessageStatus.current = 'end';
        },
        onmessage(e) {
          if (e.data && isJSON(e.data)) {
            const data: AICodeResponse = JSON.parse(e.data);
            const content = data?.payload?.message?.content;
            if (content) {
              textQueue.current = [...textQueue.current, ...content.split('')];
            }
            if (data?.header?.status === 2) {
              wsMessageStatus.current = 'end';
            }
          }
        },
        onclose() {
          controllerRef.current?.abort();
          controllerRef.current = null;
          wsMessageStatus.current = 'end';
        },
      });
    }
  );
  const handleSendMessage = useMemoizedFn((): void => {
    if (!prompt?.trim()) {
      message.warning(t('workflow.nodes.codeIDEA.aiDescriptionRequired'));
      return;
    }
    handleAiCode();
  });
  return {
    handleAiCode,
    handleSendMessage,
  };
};

const AICodeInputBox = ({
  value,
  inputs,
  isReciving,
  wsMessageStatus,
  editorRef,
  setUserWheel,
  setIsReciving,
  setGenerateAIcode,
  prompt,
  setRePrompt,
  setPrompt,
  handleChangeNodeParam,
  setAiCodeInputShow,
  temporaryStorageCode,
  generateAIcode,
  rePrompt,
  errCodeMsg,
  textQueue,
  controllerRef,
}): React.ReactElement => {
  const { t } = useTranslation();
  const { handleAiCode, handleSendMessage } = useAICodeInputBox({
    value,
    inputs,
    isReciving,
    wsMessageStatus,
    editorRef,
    setUserWheel,
    setIsReciving,
    setGenerateAIcode,
    prompt,
    setRePrompt,
    setPrompt,
    handleChangeNodeParam,
    errCodeMsg,
    textQueue,
    controllerRef,
  });
  return (
    <div className="w-full bg-[#000]">
      <div
        className="mx-[30px] px-5 h-[127px] flex flex-col justify-center gap-2.5 pr-[42px] relative"
        style={{
          backgroundImage: `url(${icons.aiCodeBg})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {isReciving && (
          <div
            className="absolute top-[-30px] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex items-center gap-2 justify-center text-[#fff]"
            style={{
              width: '138px',
              height: '48px',
              backgroundImage: `url(${icons.runningBg})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {value ? (
              <img src={icons.codeGen} className="w-[22px] h-[22px]" alt="" />
            ) : (
              <img
                src={icons.codeThink}
                className="w-[22px] h-[22px] flow-rotate-center"
                alt=""
              />
            )}
            <span>
              {value
                ? t('workflow.nodes.codeIDEA.generating')
                : t('workflow.nodes.codeIDEA.aiThinking')}
            </span>
          </div>
        )}
        <img
          src={icons.close}
          className="w-3 h-3 cursor-pointer absolute top-2 right-4"
          alt=""
          onClick={() => {
            controllerRef.current?.abort();
            controllerRef.current = null;
            wsMessageStatus.current = 'end';
            textQueue.current = [];
            setAiCodeInputShow(false);
            handleChangeNodeParam(
              (data, value) => (data.nodeParam.code = value),
              temporaryStorageCode.current
            );
            setIsReciving(false);
            setPrompt('');
            setGenerateAIcode(false);
          }}
        />
        <Input
          className="code-idea-input"
          placeholder={t('workflow.nodes.codeIDEA.inputPlaceholder')}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onPressEnter={() => handleSendMessage()}
        />
        <div className="flex items-center justify-between text-[#ffffffb3] text-sm">
          {generateAIcode ? (
            <div
              className="flex items-center gap-2.5"
              style={{
                height: '32px',
                lineHeight: '32px',
              }}
            >
              <div
                className="bg-[#383c43] px-[36px] rounded-lg cursor-pointer hover:text-[#fff] hover:bg-[#5b696a]"
                onClick={() => {
                  setAiCodeInputShow(false);
                  setGenerateAIcode(false);
                }}
              >
                {t('workflow.nodes.codeIDEA.accept')}
              </div>
              <div
                className="bg-[#383c43] px-[36px] rounded-lg cursor-pointer hover:text-[#fff] hover:bg-[#5b696a]"
                onClick={() => {
                  controllerRef.current?.abort();
                  controllerRef.current = null;
                  wsMessageStatus.current = 'end';
                  textQueue.current = [];
                  handleChangeNodeParam(
                    (data, value) => (data.nodeParam.code = value),
                    temporaryStorageCode.current
                  );
                  setIsReciving(false);
                  setGenerateAIcode(false);
                }}
              >
                {t('workflow.nodes.codeIDEA.reject')}
              </div>
              <div className="bg-[#383a44] hover:bg-[#5b696a] w-[32px] h-[32px] rounded-lg flex items-center justify-center cursor-pointer">
                <img
                  src={icons.refresh}
                  className="w-[23px] h-[23px]"
                  alt=""
                  onClick={() => handleAiCode(rePrompt)}
                />
              </div>
            </div>
          ) : (
            <div className="h-[10px]"></div>
          )}
          <div
            className="flex items-center justify-center gap-1 cursor-pointer"
            style={{
              width: '104px',
              height: '36px',
              backgroundImage: `url(${icons.aiSend})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
            }}
            onClick={() => handleSendMessage()}
          >
            <img src={icons.codeRun} className="w-3 h-3.5" alt="" />
            <span>{t('workflow.nodes.codeIDEA.send')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface IOTestPanelProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  setOutput: React.Dispatch<React.SetStateAction<string>>;
  setErrCodeMsg: React.Dispatch<React.SetStateAction<string>>;
  setCodeRunningStatus: React.Dispatch<React.SetStateAction<string>>;
  value?: string;
  currentFlow?: FlowType;
  codeRunningStatus: string;
  loading: boolean;
  errCodeMsg: string;
  output: string;
  nodeId?: string;
}

const IOTestPanel = ({
  setLoading,
  input,
  setInput,
  setOutput,
  setErrCodeMsg,
  setCodeRunningStatus,
  value,
  currentFlow,
  codeRunningStatus,
  loading,
  errCodeMsg,
  output,
  nodeId,
}: IOTestPanelProps): React.ReactElement => {
  const { t } = useTranslation();
  const user = useUserStore(state => state.user);
  const generateRandomString = useMemoizedFn((): string => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const length = Math.floor(Math.random() * 8) + 5;

    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * alphabet.length);
      result += alphabet[randomIndex];
    }

    return result;
  });
  const handleGenerateOutput = useMemoizedFn((): void => {
    if (!isJSON(input)) {
      message.warning(t('workflow.nodes.codeIDEA.toolInputMustBeJson'));
      return;
    }
    setLoading(true);
    const inputObject = JSON.parse(input);
    const variables: Array<{ name: string; content: unknown }> = [];
    for (const key in inputObject) {
      if (Object.hasOwn(inputObject, key)) {
        variables.push({
          name: key,
          content: inputObject[key],
        });
      }
    }
    const params: CodeRunParams = {
      code: value || '',
      variables,
      app_id: currentFlow?.appId,
      uid: user?.uid.toString(),
      flow_id: currentFlow?.flowId,
      node_id: nodeId,
    };
    codeRun(params)
      .then((res: CodeRunResponse): void => {
        if (res.code === 0) {
          setOutput(JSON.stringify(res?.data, null, 2));
          message.success(res?.message);
          setErrCodeMsg('');
          setCodeRunningStatus('success');
        } else {
          message.error(res?.message);
          setErrCodeMsg(res?.message || '');
          setCodeRunningStatus('fail');
        }
      })
      .finally((): void => setLoading(false));
  });
  return (
    <div className="w-full bg-[#000]">
      <div
        className="flex items-center gap-5 px-[30px] mx-auto max-h-[340px]"
        style={{
          height: '31vh',
        }}
      >
        <div className="flex-1 bg-[#25252C] rounded-lg p-5 h-full">
          <div className="flex items-center justify-between text-base mb-4">
            <div className="text-[#8D8DB0]">
              {t('workflow.nodes.codeIDEA.inputTest')}
            </div>
            <div className="flex items-center gap-4">
              <Tooltip
                title={t('workflow.nodes.codeIDEA.autoGenerate')}
                overlayClassName="black-tooltip config-secret"
              >
                <img
                  src={icons.autoGenerate}
                  className="w-4 h-4 cursor-pointer"
                  alt=""
                  onClick={() =>
                    setInput(
                      JSON.stringify(
                        {
                          input: generateRandomString(),
                        },
                        null,
                        2
                      )
                    )
                  }
                />
              </Tooltip>
              <div
                className="flex items-center gap-1.5 text-[#fff] cursor-pointer"
                onClick={() => !loading && handleGenerateOutput()}
              >
                <img src={icons.codeRun} className="w-3 h-3.5" alt="" />
                <span>{t('workflow.nodes.codeIDEA.run')}</span>
              </div>
            </div>
          </div>
          <JsonMonacoEditor value={input} onChange={value => setInput(value)} />
        </div>
        <div
          className="flex-1 bg-[#25252C] rounded-lg p-5 h-full"
          style={{
            border:
              codeRunningStatus === 'success'
                ? '1px solid #4f986f'
                : codeRunningStatus === 'fail'
                  ? '1px solid #f74e43'
                  : '',
            boxShadow:
              codeRunningStatus === 'success'
                ? '0px 0px 26px 2px rgba(79,152,111,0.62) inset'
                : codeRunningStatus === 'fail'
                  ? '0px 0px 26px 2px rgba(247,78,67,0.26) inset'
                  : '',
          }}
        >
          <div className="flex items-center justify-between text-base mb-4">
            <div className="text-[#8D8DB0]">
              {t('workflow.nodes.codeIDEA.outputResult')}
            </div>
            {codeRunningStatus === 'success' ? (
              <div className="flex items-center gap-1 text-[#5CAA7E]">
                <img
                  src={icons.runSuccess}
                  className="w-[15px] h-[15px]"
                  alt=""
                />
                <span>{t('workflow.nodes.codeIDEA.runSuccess')}</span>
              </div>
            ) : null}
          </div>
          {loading ? (
            <Spin indicator={<LoadingOutlined spin />} />
          ) : codeRunningStatus === 'fail' ? (
            <pre className="text-sm text-[#F74E43] w-[599px] h-[118px] bg-[#fff] rounded-lg py-1 px-2">
              {errCodeMsg}
            </pre>
          ) : (
            <JsonMonacoEditor
              value={output}
              onChange={value => setOutput(value)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const useCodeIDEAEffect = ({
  editorRef,
  textQueue,
  wsMessageStatus,
  isReciving,
  setIsReciving,
  setGenerateAIcode,
  handleChangeNodeParam,
  userWheel,
  value,
  open,
}): void => {
  useEffect(() => {
    const handleKeyDown = (e: Event): void =>
      (e as KeyboardEvent).stopPropagation();
    const dom = document.querySelector('.ant-drawer');
    if (dom) {
      dom.addEventListener('keydown', handleKeyDown);
    }
    return (): void => dom?.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isReciving) {
      timer = setInterval(() => {
        const content = textQueue.current.slice(0, 1).join('');
        textQueue.current = textQueue.current.slice(1);
        if (content) {
          handleChangeNodeParam(
            (data, value) => (data.nodeParam.code = value),
            (value || '') + content
          );
          if (editorRef.current && !userWheel) {
            editorRef.current.scrollToBottom();
          }
        }
        if (!textQueue.current.length && wsMessageStatus.current === 'end') {
          setIsReciving(false);
          setGenerateAIcode(true);
        }
      }, 10);
    } else {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      textQueue.current = [];
    }

    return (): void => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isReciving, value, userWheel]);
};

function CodeIDEA(): React.ReactElement {
  const editorRef = useRef<unknown>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const textQueue = useRef<string[]>([]);
  const wsMessageStatus = useRef<string>('end');
  const temporaryStorageCode = useRef<string>('');
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const currentFlow = useFlowsManager(state => state.currentFlow) as FlowType;
  const codeIDEADrawerlInfo = useFlowsManager(
    state => state.codeIDEADrawerlInfo
  ) as CodeIDEADrawerlInfo;
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [aiCodeInputShow, setAiCodeInputShow] = useState(false);
  const [isReciving, setIsReciving] = useState(true);
  const [rePrompt, setRePrompt] = useState('');
  const [showPythonPackageModal, setShowPythonPackageModal] = useState(false);
  const [errCodeMsg, setErrCodeMsg] = useState('');
  const [codeRunningStatus, setCodeRunningStatus] = useState('');
  const [generateAIcode, setGenerateAIcode] = useState(false);
  const [userWheel, setUserWheel] = useState(false);
  const id = useMemo(
    () => codeIDEADrawerlInfo.nodeId,
    [codeIDEADrawerlInfo.nodeId]
  );
  const open = useMemo(
    () => codeIDEADrawerlInfo.open,
    [codeIDEADrawerlInfo.open]
  );
  const { handleChangeNodeParam, currentNode, inputs } = useNodeCommon({
    id,
  });
  const value = useMemo(
    () => currentNode?.data?.nodeParam?.code,
    [currentNode]
  );
  useEffect(() => {
    if (!open) {
      controllerRef.current?.abort();
      controllerRef.current = null;
      wsMessageStatus.current = 'end';
      textQueue.current = [];
      setIsReciving(false);
    }
  }, [open]);

  useEffect(() => {
    return (): void => {
      controllerRef.current?.abort();
      controllerRef.current = null;
      wsMessageStatus.current = 'end';
      textQueue.current = [];
    };
  }, []);
  useCodeIDEAEffect({
    editorRef,
    textQueue,
    wsMessageStatus,
    isReciving,
    setIsReciving,
    setGenerateAIcode,
    handleChangeNodeParam,
    userWheel,
    value,
    open,
  });
  return (
    <Drawer
      rootClassName="code-idea-container"
      placement="left"
      open={open}
      destroyOnClose
      mask={false}
    >
      <div
        className="flex flex-col h-full gap-[10px] bg-[#000] relative"
        onKeyDown={e => e.stopPropagation()}
      >
        {showPythonPackageModal && (
          <CodeIDEAMask setShowPythonPackageModal={setShowPythonPackageModal} />
        )}
        <CodeIDEAHeader
          setShowPythonPackageModal={setShowPythonPackageModal}
          canvasesDisabled={canvasesDisabled}
          temporaryStorageCode={temporaryStorageCode}
          value={value}
          setAiCodeInputShow={setAiCodeInputShow}
          aiCodeInputShow={aiCodeInputShow}
        />
        <CodeEditor
          editorRef={editorRef}
          value={value}
          canvasesDisabled={canvasesDisabled}
          handleChangeNodeParam={handleChangeNodeParam}
        />
        {aiCodeInputShow && (
          <AICodeInputBox
            value={value}
            inputs={inputs}
            isReciving={isReciving}
            wsMessageStatus={wsMessageStatus}
            editorRef={editorRef}
            setUserWheel={setUserWheel}
            setIsReciving={setIsReciving}
            setGenerateAIcode={setGenerateAIcode}
            prompt={prompt}
            setRePrompt={setRePrompt}
            setPrompt={setPrompt}
            handleChangeNodeParam={handleChangeNodeParam}
            setAiCodeInputShow={setAiCodeInputShow}
            temporaryStorageCode={temporaryStorageCode}
            generateAIcode={generateAIcode}
            rePrompt={rePrompt}
            errCodeMsg={errCodeMsg}
            textQueue={textQueue}
            controllerRef={controllerRef}
          />
        )}
        <IOTestPanel
          setLoading={setLoading}
          input={input}
          setInput={setInput}
          setOutput={setOutput}
          setErrCodeMsg={setErrCodeMsg}
          setCodeRunningStatus={setCodeRunningStatus}
          value={value}
          currentFlow={currentFlow}
          codeRunningStatus={codeRunningStatus}
          loading={loading}
          errCodeMsg={errCodeMsg}
          output={output}
          nodeId={id}
        />
      </div>
    </Drawer>
  );
}

function CodeIDEAMask({
  setShowPythonPackageModal,
}: CodeIDEAMaskProps): React.ReactElement {
  const { t } = useTranslation();
  const [codeIDEAPackage, setCodeIDEAPackage] = useState<string>('');

  useEffect(() => {
    const params = {
      category: 'WORKFLOW',
      code: 'python-dependency',
    };
    getCommonConfig(params).then(data => {
      setCodeIDEAPackage(JSON.stringify(JSON.parse(data?.value), null, 2));
    });
  }, []);

  return (
    <div className="mask absolute flex items-center justify-center overflow-hidden">
      <div
        className="bg-[#25252C] text-[#fff] rounded-2xl border border-[#48484E] px-[10px] py-[20px] flex flex-col overflow-hidden gap-3.5"
        style={{
          width: '520px',
          height: '54vh',
        }}
      >
        <div className="flex items-center justify-between px-[10px]">
          <div>{t('workflow.nodes.codeIDEA.viewDetails')}</div>
          <img
            src={icons.close}
            className="w-3 h-3 cursor-pointer"
            alt=""
            onClick={() => setShowPythonPackageModal(false)}
          />
        </div>
        <div className="flex-1 overflow-auto px-[10px] code-json-pretty-container">
          <JsonMonacoEditor
            value={codeIDEAPackage}
            height="100%"
            options={{
              readOnly: true,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(CodeIDEA);
