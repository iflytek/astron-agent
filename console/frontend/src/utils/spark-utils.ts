// import config from '@/config';
import { Base64 } from 'js-base64';
import { message } from 'antd';
// import UrlParse from 'url-parse';
import { localeConfig } from '@/locales/localeConfig';
// const localeNow = sessionStorage.getItem('localeLang');
// const recoilPersist = localStorage.getItem('recoil-persist') || '{}';
// const localeNow = JSON.parse(recoilPersist).locale || 'zh';
// import Compressor from 'compressorjs';
// import eventBus from './eventBus';
import { getLanguageCode } from '@/utils/http';
/**
 * 复制文本
 * @param options
 */
const copyText = async (options: {
  text: string;
  origin?: boolean;
  successText?: string;
}) => {
  const languageCode = getLanguageCode();
  const props = { origin: true, ...options };
  const typeList = [
    'metadata',
    'plugin_debug_param',
    'plugin_debug_response',
    'plugin_cards',
    'plugin_chat_file',
  ];
  const regex = new RegExp('```(' + typeList.join('|') + ')\n(.*?)\n```', 'g');

  // 创建一个临时 div 来解码 HTML 实体
  const decodedText = props.text?.replace(regex, '');
  try {
    // 使用现代的 Clipboard API
    await navigator.clipboard.writeText(decodedText);

    if (!props.successText) {
      message.info(localeConfig?.[languageCode]?.copyDone);
    } else {
      message.info(props.successText);
    }
    console.log('复制成功');
  } catch (err) {
    // 降级方案：如果 Clipboard API 不可用，使用传统方法
    const textarea = document.createElement('textarea');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.value = decodedText;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      if (!props.successText) {
        message.info(localeConfig?.[languageCode]?.copyDone);
      } else {
        message.info(props.successText);
      }
      console.log('复制成功（降级方案）');
    } catch (e) {
      console.error('复制失败：', e);
      message.error('复制失败');
    } finally {
      document.body.removeChild(textarea);
    }
  }
};

/**
 * 复制文本
 * @param options
 */
const copyPureText = (options: {
  text: string;
  origin?: boolean;
  successText?: string;
}) => {
  const props = { origin: true, ...options };
  const typeList = [
    'metadata',
    'plugin_debug_param',
    'plugin_debug_response',
    'plugin_cards',
    'plugin_chat_file',
  ];
  const regex = new RegExp(
    '```(' + typeList.join('|') + ')\n(.*?)\n```\n',
    'g'
  );
  const _text = props.text?.replace(regex, '');
  let input: HTMLInputElement | HTMLTextAreaElement;
  if (props.origin) input = document.createElement('textarea');
  else input = document.createElement('input');

  input.setAttribute('readonly', 'readonly');
  input.value = _text;
  document.body.appendChild(input);
  input.select();
  if (document.execCommand('copy')) document.execCommand('copy');
  document.body.removeChild(input);
  if (!props.successText) {
    message.info('复制成功');
  } else {
    message.info('复制失败');
  }
  console.log('复制成功');
};

const getCookie = (cookieName: string) => {
  const name = cookieName + '=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');

  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i] || '';
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }

  return '';
};

