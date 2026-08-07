import { Base64 } from 'js-base64';

let reqParams = {
  // websocket参数
  header: {
    app_id: '3e2c8419',
    status: 2,
  },
  parameter: {
    tts: {
      vcn: 'x4_lingxiaoxuan',
      speed: 50,
      volume: 50,
      pitch: 50,
      bgs: 0,
      reg: 0,
      rdn: 0,
      rhy: 0,
      scn: 0,
      audio: {
        encoding: 'lame',
        sample_rate: 16000,
        channels: 1,
        bit_depth: 16,
        // frame_size: 0
      },
      pybuf: {
        encoding: 'utf8',
        compress: 'raw',
        format: 'plain',
      },
    },
  },
  payload: {
    text: {
      encoding: 'utf8',
      compress: 'raw',
      format: 'plain',
      status: 2,
      seq: 0,
      text: '',
    },
  },
};

export default class WebscoketConnect {
  // ws需要连接的Url
  wsUrl = '';
  // 已建立的websocket 连接，用于主动控制它的消息发送，关闭等动作
  websocket = null;
  mediaSource;
  sourceBuffer;
  base64Quene = [];
  lock = false;
  audioElement;
  totalText = ''; // 传入的需要合成的整段的文本
  params; // 需要传给引擎的参数
  eachTextCount = 25000; // 一次传300个字符
  // 构造器
  constructor(url, element) {
    this.wsUrl = url;
    this.audioElement = element;
  }
  // 建立 websocket 连接
  establishConnect(totalText, inner, vcn) {
    this.websocket = new WebSocket(this.wsUrl);
    this.totalText = totalText;
    this.params = reqParams;
    this.params.parameter.tts.vcn = vcn;
    if (!inner) {
      this.mediaSource = new MediaSource();
      this.audioElement.src = URL.createObjectURL(this.mediaSource);
      this.mediaSource.addEventListener('sourceopen', () => {
        URL.revokeObjectURL(this.audioElement.src);
        this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
        this.sourceBuffer.addEventListener('updateend', this.addBuffer);
        this.audioElement.play();
      });
    }

    if (this.websocket) {
      this.websocket.onopen = event => {
        this.params.payload.text.text = Base64.encode(
          this.totalText.slice(0, this.eachTextCount)
        );
        this.totalText = this.totalText.slice(this.eachTextCount);
        this.websocket.send(JSON.stringify(this.params));
      };

      this.websocket.onmessage = msg => {
        this.add(msg);
      };

      this.websocket.onclose = event => {
        this.end();
      };

      this.websocket.onerror = event => {
        // 关闭连接
        this.closeWebsocketConnect();
      };
    }
  }

  // 主动关闭
  closeWebsocketConnect() {
    this.websocket && this.websocket.close();
  }

  async addBuffer() {
    if (this.lock) return;
    if (!this.sourceBuffer) return;
    // if (!this.base64Quene.length) return;
    if (this.sourceBuffer.updating) return;
    this.lock = true;
    let content = '';
    while (this.base64Quene.length > 0) {
      content = this.base64Quene.shift();
      if (content) {
        const buffer = await this.Base64toArrayBuffer(content);
        if (this.sourceBuffer && !this.sourceBuffer.updating) {
          // 确保 sourceBuffer 不在更新中且仍然与 parent 关联
          this.sourceBuffer.appendBuffer(buffer);
        }
        break;
      }
    }
    this.lock = false;
  }

  add(msg) {
    msg = msg.data.replace(' ', '');
    if (typeof msg != 'object') {
      msg = msg.replace(/\ufeff/g, ''); //重点
      var jj = JSON.parse(msg);
      msg = jj;
    }

    if (msg.payload && msg.payload.audio) {
      this.base64Quene.push(msg.payload.audio.audio);
      this.addBuffer();
    }
    // 返回status===2关闭连接
    if (msg.header.status === 2) {
      this.closeWebsocketConnect();
    }
  }

  end() {
    const id = setInterval(() => {
      if (this.base64Quene.length) {
        this.addBuffer();
      }
      if (this.base64Quene.length !== 0 || this.lock !== false) return;
      if (this.totalText) {
        // 上个结束之后，保证base64Quene清空的情况下，继续建立连接往里面放东西
        this.establishConnect(this.params, this.totalText, true);
      } else {
        if (this.mediaSource.readyState === 'open') {
          this.mediaSource.endOfStream();
        }
      }
      clearInterval(id);
    }, 0);
  }

  Base64toArrayBuffer = async base64Data => {
    const rawData = Base64.atob(base64Data);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };
}
