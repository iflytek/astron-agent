export const SampleRate = function (
  pcmDatas,
  pcmSampleRate,
  newSampleRate,
  prevChunkInfo,
  option
) {
  prevChunkInfo || (prevChunkInfo = {});
  let index = prevChunkInfo.index || 0;
  let offset = prevChunkInfo.offset || 0;

  let frameNext = prevChunkInfo.frameNext || [];
  option || (option = {});
  let frameSize = option.frameSize || 1;
  if (option.frameType) {
    frameSize = option.frameType == 'mp3' ? 1152 : 1;
  }

  let nLen = pcmDatas.length;
  if (index > nLen + 1) {
    console.log('SampleData似乎传入了未重置chunk ' + index + '>' + nLen, 3);
  }
  let size = 0;
  for (let fi = index; fi < nLen; fi++) {
    size += pcmDatas[fi].length;
  }
  size = Math.max(0, size - Math.floor(offset));

  //采样
  let step = pcmSampleRate / newSampleRate;
  if (step > 1) {
    //新采样低于录音采样，进行抽样
    size = Math.floor(size / step);
  } else {
    //新采样高于录音采样不处理，省去了插值处理
    step = 1;
    newSampleRate = pcmSampleRate;
  }

  size += frameNext.length;
  let res = new Int16Array(size);
  let idx = 0;
  //添加上一次不够一帧的剩余数据
  for (let ii = 0; ii < frameNext.length; ii++) {
    res[idx] = frameNext[ii];
    idx++;
  }
  //处理数据
  for (; index < nLen; index++) {
    let o = pcmDatas[index];
    let i = offset,
      il = o.length;
    while (i < il) {
      //res[idx]=o[Math.round(i)]; 直接简单抽样

      //当前点=当前点+到后面一个点之间的增量，音质比直接简单抽样好些
      let before = Math.floor(i);
      let after = Math.ceil(i);
      let atPoint = i - before;

      let beforeVal = o[before];
      let afterVal =
        after < il
          ? o[after]
          : //后个点越界了，查找下一个数组
            (pcmDatas[index + 1] || [beforeVal])[0] || 0;
      res[idx] = beforeVal + (afterVal - beforeVal) * atPoint;

      idx++;
      i += step; //抽样
    }
    offset = i - il;
  }
  //帧处理
  frameNext = null;
  let frameNextSize = res.length % frameSize;
  if (frameNextSize > 0) {
    let u8Pos = (res.length - frameNextSize) * 2;
    frameNext = new Int16Array(res.buffer.slice(u8Pos));
    res = new Int16Array(res.buffer.slice(0, u8Pos));
  }

  return {
    index: index,
    offset: offset,

    frameNext: frameNext,
    sampleRate: newSampleRate,
    data: res,
  };
};
