import {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import Media from '@/utils/record/record';

import { getRtasrToken } from '@/services/chat';
import { message } from 'antd';
import AudioAnimate from './audio-animate';
import { ReactSVG } from 'react-svg';

// 录音状态类型
type RecorderStatus = 'ready' | 'start' | 'end' | 'play';

// 组件Props类型
interface RecorderProps {
  send: (value: string) => void;
  changeStatus: (status: RecorderStatus) => void;
  disabled?: boolean;
}

// 暴露给父组件的方法接口
export interface RecorderRef {
  stopAudio: () => void;
}

let timer: NodeJS.Timeout | null = null;
const RecorderCom = forwardRef<RecorderRef, RecorderProps>(
  ({ send, changeStatus, disabled = false }, ref) => {
    const [status, setStatus] = useState<RecorderStatus>('ready');
    const record = useRef<any>(
      new (Media as any)({ resetText: (text: any) => handleRecord(text) })
    );
    // 处理录音文本回调
    const handleRecord = useCallback(
      (text: string): void => {
        if (text && typeof text === 'string') {
          send(text);
        }
      },
      [send]
    );

    // 停止录音
    const stopAudio = useCallback((): void => {
      try {
        record.current?.recStop();
        changeStatus && changeStatus('end');
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        setStatus('end');
      } catch (error) {
        console.warn('停止录音失败:', error);
      }
    }, [changeStatus]);

    // 开始录音事件处理
    const handleStartRecord = useCallback(async (): Promise<void> => {
      if (disabled || (status !== 'ready' && status !== 'end')) {
        return;
      }

      try {
        const tokenResponse = await getRtasrToken();

        if (!record.current) {
          throw new Error('录音器未初始化');
        }

        await record.current.recStart(tokenResponse);
        setStatus('start');
        changeStatus && changeStatus('play');
        // 设置60秒超时
        timer = setTimeout(() => {
          stopAudio();
          changeStatus && changeStatus('end');
        }, 60 * 1000);
      } catch (error) {
        console.warn('录音启动失败:', error);

        // 类型安全的错误处理
        if (error && typeof error === 'object' && 'detail' in error) {
          const errorDetail = error.detail as { code?: number };
          if (errorDetail.code && [80000, 90000].includes(errorDetail.code)) {
            return;
          }
        }

        const errorMsg =
          error && typeof error === 'object' && 'msg' in error
            ? (error.msg as string)
            : '录音启动失败';

        message.error(errorMsg);
        record.current?.recStop();
      }
    }, [status, disabled, changeStatus, stopAudio]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        stopAudio,
      }),
      [stopAudio]
    );

    return (
      <div className="cursor-pointer bg-contain rounded-lg border-transparent text-xl flex justify-center items-center relative">
        {/* 录音中状态 */}
        {status === 'start' && (
          <div
            onClick={disabled ? undefined : stopAudio}
            className={`w-fit h-auto flex justify-center items-center z-10 ${
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            }`}
          >
            <AudioAnimate isPlaying={true} type="record" />
          </div>
        )}

        {/* 准备/结束状态 */}
        {(status === 'ready' || status === 'end') && (
          <div
            className={`relative w-full h-full text-gray-700 z-10 flex items-center justify-center transition-colors duration-200 ${
              disabled
                ? 'cursor-not-allowed opacity-50'
                : 'cursor-pointer hover:text-blue-600'
            }`}
            onClick={disabled ? undefined : handleStartRecord}
          >
            <div className="h-full flex items-center justify-center">
              <ReactSVG
                src="https://openres.xfyun.cn/xfyundoc/2024-10-21/c4fd1b99-1011-48de-8085-990ff99500da/1729522975912/zsfdzfsd.svg"
                className="w-6 h-6"
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

RecorderCom.displayName = 'RecorderCom';

export default RecorderCom;
