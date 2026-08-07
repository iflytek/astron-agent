/* eslint-disable no-undef */
import Ws from './ws';
import './recorder-core';
import './pcm';
import './wav';
import { message } from 'antd';

var testSampleRate = 16000;
var testBitRate = 16;

var SendFrameSize = 1280; /**** 每次发送指定二进制数据长度的数据帧，单位字节，16位pcm取值必须为2的整数倍，8位随意。
16位16khz的pcm 1秒有：16000hz*16位/8比特=32000字节的数据，默认配置3200字节每秒发送大约10次
******/

//=====pcm文件合并核心函数==========
Recorder.PCMMerge = function (fileBytesList, bitRate, sampleRate, True, False) {
  //计算所有文件总长度
  var size = 0;
  for (var i = 0; i < fileBytesList.length; i++) {
    size += fileBytesList[i].byteLength;
  }

  //全部直接拼接到一起
  var fileBytes = new Uint8Array(size);
  var pos = 0;
  for (var i = 0; i < fileBytesList.length; i++) {
    var bytes = fileBytesList[i];
    fileBytes.set(bytes, pos);
    pos += bytes.byteLength;
  }

  //计算合并后的总时长
  var duration = Math.round(((size * 8) / bitRate / sampleRate) * 1000);

  True(fileBytes, duration, { bitRate: bitRate, sampleRate: sampleRate });
};

/**
 * @param {{resetText: (text: string) => void}} options
 * @returns {Object}
 */
