import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { isJSON } from '@/utils';
import { useMemoizedFn } from 'ahooks';
import { Input, Button, Spin } from 'antd';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { WebSocketMessage } from '@/components/workflow/types';
import { Icons } from '@/components/workflow/icons';
import { getFixedUrl, getAuthorization } from '@/components/workflow/utils';
import { fetchEventSource } from '@microsoft/fetch-event-source';

const { TextArea } = Input;

function PromptModal(): React.ReactElement {
  const promptOptimizeModalInfo = useFlowsManager(
    state => state.promptOptimizeModalInfo
  );
  const setPromptOptimizeModalInfo = useFlowsManager(
    state => state.setPromptOptimizeModalInfo
  );
  const currentFlow = useFlowsManager(state => state.currentFlow);
  const setUpdateNodeInputData = useFlowsManager(
    state => state.setUpdateNodeInputData
  );
  const controllerRef = useRef<AbortController | null>(null);
  const textQueue = useRef<string[]>([]);
  const wsMessageStatus = useRef<string>('end');
  const [optimizationPrompt, setOptimizationPrompt] = useState<string>('');
  const [isReciving, setIsReciving] = useState<boolean>(true);
  const { handleChangeNodeParam, currentNode } = useNodeCommon({
    id: promptOptimizeModalInfo?.nodeId,
  });
  const promptData = useMemo(
    () => currentNode?.data?.nodeParam?.[promptOptimizeModalInfo?.key],
    [currentNode, promptOptimizeModalInfo]
  );
  useEffect(() => {
    promptData && handlePromptOptimization();
  }, [promptData]);

  const handlePromptOptimization = useMemoizedFn(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    textQueue.current = [];
    setOptimizationPrompt(() => '');
    wsMessageStatus.current = 'start';
    setIsReciving(true);
    const url = getFixedUrl('/prompt/enhance');
    controllerRef.current = new AbortController();
    fetchEventSource(url, {
      openWhenHidden: true,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthorization(),
      },
      signal: controllerRef.current.signal,
      body: JSON.stringify({ prompt: promptData, name: currentFlow?.name }),
      onmessage(e) {
        if (e && e.data) {
          if (e.data && isJSON(e.data)) {
            const data: WebSocketMessage = JSON.parse(e.data);
            const content = data?.payload?.message?.content;
            if (content) {
              textQueue.current = [...textQueue.current, ...content.split('')];
            }
            if (data?.header?.status === 2) {
              wsMessageStatus.current = 'end';
            }
          }
        }
      },
      onerror() {
        controllerRef.current?.abort();
        controllerRef.current = null;
        wsMessageStatus.current = 'end';
      },
      onclose() {
        controllerRef.current?.abort();
        controllerRef.current = null;
        wsMessageStatus.current = 'end';
      },
    });
  });

  useEffect(() => {
    return (): void => {
      controllerRef.current?.abort();
      controllerRef.current = null;
      wsMessageStatus.current = 'end';
      textQueue.current = [];
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isReciving) {
      timer = setInterval((): void => {
        const value = textQueue.current.slice(0, 1).join('');
        textQueue.current = textQueue.current.slice(1);
        if (value) {
          setOptimizationPrompt(
            optimizationPrompt => optimizationPrompt + value
          );
        }
        if (!textQueue.current.length && wsMessageStatus.current === 'end') {
          setIsReciving(false);
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
  }, [optimizationPrompt, isReciving]);

  const handleOk = useMemoizedFn(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPromptOptimizeModalInfo({ open: false, nodeId: '', key: '' });
    handleChangeNodeParam((data, value) => {
      if (data.nodeParam && promptOptimizeModalInfo?.key) {
        data.nodeParam[promptOptimizeModalInfo.key] = value;
      }
    }, optimizationPrompt);
    setTimeout(() => {
      setUpdateNodeInputData(updateNodeInputData => !updateNodeInputData);
    });
  });

  const loading = useMemo(() => {
    return !optimizationPrompt && isReciving;
  }, [optimizationPrompt, isReciving]);

  return (
    <>
      {promptOptimizeModalInfo?.open
        ? createPortal(
            <div
              className="mask"
              onKeyDown={e => e.stopPropagation()}
              style={{
                zIndex: 1002,
              }}
            >
              <div className="modalContent">
                <div className="w-full text-lg flex items-center justify-between">
                  <span>Prompt优化</span>
                  <div
                    className="flex items-center gap-1 text-[#6356EA] text-base"
                    onClick={() => !isReciving && handlePromptOptimization()}
                    style={{
                      opacity: isReciving ? '0.5' : '1',
                      cursor: isReciving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <img
                      src={Icons.promptOptimize.reTry}
                      className="w-4 h-4"
                      alt=""
                    />
                    <span>重新生成</span>
                  </div>
                </div>
                <div>
                  {loading ? (
                    <div className="opacity-50 h-[400px] flex justify-center items-center">
                      <Spin />
                    </div>
                  ) : (
                    <TextArea
                      className="mt-5 global-textarea"
                      placeholder="模型固定的引导词，通过调整该内容，可以引导模型聊天方向"
                      style={{ height: 380, resize: 'none' }}
                      value={optimizationPrompt}
                      onChange={(
                        event: React.ChangeEvent<HTMLTextAreaElement>
                      ) =>
                        !isReciving &&
                        setOptimizationPrompt(event.target.value?.trim())
                      }
                    />
                  )}
                </div>
                <div className="flex flex-row-reverse gap-3 mt-7">
                  <Button
                    type="primary"
                    className="px-6"
                    onClick={handleOk}
                    disabled={!optimizationPrompt?.trim() || isReciving}
                  >
                    提交
                  </Button>
                  <Button
                    type="text"
                    className="origin-btn px-6"
                    onClick={() => {
                      controllerRef.current?.abort();
                      controllerRef.current = null;
                      setPromptOptimizeModalInfo({
                        open: false,
                        nodeId: '',
                        key: '',
                      });
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export default PromptModal;
