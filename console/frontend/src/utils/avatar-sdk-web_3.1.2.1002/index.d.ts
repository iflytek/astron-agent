interface IEventEmitterProps {
  emitDelay?: number;
}
declare abstract class IEventEmitter {
  constructor(opts?: IEventEmitterProps);
  on(type: string, listener: (...args: any[]) => any): IEventEmitter;
  once(type: string, listener: (...args: any[]) => any): IEventEmitter;
  off(type: string, listener: (...args: any[]) => any): IEventEmitter;
  removeAllListeners(): this;
  emit(type: string, ...eventArgs: any[]): void;
  emitSync(type: string, ...eventArgs: any[]): void;
  destroy(): void;
}

declare enum AudioFrameStatus {
  start = 0,
  intermediate = 1,
  end = 2,
}
declare enum InteractiveMode {
  append = 0,
  break = 1,
}

declare enum InputAudioMode {
  offline = 0,
  realtime = 1,
}

declare enum CmdType {
  action = 'action',
}

declare enum LogLevel {
  verbose = 0,
  debug = 1,
  info = 2,
  warn = 3,
  error = 4,
  none = 5,
}

declare enum RecorderEvents {
  recoder_audio = 'recoder_audio',
  ended = 'ended',
  mute = 'mute',
  unmute = 'unmute',
  error = 'error',
  deviceAutoSwitched = 'device-auto-switched',
}

type IRecorderOptions$1 = {
  sampleRate?: 16000 | 24000;
  // destSampleRate?: number
  analyser?: boolean;
};
declare class Recorder extends IEventEmitter {
  static getVersion(): string;
  static setLogLevel(level: LogLevel): void;
  constructor(options: IRecorderOptions$1);
  get recording(): boolean;
  get byteTimeDomainData(): Uint8Array | undefined;
  get sampleRate(): number;
  startRecord(
    duration: number,
    stopEvent?: Function,
    extend?: { nlp?: boolean }
  ): Promise<undefined>;
  stopRecord(immadiately?: boolean): Promise<void>;
  switchDevice(deviceId: string): Promise<void>;
  destroy(): void;
  isDestroyed(): boolean;
}

type IXRTCStreamInfo = {
  sid?: string;
  server: string;
  auth: string;
  appid: string;
  timeStr: string;
  userId: string;
  roomId: string;
};
type IWebRTCStreamInfo = { sid?: string; streamUrl: string };
type IStreamInfo = IXRTCStreamInfo | IWebRTCStreamInfo;
type IVideoSize = {
  height: number;
  width: number;
};

declare class IPlayer extends IEventEmitter {
  static getVersion(): string;
  static setLogLevel(level: LogLevel): void;
  get muted(): boolean;
  set muted(value: boolean);
  get volume(): number;
  set volume(value: number);
  set stream(streaminfo: IStreamInfo);
  set container(element: HTMLDivElement);
  set videoSize(videoSize: IVideoSize);
  set playerType(playerType: 'xrtc' | 'webrtc');
  set renderAlign(position: 'center' | 'bottom');
  /**
   * Addressing scenarios involving partitioned multi-screen displays on a large-format display,
   * wherein distinct sections of the screen are utilized concurrently yet share a common underlying display system,
   * results in the device software being unable to ascertain the true resolutions of the demarcated zones.
   * This is due to the persistence of signal transmission based on the native dimensions of the unified large-screen,
   * with content being rendered solely through compelled compression, squeezing, or stretching modes.
   * @description In general, non-specialized display processing should not be employed unless specifically required.
   * @param scaleX
   */
  set scaleX(scaleX: number);
  get scaleX(): number;
  playStream(streaminfo: IStreamInfo): Promise<void>;
  stop(): void;
  resume(): Promise<void>;
  destroy(): void;
  resize(): void;
  setSinkId(deviceId: string): Promise<void>;
  getSinkId(): Promise<string>;
}

