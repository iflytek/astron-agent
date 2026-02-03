import AvatarPlatform, {
  PlayerEvents,
} from '@/utils/avatar-sdk-web_3.1.2.1002/index.js';
import useChatStore from '@/store/chat-store';
import { getSignedUrl } from '@/services/spark-common';
import { message } from 'antd';
import React, {
  useImperativeHandle,
  forwardRef,
  useRef,
  useEffect,
} from 'react';
import { useTranslation } from 'react-i18next';

const appId = window?.__APP_CONFIG__?.SPARK_VIRTUAL_MAN_APP_ID;

// 虚拟人初始化鉴权参数
const sdkInitAppInfoDefault: any = {
  serverUrl: 'wss://avatar.cn-huadong-1.xf-yun.com/v1/interact',
  appId: appId,
  sceneId: '',
  signedUrl: '',
};
// 虚拟人形象参数
const sdkAvatarInfoDefault = {
  avatar_id: '',
  width: 1080,
  height: 1920,
  mask_region: '[0,0,0,0]',
  scale: 1,
  move_h: 0,
  move_v: 0,
  audio_format: 2,
  // gender: "男",
  stream: {
    alpha: 1,
    protocol: 'xrtc',
  },
  // pixel_format: 6,
};
// 虚拟人发言人参数
const sdkTTSInfoDefault = {
  vcn: '',
  speed: 50,
  pitch: 50,
  volume: 100,
};
let vmsInteractiveRefPlayer: any = null;

interface VmsInteractiveRefProps {
  notAllowedPlayCallback?: () => void;
  playerResumeCallback?: () => void;
  avatarDom: HTMLDivElement;
  styles?: React.CSSProperties;
  sdkInitAppInfo?: {
    serverUrl: string;
    appId: string;
    sceneId: string;
    signedUrl: string;
  };
  sdkAvatarInfo?: {
    avatar_id: string;
    width: number;
    height: number;
    mask_region: string;
    scale: number;
    move_h: number;
    move_v: number;
    audio_format: number;
    stream: {
      alpha: number;
      protocol: string;
    };
  };
  sdkTTSInfo?: {
    vcn: string;
    speed: number;
    pitch: number;
    volume: number;
  };
  loadingStatusChange?: (status: boolean) => void;
}

