import AvatarPlatform, {
  PlayerEvents,
  type ApiInfo,
  type IGlobalConfig,
} from '@/utils/avatar-sdk-web_3.1.2.1002/index.js';
import useChatStore from '@/store/chat-store';
import { getSignedUrl } from '@/services/spark-common';
import { getPlatformAccountRuntimeConfig } from '@/services/platform-account';
import React, {
  useImperativeHandle,
  forwardRef,
  useRef,
  useEffect,
} from 'react';

type AvatarInstance = InstanceType<typeof AvatarPlatform>;
type AvatarPlayer = NonNullable<AvatarInstance['player']>;
export interface AvatarInitOptions {
  sdkInitAppInfo?: Partial<ApiInfo>;
  sdkAvatarInfo?: Partial<IGlobalConfig['avatar']> & {
    stream?: IGlobalConfig['stream'];
  };
  sdkTTSInfo?: Partial<IGlobalConfig['tts']>;
}
export interface VirtualAvatarHandle {
  readonly instance: AvatarInstance | null;
  readonly player: AvatarPlayer | null;
  initAvatar: (options: AvatarInitOptions) => Promise<boolean>;
  dispose: () => void;
  interrupt: () => void;
  stop: () => void;
}
interface VmsInteractiveRefProps {
  notAllowedPlayCallback?: () => void;
  playerResumeCallback?: () => void;
  avatarDom?: HTMLDivElement | null;
  styles?: React.CSSProperties;
  loadingStatusChange?: (status: boolean) => void;
}
interface InitializationAttempt {
  instance?: AvatarInstance;
  player?: AvatarPlayer;
}

// Each attempt owns its SDK and player, including while start() is pending.
// Cleanup must also be safe after a late start settles on a disposed attempt.
const releaseAttempt = (attempt: InitializationAttempt | null): void => {
  if (!attempt) return;
  try {
    void attempt.instance?.interrupt().catch(() => {});
  } catch {
    // An SDK already destroyed by an earlier cleanup may throw synchronously.
  }
  for (const release of [
    () => attempt.player?.stop(),
    () => attempt.instance?.stop(),
    () => attempt.instance?.destroy(),
  ]) {
    try {
      release();
    } catch {
      // Continue releasing the remaining resources even when one is closed.
    }
  }
};

const VmsInteractionCmp = forwardRef<
  VirtualAvatarHandle,
  VmsInteractiveRefProps