type Act_EmoItem = {
  type: 'action' | 'emotion';
  value: string;
  tb: number;
};
type IVc = {
  vc: 0 | 1;
  voice_name: string;
};
type TextDriverExtend = {
  nlp?: Boolean;
  tts?: ITtsDriveExtends;
  avatar_dispatch?: IDisPatch;
  air?: IAir;
  session?: string;
  uid?: string;
  request_id?: string;
} & {
  parameter?: { nlp: { type: string; [props: string]: any } };
};
type AudioDriverParameter = {
  encoding?: 'raw'; //| 'lame' | 'opus-wb' | 'speex-wb'
  channels?: 1;
  bit_depth?: 16;
  sample_rate?: 16000 | 24000;
};
type AudioDriverExtend = {
  nlp?: boolean;
  avatar_dispatch?: {
    audio_mode?: InputAudioMode;
  } & IDisPatch;
  full_duplex?: 0 | 1;

  session?: string;
  uid?: string;

  avatar?: Act_EmoItem[];
  vc?: IVc;
  air?: IAir;
  audio?: AudioDriverParameter;
};
type IAvatarPlatformProps = {
  useInlinePlayer?: boolean;
  logLevel?: LogLevel;
  binaryData?: boolean;
  // keepAliveTime?: number
};
interface ApiInfo {
  serverUrl?: string;
  appId: string;
  apiKey?: string;
  apiSecret?: string;
  sceneId?: string;
  sceneVersion?: string;
  signedUrl?: string;
}
interface IDisPatch {
  interactive_mode?: InteractiveMode;
  enable_action_status?: 0 | 1;
  content_analysis?: 0 | 1;
}
interface IStream {
  protocol: 'xrtc' | 'webrtc' | 'rtmp';
  fps?: 25 | 20 | 15;
  bitrate?: number;
  alpha?: 0 | 1;
}
interface IAvatar {
  avatar_id: string;
  width: number;
  height: number;
  mask_region?: string; //[0,0,1080,1920]
  scale?: number;
  move_h?: number;
  move_v?: number;
  audio_format?: 1 | 2;
}
interface ITTS {
  vcn: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  audio?: {
    sample_rate: 16000 | 24000;
  };
}
declare type ITtsDriveExtends = Omit<ITTS, 'vcn'> & {
  vcn?: string;
  audio?: {
    sample_rate?: 16000 | 24000;
  };
};
interface ISubtitle {
  //字幕信息
  subtitle: 0 | 1;
  font_color: string;
}
type IAir = {
  air: 0 | 1 /*自动动作启用*/;
  add_nonsemantic?: 0 | 1 /*如果支持 自动添加无指向动作*/;
};

type IAudioInput = {
  sample_rate: 24000 | 16000;
  channels?: 1;
  bit_depth?: 16;
};
interface IBackgroundPayload {
  data: string;
  type: string;
}
interface IGlobalConfig {
  stream: IStream;
  avatar: IAvatar;
  tts: ITTS;
  avatar_dispatch?: IDisPatch;
  subtitle?: ISubtitle;
  audio?: IAudioInput;
  background?: IBackgroundPayload;
  air?: IAir;
}
interface ICMD {
  type: 'background_image' | 'front_image' | 'front_video' | 'background_video';
  value: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  layer: number;
  transparency?: 1;
}
declare interface PreRes {
  image?: { url: string }[];
}
interface StartProps {
  wrapper?: HTMLDivElement;
  preRes?: PreRes;
}
declare class IAvatarPlatform extends IEventEmitter {
  static getVersion(): string;
  static setLogLevel(level: LogLevel): void;
  constructor(props?: IAvatarPlatformProps);
  get player(): IPlayer | undefined;
  get recorder(): Recorder | undefined;
  setApiInfo(apiInfo: ApiInfo): this;
  setGlobalParams(config: IGlobalConfig): this;
  start(startProps?: StartProps): Promise<void>;
  connectNlp(): Promise<void>;
  writeText(text: string, extend: TextDriverExtend): Promise<string>;
  writeJsonText(
    text: string,
    extend: TextDriverExtend,
    cmds: ICMD[]
  ): Promise<string>;
  writeAudio(
    arraybuffer: ArrayBuffer,
    frameStatus: AudioFrameStatus,
    extend?: AudioDriverExtend
  ): Promise<string>;
  interrupt(): Promise<void>;
  writeCmd(type: CmdType, value: string): Promise<string>;
  stop(): void;
  destroy(): void;
  // TODO wx
  createRecorder(options?: IRecorderOptions$1): Recorder;
  destroyRecorder(): void;
  createPlayer(): IPlayer;
}

declare enum SDKEvents {
  connected = 'connected',
  disconnected = 'disconnected',
  nlp = 'nlp',
  asr = 'asr',
  stream_start = 'stream_start',
  frame_start = 'frame_start',
  frame_stop = 'frame_stop',
  action_start = 'action_start',
  action_stop = 'action_stop',
  tts_duration = 'tts_duration',
  subtitle_info = 'subtitle_info',
  // playNotAllowed = 'not-allowed',
  error = 'error',
}

declare enum PlayerEvents {
  play = 'play',
  waiting = 'waiting',
  playing = 'playing',
  stop = 'stop',
  playNotAllowed = 'not-allowed',
  error = 'error',
}

type DeviceKind = 'audioinput' | 'audiooutput' | 'videoinput';
declare class UserMedia {
  static requestPermissions(kind: DeviceKind): Promise<void>;
  static getEnumerateDevices(kind: DeviceKind): Promise<MediaDeviceInfo[]>;
  static getUserMedia(
    contstraints: MediaStreamConstraints
  ): Promise<MediaStream>;
}

export {
  type ApiInfo,
  type IGlobalConfig,
  PlayerEvents,
  RecorderEvents,
  SDKEvents,
  UserMedia,
  IAvatarPlatform as default,
};