// 虚拟人交互组件
const VmsInteractionCmp = forwardRef((props: VmsInteractiveRefProps, ref) => {
  const { t } = useTranslation();
  const {
    notAllowedPlayCallback,
    avatarDom,
    styles,
    playerResumeCallback,
    loadingStatusChange,
  } = props;
  const vmsInteractiveRef = useRef<any>(null);
  const setVmsInteractiveRef = useChatStore(
    state => state.setVmsInteractiveRef
  );
  const setVmsInteractiveRefStatus = useChatStore(
    state => state.setVmsInteractiveRefStatus
  );
  const setVmsInteractiveRefPlayer = useChatStore(
    state => state.setVmsInteractiveRefPlayer
  );
  /**
   * 加载虚拟人签名url信息，初始化虚拟人sdk实例
   */
  const loadSignedUrlInfo = async () => {
    try {
      const res: any = await getSignedUrl();
      sdkInitAppInfoDefault.signedUrl = res;
    } catch (error) {
      console.error(
        t('vmsInteractionCmp.loadVirtualHumanAvatarSignUrlFailed'),
        error
      );
      message.error(t('vmsInteractionCmp.loadVirtualHumanAvatarSignUrlFailed'));
    }
  };

  /**
   * @description: 初始化虚拟人实例
   * @param {void}
   * @return {Promise<void>}
   * @example
   * initAvatar()
   */
  const initAvatar = async ({
    sdkInitAppInfo,
    sdkAvatarInfo,
    sdkTTSInfo,
  }: {
    sdkInitAppInfo?: any;
    sdkAvatarInfo?: any;
    sdkTTSInfo?: any;
  }) => {
    //如果不存在此虚拟人实例，开始初始化
    if (!vmsInteractiveRef.current) {
      loadingStatusChange?.(true);
      await loadSignedUrlInfo();
      vmsInteractiveRef.current = new (AvatarPlatform as any)({
        useInlinePlayer: true,
      });
      //   vmsInteractiveRef.current.on(SDKEvents.frame_start, (frameData: any) => {
      //     loadingStatusChange?.(false);
      //     console.log('sdk event: frameBegin', frameData);
      //   });
      // vmsInteractiveRef.current.on(SDKEvents.frame_stop, (frameData : any) => {
      //     console.log('sdk event: frame_stop', frameData);
      // });
      vmsInteractiveRef.current.setApiInfo({
        ...sdkInitAppInfoDefault,
        ...(sdkInitAppInfo ? sdkInitAppInfo : {}),
      });
      //设置全局参数：形象和tts
      vmsInteractiveRef.current.setGlobalParams({
        avatar: {
          ...sdkAvatarInfoDefault,
          ...(sdkAvatarInfo ? sdkAvatarInfo : {}),
        },
        tts: { ...sdkTTSInfoDefault, ...(sdkTTSInfo ? sdkTTSInfo : {}) },
        avatar_dispatch: {
          interactive_mode: 0, //此处默认追加模式
        },
      });
      vmsInteractiveRefPlayer =
        vmsInteractiveRef.current?.player ||
        vmsInteractiveRef.current.createPlayer();
      vmsInteractiveRefPlayer?.on(PlayerEvents.play, () => {
        console.log('sdk event: player play');
        loadingStatusChange?.(false);
      });
      vmsInteractiveRefPlayer?.on(PlayerEvents.playNotAllowed, () => {
        // TODO 由于浏览器限制，如果用户从未对页面进行过交互点击等操作，则无法正常自动播放音视频等
        // 这里需要交互层面引导用户点击屏幕，然后逻辑调用resume 恢复方法
        console.log('sdk event: player play not allowed');
        notAllowedPlayCallback?.();
      });
      setVmsInteractiveRef(vmsInteractiveRef.current);
      setVmsInteractiveRefPlayer(vmsInteractiveRefPlayer);
      setVmsInteractiveRefStatus('init');
    } else {
      // message.warning('请勿多次初始化 或先销毁当前实例');
    }
    if (!vmsInteractiveRef.current) {
      return message.warning(
        t('vmsInteractionCmp.virtualHumanAvatarInitException')
      );
    }
    await vmsInteractiveRef.current
      ?.start({
        wrapper:
          (avatarDom as HTMLDivElement) ||
          (document.getElementById('avatarDom') as HTMLDivElement),
      })
      .then(() => {
        console.info(t('vmsInteractionCmp.virtualHumanAvatarConnectSuccess'));
        // loadingStatusChange?.(false);
      })
      .catch((e: any) => {
        // message.error('连接失败，可以打开控制台查看信息');
        console.error(
          t('vmsInteractionCmp.virtualHumanAvatarConnectFailed'),
          e.code,
          e.message,
          e.name,
          e.stack
        );
      });
  };

  const disposeVmsInteractiveRef = () => {
    vmsInteractiveRef.current?.interrupt();
    vmsInteractiveRef.current?.stop();
    vmsInteractiveRef.current?.destroy();
    vmsInteractiveRef.current = null;
    vmsInteractiveRefPlayer?.stop();
    vmsInteractiveRefPlayer = null;
    setVmsInteractiveRef(null);
    setVmsInteractiveRefPlayer(null);
    setVmsInteractiveRefStatus('stop');
  };

  // 暴露刷新方法给父组件
  useImperativeHandle(ref, () => ({
    initAvatar,
    instance: vmsInteractiveRef.current,
    player: vmsInteractiveRefPlayer,
    dispose: disposeVmsInteractiveRef,
    interrupt: () => {
      vmsInteractiveRef.current?.interrupt();
      setVmsInteractiveRefStatus('interrupt');
    },
    stop: () => {
      vmsInteractiveRef.current?.stop();
      setVmsInteractiveRefStatus('stop');
    },
  }));

  const handleWindowTabChange = () => {
    // 判断页面是否从“可见”变为“不可见”（即切换到其他标签页）
    if (document.visibilityState === 'hidden') {
      console.log('用户已切换到其他标签页');
      //   disposeVmsInteractiveRef();
      vmsInteractiveRef.current?.interrupt();
      setVmsInteractiveRefStatus('init');
    }
  };

  useEffect(() => {
    document.body.addEventListener('click', () => {
      vmsInteractiveRefPlayer?.resume();
      playerResumeCallback?.();
    });
    document.body.addEventListener('focus', () => {
      vmsInteractiveRefPlayer?.resume();
      playerResumeCallback?.();
    });
    document.body.addEventListener('keydown', () => {
      vmsInteractiveRefPlayer?.resume();
      playerResumeCallback?.();
    });
    // 绑定 visibilitychange 事件
    document.addEventListener('visibilitychange', handleWindowTabChange);

    // 页面卸载前移除事件监听（避免内存泄漏）
    window.addEventListener('beforeunload', function () {
      document.removeEventListener('visibilitychange', handleWindowTabChange);
    });

    return () => {
      document.body.removeEventListener('click', () => {
        vmsInteractiveRefPlayer?.resume();
        playerResumeCallback?.();
      });
      document.body.removeEventListener('focus', () => {
        vmsInteractiveRefPlayer?.resume();
        playerResumeCallback?.();
      });
      document.body.removeEventListener('keydown', () => {
        vmsInteractiveRefPlayer?.resume();
        playerResumeCallback?.();
      });

      document.removeEventListener('visibilitychange', handleWindowTabChange);
      window.removeEventListener('beforeunload', handleWindowTabChange);
    };
  }, []);
  return <div id="avatarDom" style={styles ? styles : {}}></div>;
});

export default VmsInteractionCmp;
