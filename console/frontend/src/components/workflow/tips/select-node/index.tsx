import React from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { message } from 'antd';

export default function Select({ lastSelection }): React.ReactElement {
  const copyNodes = async (): Promise<void> => {
    const cloneLastSelection = cloneDeep(lastSelection);
    cloneLastSelection.nodes = cloneLastSelection.nodes?.filter(
      node => node.type !== 'node-start' && node.type !== 'node-end'
    );
    try {
      await navigator.clipboard.writeText(JSON.stringify(cloneLastSelection));
      message.success('复制成功');
    } catch (err) {
      message.error('[Clipboard] 复制失败', err);
    }
  };

  return (
    <div className="fixed top-[100px] left-[50%] translate-x-[-50%] z-50 flex items-center gap-2">
      <div className="border-[#6356EA] px-4 py-2 rounded-md bg-[#fff]">
        {`已选中${lastSelection?.nodes?.length}个节点`}
      </div>
      <div
        className="px-4 py-2 rounded-md bg-[#6356EA] text-white cursor-pointer"
        onClick={() => copyNodes()}
      >
        复制
      </div>
    </div>
  );
}
