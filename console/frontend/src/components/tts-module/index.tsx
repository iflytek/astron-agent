import React, { useState, useEffect, useRef } from 'react';
import Experience from '@/utils/tts';
import useVoicePlayStore from '@/store/voice-play-store';

// 类型定义
export interface IPictureBookObj {
  vcn: string;
  bgm: string;
}

interface TtsModuleProps {
  text: string;
  language?: string;
  voiceName?: string;
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
}

const TtsModule: React.FC<TtsModuleProps> = ({
  text,
  language = 'cn',
  voiceName,
  isPlaying,
  setIsPlaying,
}) => {
  // State hooks
  const [experienceObj, setExperienceObj] = useState<Experience | null>(null);
  // Zustand stores
  const { activeVcn } = useVoicePlayStore();

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get voice configuration
  const vcnUsed = activeVcn;

  // Initialize TTS object
  useEffect(() => {
    const ttsText = text?.replace(/[*#&$]/g, '');
    const newExperienceObj = new Experience({
      voiceName: voiceName || vcnUsed?.vcn_cn,
      engineType: 'ptts',
      tte: 'UTF8',
      speed: 50,
      voice: 5,
      pitch: 50,
      text: ttsText,
      close: () => setIsPlaying(false),
    });
    setExperienceObj(newExperienceObj);

    // 组件卸载时清理
    return () => {
      newExperienceObj?.resetAudio();
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && voiceName) {
      // 先重置音频，确保之前的播放完全停止
      experienceObj?.resetAudio();

      // 延迟一点再开始新的播放，确保重置完成
      timer = setTimeout(() => {
        const ttsText = text.replace(/[*#&$]/g, '');
        const tempExperienceObj = {
          language,
          voiceName: voiceName,
          engineType: 'ptts',
          tte: 'UTF8',
          speed: 50,
          voice: 5,
          pitch: 50,
          text: ttsText,
        };
        experienceObj?.setConfig(tempExperienceObj);
        experienceObj?.audioPlay();
        audioRef.current?.play();
      }, 50);
    } else {
      experienceObj?.resetAudio();
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPlaying, voiceName]);

  return <div />;
};

export default TtsModule;
