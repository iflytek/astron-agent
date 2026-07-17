import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { isJSON } from '@/utils';
import { Button, Spin, Input } from 'antd';
import { getFixedUrl, getAuthorization } from '@/components/workflow/utils';

import reTry from '@/assets/imgs/knowledge/bnt_zhishi_restart.png';

const { TextArea } = Input;

function OpeningRemarksModal({
  setOpeningRemarksModal,
  setConversationStarter,
  currentRobot,
  isFlow = false,
}): React.ReactElement {
  const controllerRef = useRef<AbortController | null>(null);
  const textQueue = useRef<string[]>([]);
  const wsMessageStatus = useRef<string>('end');
  const [optimizationOpeningRemarks, setOptimizationOpeningRemarks] =
    useState('');
  const [isReciving, setIsReciving] = useState(true);

  useEffect(() => {
    currentRobot.id && handlePromptOptimization();
  }, [currentRobot]);

  function handlePromptOptimization(): void {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    textQueue.current = [];
    setOptimizationOpeningRemarks(() => '');
    wsMessageStatus.current = 'start';
    setIsReciving(true);
    controllerRef.current = new AbortController();
    fetchEventSource(getFixedUrl('/prompt/ai-generate'), {
      openWhenHidden: true,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: getAuthorization(),
      },
      signal: controllerRef.current.signal,
      body: JSON.stringify({
        [isFlow ? 'flowId' : 'botId']: currentRobot.id,
        code: 'prologue',
      }),
      onmessage(e) {
        if (e && e.data) {
          if (e.data && isJSON(e.data)) {
            const data = JSON.parse(e.data);
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
  }

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
      timer = setInterval(() => {
        const value = textQueue.current.slice(0, 1).join('');
        textQueue.current = textQueue.current.slice(1);
        if (value) {
          setOptimizationOpeningRemarks(
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

    return (): void => clearInterval(timer);
  }, [optimizationOpeningRemarks, isReciving]);

  function handleOk(): void {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setOpeningRemarksModal(false);
    setConversationStarter(optimizationOpeningRemarks);
  }

  const loading = useMemo(() => {
    return !optimizationOpeningRemarks && isReciving;
  }, [optimizationOpeningRemarks, isReciving]);

  return (
    <div className="mask">
      <div className="modalContent">
        <div className="w-full text-lg flex items-center justify-between">
          <span>对话开场白优化</span>
          <div
            className="flex items-center gap-1 text-[#6356EA] text-base"
            onClick={() => !isReciving && handlePromptOptimization()}
            style={{
              opacity: isReciving ? '0.5' : '1',
              cursor: isReciving ? 'not-allowed' : 'pointer',
            }}
          >
            <img src={reTry} className="w-4 h-4" alt="" />
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
              value={optimizationOpeningRemarks}
              onChange={event =>
                !isReciving &&
                setOptimizationOpeningRemarks(event.target.value?.trim())
              }
            />
          )}
        </div>
        <div className="flex flex-row-reverse gap-3 mt-7">
          <Button
            type="primary"
            className="px-[24px]"
            onClick={handleOk}
            disabled={!optimizationOpeningRemarks?.trim() || isReciving}
          >
            提交
          </Button>
          <Button
            type="text"
            className="origin-btn px-[24px]"
            onClick={() => {
              controllerRef.current?.abort();
              controllerRef.current = null;
              setOpeningRemarksModal(false);
            }}
          >
            取消
          </Button>
        </div>
      </div>
    </div>
  );
}

export default OpeningRemarksModal;