// 将多模态Json转化为相应对象，输入：形如"```multi-video \n {"a":"1"} \n```"默认标签内部为base64的json字符串
const transformMultiModal = (str: string) => {
  let decodedStr = '';
  if (str.startsWith(`\`\`\`multi`)) {
    decodedStr = str;
  } else {
    decodedStr = Base64.decode(str);
  }
  const regex = /^```multi[^\n]*/;
  const matchResult: any = decodedStr.match(regex);
  const tagName = matchResult?.[0]?.split(`\`\`\``)[1];
  const startTag = `\`\`\`${tagName}`;
  const startIndex = decodedStr.indexOf(startTag);
  if (startIndex !== -1) {
    try {
      let objStr = decodedStr.slice(startIndex + startTag.length).trim();
      // 将最后3个```\n去掉
      objStr = objStr.replace(/(\n)?```(\n)?$/, '');
      const obj = JSON.parse(objStr);
      return { type: tagName, data: obj };
    } catch (err) {
      console.log(err);
      return null;
    }
  } else {
    return null; // 如果找不到匹配的内容，可以返回 null 或者其他适当的值
  }
};

/**
 * 获得地址栏中指定参数名称的参数值
 * @param {*} name
 * @param {*} search
 * @returns
 */
const getQueryString = (name: string, search?: any) => {
  if (typeof window !== 'undefined') {
    search = search || window.location.search;
  }
  const reg = new RegExp(`(^|&)${name}=([^&]*)(&|$)`);
  const r = search?.substr(1)?.match(reg);
  if (r != null) {
    return decodeURI(r[2]);
  }
  return null;
};

const getBase64DecodeStr = (str: string) => {
  try {
    return Base64.decode(str);
  } catch (err) {
    return str;
  }
};

const prefixTagMap: any = {
  math_thinking: {
    contentReg: /<math_thinking_content>/g,
    endReg: /<math_thinking_end>/g,
  },
  thinking: {
    contentReg: /<thinking_content>/g,
    endReg: /<thinking_end>/g,
  },
};

const transformMathThinkData = (deCodedData: string, ansContent: any) => {
  const prefix = deCodedData.startsWith('<math_thinking')
    ? 'math_thinking'
    : deCodedData.startsWith('<thinking')
      ? 'thinking'
      : '';
  try {
    const tempContent = { text: '', thinking_cost: 0, ...ansContent };
    if (deCodedData?.includes('math_thinking_title')) {
      const title = deCodedData?.replace(/<math_thinking_title>/g, '');
      tempContent.current_title = title;
      tempContent.text += title;
    } else if (
      deCodedData?.includes('math_thinking_content') ||
      deCodedData?.includes('<thinking_content>')
    ) {
      const content =
        deCodedData?.replace(prefixTagMap?.[prefix]?.contentReg, '') ?? '';
      tempContent.text += content;
    } else if (
      deCodedData?.includes('math_thinking_end') ||
      deCodedData?.includes('<thinking_end>')
    ) {
      const costStr: any = deCodedData?.replace(
        prefixTagMap?.[prefix]?.endReg,
        ''
      );
      tempContent.thinking_cost = Number(
        JSON.parse(costStr)?.thinking_cost ?? '0'
      );
    }
    return tempContent;
  } catch (e) {
    return null;
  }
};

// 将allTools加入
const generateAllToolsInfo = (originMap: any, allToolStr: string) => {
  try {
    const allToolObj = JSON.parse(allToolStr?.replace(/```allTool|```/g, ''));
    const type = allToolObj?.payload?.plugins?.text?.[0]?.name;
    const deskToolName = allToolObj?.payload?.plugins?.text?.[0]?.deskToolName;
    const index = originMap?.findIndex((item: any) => {
      return item.name === type;
    });
    if (index > -1) {
      originMap[index].tools.push(allToolObj);
    } else {
      originMap.push({ name: type, tools: [allToolObj], deskToolName });
    }
    return originMap;
  } catch (e) {
    console.error(e);
    return null;
  }
};

// 转换原始的溯源数据
const transformTraceSource = (originSource: any, traceSourceStr: any) => {
  try {
    // 确保 originSource 是数组
    const safeOriginSource = Array.isArray(originSource) ? originSource : [];

    const newTraceSource = JSON.parse(
      traceSourceStr?.replace(
        /```searchSource|```ragDoc|```zdmSource|```ragAudio|```ragVideo|```ragImage|```ragMultiTrace|```fileMultiTrace|```/g,
        ''
      )
    );

    switch (true) {
      case traceSourceStr.startsWith('```zdmSource'): {
        return [...safeOriginSource, ...newTraceSource];
      }
      case traceSourceStr.startsWith('```searchSource'): {
        return [
          ...safeOriginSource,
          {
            type: 'searchSource',
            data: newTraceSource,
            index: safeOriginSource?.length + 1,
          },
        ];
      }
      case traceSourceStr.startsWith('```ragMultiTrace'): {
        return [...safeOriginSource, newTraceSource];
      }
      case traceSourceStr.startsWith('```fileMultiTrace'): {
        return [...safeOriginSource, newTraceSource];
      }
      default: {
        return traceSourceStr;
      }
    }
  } catch (e) {
    console.error(e);
    return originSource || []; // 发生错误时返回原始源或空数组
  }
};

enum DeepthinkStatus {
  Start = 0,
  Ing,
  End,
}