function Media({ resetText }) {
  return {
    //重置环境，每次开始录音时必须先调用此方法，清理环境
    RealTimeSendTryReset: function () {
      this.realTimeSendTryChunks = [];
    },

    realTimeSendTryNumber: 0,
    transferUploadNumberMax: 0,
    realTimeSendTryChunk: null,
    realTimeSendTryChunks: [],
    //调用录音
    rec: null,
    status: 0,
    ws: null,
    text: '-',

    //=====实时处理核心函数==========
    RealTimeSendTry: function (buffers, bufferSampleRate, isClose) {
      if (this.realTimeSendTryChunks?.length === 0) {
        this.realTimeSendTryNumber = 0;
        this.transferUploadNumberMax = 0;
        this.realTimeSendTryChunk = null;
      }
      //配置有效性检查
      if (testBitRate == 16 && SendFrameSize % 2 == 1) {
        // console.log('16位pcm SendFrameSize 必须为2的整数倍', 1);
        return;
      }

      var pcm = [],
        pcmSampleRate = 0;
      if (buffers.length > 0) {
        //借用SampleData函数进行数据的连续处理，采样率转换是顺带的，得到新的pcm数据
        var chunk = Recorder.SampleData(
          buffers,
          bufferSampleRate,
          testSampleRate,
          this.realTimeSendTryChunk
        );

        //清理已处理完的缓冲数据，释放内存以支持长时间录音，最后完成录音时不能调用stop，因为数据已经被清掉了
        for (
          var i = this.realTimeSendTryChunk
            ? this.realTimeSendTryChunk.index
            : 0;
          i < chunk.index;
          i++
        ) {
          buffers[i] = null;
        }
        this.realTimeSendTryChunk = chunk; //此时的chunk.data就是原始的音频16位pcm数据（小端LE），直接保存即为16位pcm文件、加个wav头即为wav文件、丢给mp3编码器转一下码即为mp3文件

        pcm = chunk.data;
        pcmSampleRate = chunk.sampleRate;

        if (pcmSampleRate != testSampleRate)
          //除非是onProcess给的bufferSampleRate低于testSampleRate
          throw new Error(
            '不应该出现pcm采样率' +
              pcmSampleRate +
              '和需要的采样率' +
              testSampleRate +
              '不一致'
          );
      }

      //将pcm数据丢进缓冲，凑够一帧发送，缓冲内的数据可能有多帧，循环切分发送
      if (pcm.length > 0) {
        this.realTimeSendTryChunks.push({
          pcm: pcm,
          pcmSampleRate: pcmSampleRate,
        });
      }

      //从缓冲中切出一帧数据
      var chunkSize = SendFrameSize / (testBitRate / 8); //8位时需要的采样数和帧大小一致，16位时采样数为帧大小的一半
      var pcm = new Int16Array(chunkSize),
        pcmSampleRate = 0;
      var pcmOK = false,
        pcmLen = 0;
      for1: for (var i1 = 0; i1 < this.realTimeSendTryChunks.length; i1++) {
        var chunk = this.realTimeSendTryChunks[i1];
        pcmSampleRate = chunk.pcmSampleRate;

        for (var i2 = chunk.offset || 0; i2 < chunk.pcm.length; i2++) {
          pcm[pcmLen] = chunk.pcm[i2];
          pcmLen++;

          //满一帧了，清除已消费掉的缓冲
          if (pcmLen == chunkSize) {
            pcmOK = true;
            chunk.offset = i2 + 1;
            for (var i3 = 0; i3 < i1; i3++) {
              this.realTimeSendTryChunks.splice(0, 1);
            }
            break for1;
          }
        }
      }

      //缓冲的数据不够一帧时，不发送 或者 是结束了
      if (!pcmOK) {
        if (isClose) {
          var number = ++this.realTimeSendTryNumber;
          this.TransferUpload(number, null, 0, null, isClose);
        }
        return;
      }

      //16位pcm格式可以不经过mock转码，直接发送new Blob([pcm.buffer],{type:"audio/pcm"}) 但8位的就必须转码，通用起见，均转码处理，pcm转码速度极快
      var number = ++this.realTimeSendTryNumber;
      var encStartTime = Date.now();
      var recMock = Recorder({
        type: 'pcm',
        sampleRate: testSampleRate, //需要转换成的采样率
        bitRate: testBitRate, //需要转换成的比特率
      });
      recMock.mock(pcm, pcmSampleRate);
      recMock.stop(
        (blob, duration) => {
          blob.encTime = Date.now() - encStartTime;

          //转码好就推入传输
          this.TransferUpload(number, blob, duration, recMock, false);

          //循环调用，继续切分缓冲中的数据帧，直到不够一帧
          this.RealTimeSendTry([], 0, isClose);
        },
        function (msg) {
          //转码错误？没想到什么时候会产生错误！
          console.log('不应该出现的错误:' + msg, 1);
        }
      );
    },

    //=====数据传输函数==========
    TransferUpload: function (number, blobOrNull, duration, blobRec, isClose) {
      this.transferUploadNumberMax = Math.max(
        this.transferUploadNumberMax,
        number
      );
      if (blobOrNull) {
        var blob = blobOrNull;
        var encTime = blob.encTime;
        this.sendData(blob);
        {
          //*********发送方式一：Base64文本发送***************
          // var reader = new FileReader();
          // reader.onloadend = () => {
          //   var base64 = (/.+;\s*base64\s*,\s*(.+)$/i.exec(reader.result) ||
          //     [])[1];
          //   this.sendData(reader.result);
          //   //可以实现
          //   //WebSocket send(base64) ...
          //   //WebRTC send(base64) ...
          //   //XMLHttpRequest send(base64) ...
          //   //这里啥也不干
          // };
          // reader.readAsDataURL(blob);
          //*********发送方式二：Blob二进制发送***************
          //可以实现
          //WebSocket send(blob) ...
          //WebRTC send(blob) ...
          //XMLHttpRequest send(blob) ...
        }
        //****这里仅 console.log一下 意思意思****
        var numberFail =
          number < this.transferUploadNumberMax
            ? '<span style="color:red">顺序错乱的数据，如果要求不高可以直接丢弃</span>'
            : '';
        var logMsg =
          'No.' +
          (number < 100 ? ('000' + number).substr(-3) : number) +
          numberFail;

        // console.logAudio(
        //   blob,
        //   duration,
        //   blobRec,
        //   logMsg + '花' + ('___' + encTime).substr(-3) + 'ms'
        // );

        if (true && number % 100 == 0) {
          //emmm....
          //   console.logClear();
        }
      }

      if (isClose) {
        console.log(
          'No.' +
            (number < 100 ? ('000' + number).substr(-3) : number) +
            ':已停止传输'
        );
      }
    },

    handlemessage: function (data) {
      console.log('response=> first time', this.text);
      if (data.action === 'result') {
        const result = JSON.parse(data.data);
        localStorage.setItem('recorderSid', data.sid);
        let str = '';
        const arr = [];
        result.cn.st.rt.forEach(j => {
          j.ws.forEach(k => {
            k.cw.forEach(l => {
              if (l.wp !== 's') {
                arr.push(l.w);
                str += l.w;
              }
            });
          });
        });
        if (result?.cn?.st?.type === '0') {
          if (this.text === undefined) {
            this.text = arr.join('');
          } else {
            this.text = (this.text || '') + '' + arr.join('');
          }
          resetText(this.text);
        } else {
          resetText((this.text || '') + arr.join(''));
        }
      }
    },

    recStop: function () {
      const message = { end: true };
      const encoder = new TextEncoder();
      const binaryMessage = encoder.encode(JSON.stringify(message));
      this.ws?.send(binaryMessage);

      this.rec && this.rec.close(); //直接close掉即可，这个例子不需要获得最终的音频文件
      this.RealTimeSendTry([], 0, true); //最后一次发送
      this.ws && this.ws.close();
    },

    recStart: function (tokenParam) {
      const _this = this;

      return new Promise((resolve, reject) => {
        if (_this.rec) {
          _this.rec.close();
        }

        _this.ws = new Ws({ handlemessage: _this.handlemessage, tokenParam });
        _this.text = '';
        _this.ws.createWs();
        _this.rec = Recorder({
          type: 'unknown',
          onProcess: (
            buffers,
            powerLevel,
            bufferDuration,
            bufferSampleRate
          ) => {
            //   Runtime.Process.apply(null, arguments);

            //推入实时处理，因为是unknown格式，buffers和rec.buffers是完全相同的，只需清理buffers就能释放内存。
            _this.RealTimeSendTry(buffers, bufferSampleRate, false);
          },
        });

        var t = setTimeout(function () {
          console.log(
            '无法录音：权限请求被忽略（超时假装手动点击了确认对话框）',
            1
          );
        }, 8000);

        _this.rec.open(
          () => {
            //打开麦克风授权获得相关资源
            clearTimeout(t);
            _this.rec.start(); //开始录音

            _this.RealTimeSendTryReset(); //重置环境，开始录音时必须调用一次
            resolve('success');
          },
          function (msg, isUserNotAllow) {
            clearTimeout(t);
            message.info(msg);
            console.error(
              (isUserNotAllow ? 'UserNotAllow，' : '') + '无法录音:' + msg,
              1
            );
            reject(msg);
            throw new Error(msg);
          }
        );
      });
    },

    sendData: function (audioData) {
      // console.log("audioData=>", audioData)
      this.ws.send(audioData);
      this.status = 1;
    },
  };
}
export default Media;
