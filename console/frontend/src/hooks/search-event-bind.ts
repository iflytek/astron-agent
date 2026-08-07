import $ from 'jquery';
import { MutableRefObject } from 'react';
import { getTraceList } from '@/utils';
import { MessageListType, SourceInfoItem } from '@/types/chat';

// jQuery 点击事件目标类型
interface FootnoteTarget extends HTMLElement {
  dataset: {
    index: string;
  };
}

function useBindEvents(
  lastClickedQA: MutableRefObject<MessageListType | null>
) {
  /** 处理联网搜索 */
  const handleNetSearch = (
    traceSourceList: SourceInfoItem[],
    index: number
  ): boolean => {
    let flag = false;
    traceSourceList?.forEach((item: SourceInfoItem, sourceIdx: number) => {
      if (
        !flag &&
        ((item.index || item.index === 0) === index ||
          Math.floor(index) === (item.index || 0))
      ) {
        const url = traceSourceList[sourceIdx]?.url;
        if (url) {
          window.open(url);
          flag = true;
        }
      }
    });
    return flag;
  };

  /** 绑定普通对话的标签点击事件 */
  const bindTagClickEvent = (): void => {
    $('.custom-footnote').off('click');
    $('.custom-footnote').on<FootnoteTarget>('click', function (e) {
      // 由于事件冒泡，所以要将此函数动作后置
      setTimeout(async () => {
        const tagIndexStr = e.target.dataset.index;
        const tagIndex = parseInt(tagIndexStr, 10);
        const traceSource = lastClickedQA?.current?.traceSource;
        if (traceSource) {
          const traceSourceList = getTraceList(traceSource);
          handleNetSearch(traceSourceList, tagIndex);
        }
      }, 50);
    });
  };

  return {
    bindTagClickEvent,
  };
}

export default useBindEvents;