/** 转换deepthink数据 */
const transformDeepthinkData = (
  callBacks: any,
  deCodedData: string,
  ansContent: any[]
) => {
  const json = JSON.parse(deCodedData.replace('<deep_x1>', ''));
  const tempThinkPeriod: any = ansContent;
  let lastItem: any = ansContent?.slice(-1)?.[0] ?? null;
  let newItemFlag = false; // 指示是否需要新插入对象
  // 初始化新对象
  if (!lastItem || lastItem?.status === DeepthinkStatus.End) {
    newItemFlag = true;
    lastItem = {
      stage: json?.stage,
      category: json?.data?.type,
      seq: tempThinkPeriod?.length + 1,
      status: DeepthinkStatus.Start,
      detail: {},
    };
  }
  switch (json.stage) {
    /** 思考 */
    case 'thinking': {
      let curContent = lastItem.detail?.reason ?? '';
      switch (json.data.status) {
        case 'start':
        case 'ing':
          curContent += json.data.content ?? '';
          lastItem = {
            ...lastItem,
            detail: {
              ...lastItem.detail,
              reason: curContent,
            },
          };
          break;
        case 'end':
          lastItem = {
            ...lastItem,
            status: DeepthinkStatus.End,
            detail: {
              ...lastItem.detail,
              thinkElapsedTime: json.data.thinkElapsedTime,
            },
          };
          break;
      }
      break;
    }
    /** 插件 */
    case 'plugin': {
      switch (json.data.protocol) {
        case 'all-tool': {
          let allToolsList =
            JSON.parse(lastItem?.detail?.allTools ?? null) ?? [];
          allToolsList = generateAllToolsInfo(allToolsList, json.data.content);
          lastItem = {
            ...lastItem,
            detail: {
              ...lastItem.detail,
              allTools: JSON.stringify(allToolsList),
            },
          };
          break;
        }
        case 'search-source': {
          let traceSource =
            JSON.parse(lastItem?.detail?.traceSource ?? null) ?? [];
          const sourceList = JSON.parse(json.data.content)?.[0]?.data;
          traceSource = transformTraceSource(
            traceSource,
            `\`\`\`searchSource\n${JSON.stringify(sourceList)}\n\`\`\``
          );
          lastItem = {
            ...lastItem,
            detail: {
              ...lastItem.detail,
              traceSource: JSON.stringify(traceSource),
            },
          };
          break;
        }
        case 'long-context-trace': {
          callBacks?.setV2Trace?.(json.data.content);
          break;
        }
      }
      if (json.data.status === 'end') {
        lastItem = {
          ...lastItem,
          status: DeepthinkStatus.End,
        };
      }
      break;
    }
  }
  if (newItemFlag) {
    // tempThinkPeriod.push(lastItem);
    try {
      tempThinkPeriod.push(lastItem);
    } catch (error) {
      // 如果数组是只读的，返回新数组
      return [...tempThinkPeriod, lastItem];
    }
  } else {
    // tempThinkPeriod.splice(-1, 1, { ...lastItem });
    try {
      if (tempThinkPeriod.length > 0) {
        tempThinkPeriod[tempThinkPeriod.length - 1] = { ...lastItem };
      }
    } catch (error) {
      // 如果数组是只读的，返回新数组
      const newArray = [...tempThinkPeriod];
      if (newArray.length > 0) {
        newArray[newArray.length - 1] = { ...lastItem };
      }
      return newArray;
    }
  }
  const output = [...tempThinkPeriod];
  return output ?? [];
};

export {
  // getQueryParams,
  // resetBySearch,
  // timeJudge,
  // arrayToKV,
  getQueryString,
  // throttle,
  // debounce,
  // unique,
  // randomString,
  // jumpToForgetPW,
  // jumpToLogin,
  // jumpToLoginDeskSucess,
  // jumpToLoginDesk,
  // jumpToQuestion,
  // numerSplit,
  // registerInviteCode,
  // setQueryString,
  copyText,
  // copyCode,
  copyPureText,
  // moveItemToFirst,
  getCookie,
  // isObjectEmpty,
  // imgFile2Base64,
  transformMultiModal,
  // jumpToLoginBotWeb,
  // getPercent,
  // getRandomItem,
  // getRandomPictureBookObj,
  // logout,
  // tologinWithPath,
  // openUriWithInputTimeoutHack,
  // getTextWidth,
  // compressImage,
  getBase64DecodeStr,
  // deleteSource,
  // getSourceResultArray,
  // assembleNewSourceStr,
  // judgeIsTraceInfo,
  // getFileType,
  // checkSuffix,
  // formatContentEditableText,
  // temporaryPptTrans,
  // jumpToLoginDeskPassport,
  transformMathThinkData,
  generateAllToolsInfo,
  transformDeepthinkData,
  transformTraceSource,
  // getSourceTypeFromStr,
  // handleMultiAudio,
  // base64ToUint8Array,
};