>((props, ref) => {
  const { loadingStatusChange, notAllowedPlayCallback, playerResumeCallback } =
    props;
  const avatarElement = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const attemptRef = useRef<InitializationAttempt | null>(null);
  const vmsInteractiveRef = useRef<AvatarInstance | null>(null);
  const playerRef = useRef<AvatarPlayer | null>(null);
  const setVmsInteractiveRef = useChatStore(
    state => state.setVmsInteractiveRef
  );
  const setVmsInteractiveRefPlayer = useChatStore(
    state => state.setVmsInteractiveRefPlayer
  );
  const setVmsInteractiveRefStatus = useChatStore(
    state => state.setVmsInteractiveRefStatus
  );

  const clearPublishedInstance = (): void => {
    const instance = vmsInteractiveRef.current;
    if (instance && useChatStore.getState().vmsInteractiveRef === instance) {
      setVmsInteractiveRef(null);
      setVmsInteractiveRefPlayer(null);
      setVmsInteractiveRefStatus('stop');
    }
    vmsInteractiveRef.current = null;
    playerRef.current = null;
  };
  const disposeVmsInteractiveRef = (): void => {
    const attempt = attemptRef.current;
    // Invalidate synchronously, before any asynchronous or SDK cleanup.
    attemptRef.current = null;
    clearPublishedInstance();
    releaseAttempt(attempt);
    if (!useChatStore.getState().vmsInteractiveRef)
      setVmsInteractiveRefStatus('stop');
    loadingStatusChange?.(false);
  };

  const initAvatar = async (options: AvatarInitOptions): Promise<boolean> => {
    disposeVmsInteractiveRef();
    if (!mounted.current) return false;
    const attempt: InitializationAttempt = {};
    attemptRef.current = attempt;
    const isCurrent = (): boolean =>
      mounted.current && attemptRef.current === attempt;
    loadingStatusChange?.(true);
    setVmsInteractiveRefStatus('loading');
    try {
      const [signedUrl, runtimeConfig] = await Promise.all([
        getSignedUrl(),
        getPlatformAccountRuntimeConfig(),
      ]);
      if (!isCurrent()) return false;
      if (
        typeof signedUrl !== 'string' ||
        !signedUrl ||
        !runtimeConfig.sparkVirtualManAppId
      ) {
        throw new Error('Missing virtual avatar connection configuration');
      }
      const instance = new AvatarPlatform({ useInlinePlayer: true });
      attempt.instance = instance;
      instance.setApiInfo({
        serverUrl: 'wss://avatar.cn-huadong-1.xf-yun.com/v1/interact',
        appId: runtimeConfig.sparkVirtualManAppId,
        sceneId: '',
        signedUrl,
        ...options.sdkInitAppInfo,
      });
      const { stream = { alpha: 1, protocol: 'xrtc' }, ...avatarInfo } =
        options.sdkAvatarInfo || {};
      instance.setGlobalParams({
        stream,
        avatar: {
          avatar_id: '',
          width: 1080,
          height: 1920,
          mask_region: '[0,0,0,0]',
          scale: 1,
          move_h: 0,
          move_v: 0,
          audio_format: 2,
          ...avatarInfo,
        },
        tts: {
          vcn: '',
          speed: 50,
          pitch: 50,
          volume: 100,
          ...options.sdkTTSInfo,
        },
        avatar_dispatch: { interactive_mode: 0 },
      });
      const player = instance.player || instance.createPlayer();
      attempt.player = player;
      player.on(PlayerEvents.playNotAllowed, () => {
        if (isCurrent()) notAllowedPlayCallback?.();
      });
      await instance.start({
        wrapper: avatarElement.current || props.avatarDom || undefined,
      });
      if (!isCurrent()) {
        releaseAttempt(attempt);
        return false;
      }
      // Publish only a successfully started instance. Consumers cannot send
      // dialogue to a pending or failed connection.
      vmsInteractiveRef.current = instance;
      playerRef.current = player;
      setVmsInteractiveRef(instance);
      setVmsInteractiveRefPlayer(player);
      setVmsInteractiveRefStatus('init');
      return true;
    } catch {
      releaseAttempt(attempt);
      if (!isCurrent()) return false;
      clearPublishedInstance();
      attemptRef.current = null;
      loadingStatusChange?.(false);
      setVmsInteractiveRefStatus('error');
      // SDK/upstream errors may contain signed URLs. Keep UI errors generic.
      throw new Error('虚拟人连接失败，请检查配置后重试。');
    } finally {
      if (isCurrent()) loadingStatusChange?.(false);
    }
  };

  const interrupt = (): void => {
    const instance = vmsInteractiveRef.current;
    if (!instance) return;
    void instance.interrupt().catch(() => {});
    setVmsInteractiveRefStatus('interrupt');
  };
  useImperativeHandle(ref, () => ({
    initAvatar,
    get instance() {
      return vmsInteractiveRef.current;
    },
    get player() {
      return playerRef.current;
    },
    dispose: disposeVmsInteractiveRef,
    interrupt,
    stop: disposeVmsInteractiveRef,
  }));

  useEffect(() => {
    mounted.current = true;
    const resumePlayer = (): void => {
      const player = playerRef.current;
      if (!player) return;
      void player
        .resume()
        .then(() => {
          if (mounted.current && playerRef.current === player)
            playerResumeCallback?.();
        })
        .catch(() => {
          if (mounted.current && playerRef.current === player)
            notAllowedPlayCallback?.();
        });
    };
    const handleVisibility = (): void => {
      if (document.visibilityState === 'hidden') {
        // Backgrounding interrupts playback, not the ready connection. Keep
        // explicit user interruption separate so later answers can still play.
        void vmsInteractiveRef.current?.interrupt().catch(() => {});
      }
    };
    for (const event of ['click', 'focus', 'keydown'])
      document.body.addEventListener(event, resumePlayer);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', disposeVmsInteractiveRef);
    return () => {
      mounted.current = false;
      disposeVmsInteractiveRef();
      for (const event of ['click', 'focus', 'keydown'])
        document.body.removeEventListener(event, resumePlayer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', disposeVmsInteractiveRef);
    };
  }, []);
  return <div ref={avatarElement} id="avatarDom" style={props.styles} />;
});

export default VmsInteractionCmp;
