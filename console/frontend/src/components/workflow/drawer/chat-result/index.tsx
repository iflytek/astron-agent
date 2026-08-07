import React, { useMemo, useCallback, memo } from 'react';
import { Drawer, message } from 'antd';
import { useTranslation } from 'react-i18next';
import useFlowStore from '@/components/workflow/store/use-flow-store';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import copy from 'copy-to-clipboard';
import JSONPretty from 'react-json-view';
import MarkdownRender from '@/components/markdown-render';
import { ResultNodeData, FlowResultType } from '@/components/workflow/types';
import { Icons } from '@/components/workflow/icons';

const icons = Icons.chatResult;

/** 通用区块标题 + Copy */
const BlockHeader = ({
  title,
  onCopy,
}: {
  title: string;
  onCopy: () => void;
}): React.ReactElement => (
  <div
    className="flex items-center justify-between bg-[#EAEDF2] px-4 py-1.5"
    style={{ borderRadius: '8px 8px 0 0' }}
  >
    <span className="font-medium">{title}</span>
    <img
      src={icons.resultCopy}
      className="w-4 h-4 cursor-pointer"
      alt=""
      onClick={onCopy}
    />
  </div>
);

/** 输入块 */
const InputBlock = ({
  data,
  onCopy,
}: {
  data: object;
  onCopy: () => void;
}): React.ReactElement => (
  <div className="flex flex-col rounded-lg bg-[#F7F7F7]">
    <BlockHeader title="Input" onCopy={onCopy} />
    <div className="p-3.5">
      <JSONPretty name={false} src={data} theme="rjv-default" />
    </div>
  </div>
);

/** 输出块 */
const OutputBlock = ({
  data,
  onCopy,
}: {
  data: object;
  onCopy: () => void;
}): React.ReactElement => (
  <div className="flex flex-col rounded-lg bg-[#F7F7F7]">
    <BlockHeader title="Output" onCopy={onCopy} />
    <div className="p-3.5">
      <JSONPretty name={false} src={data} theme="rjv-default" />
    </div>
  </div>
);

/** 原始输出块 */
const RawOutputBlock = ({
  content,
  onCopy,
}: {
  content: string;
  onCopy: () => void;
}): React.ReactElement => (
  <div className="flex flex-col rounded-lg bg-[#F7F7F7]">
    <BlockHeader title="Raw Output" onCopy={onCopy} />
    <div className="p-3.5 break-all">{content}</div>
  </div>
);

/** 答案内容块 */
const AnswerBlock = ({
  content,
  onCopy,
}: {
  content: string;
  onCopy: () => void;
}): React.ReactElement => (
  <div className="flex flex-col rounded-lg bg-[#F7F7F7]">
    <BlockHeader title="Answer" onCopy={onCopy} />
    <div className="bg-[#f7f7f7] p-3.5 small-size-markdown">
      <MarkdownRender content={content} isSending={false} />
    </div>
  </div>
);

function FlowChatResult(): React.ReactElement {
  const { t } = useTranslation();
  const nodes = useFlowStore(state => state.nodes);
  const flowChatResultOpen = useFlowsManager(state => state.flowChatResultOpen);
  const setFlowChatResultOpen = useFlowsManager(
    state => state.setFlowChatResultOpen
  );
  const flowResult = useFlowsManager(
    state => state.flowResult
  ) as FlowResultType;

  const resultNodes = useMemo<ResultNodeData[]>((): ResultNodeData[] => {
    return (
      nodes
        ?.filter(
          node =>
            !node?.data?.parentId &&
            (node?.id?.startsWith('node-start') ||
              node?.id?.startsWith('node-end'))
        )
        ?.map(node => ({
          name: node?.type,
          input: node?.data?.debuggerResult?.input,
          rawOutput: node?.data?.debuggerResult?.rawOutput,
          output: node?.data?.debuggerResult?.output,
          answerContent: node?.data?.debuggerResult?.answerContent,
          failedReason: node?.data?.debuggerResult?.failedReason,
          answerMode: node?.data?.debuggerResult?.answerMode,
        })) ?? []
    );
  }, [nodes]);

  const copyData = useCallback(
    (data: string): void => {
      copy(data);
      message.success(t('workflow.nodes.flowChatResult.copySuccess'));
    },
    [t]
  );

  return (
    <Drawer
      rootClassName="operation-result-container"
      placement="right"
      open={flowChatResultOpen}
      mask={false}
    >
      <div className="p-5 pr-0 w-full h-full flex flex-col">
        <div className="flex items-center justify-between pr-5">
          <span className="font-semibold text-lg">
            {t('workflow.nodes.flowChatResult.runResult')}
          </span>
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => setFlowChatResultOpen(false)}
          >
            <span className="cursor-pointer text-base text-[#B1B1B1]">
              {t('workflow.nodes.flowChatResult.collapse')}
            </span>
            <img
              src={icons.chatResultOpen}
              className="w-[14px] h-[14px]"
              alt=""
            />
          </div>
        </div>

        {flowResult?.status ? (
          <div className="flex flex-col gap-4 flex-1 overflow-auto pr-5">
            {resultNodes?.map((node, index) => (
              <div key={index}>
                <div className="text-sm font-medium my-4">{node?.name}</div>
                <div className="flex flex-col gap-4">
                  {node?.input && Object.keys(node?.input).length !== 0 && (
                    <InputBlock
                      data={node.input}
                      onCopy={() => copyData(JSON.stringify(node.input))}
                    />
                  )}
                  {!!node?.rawOutput && (
                    <RawOutputBlock
                      content={String(node.rawOutput)}
                      onCopy={() => copyData(String(node.rawOutput))}
                    />
                  )}
                  {node?.output && Object.keys(node?.output).length !== 0 && (
                    <OutputBlock
                      data={node.output}
                      onCopy={() => copyData(JSON.stringify(node.output))}
                    />
                  )}
                  {node?.answerMode === 1 && node?.answerContent && (
                    <AnswerBlock
                      content={node.answerContent}
                      onCopy={() => copyData(node.answerContent ?? '')}
                    />
                  )}
                  {node?.failedReason && (
                    <p className="text-[#F74E43]">{node.failedReason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4 items-center justify-center h-full">
            <img
              src={icons.noRunningResult}
              className="w-[100px] h-[100px]"
              alt=""
            />
            <p className="text-sm text-[#7D839F]">
              {t('workflow.nodes.flowChatResult.noRunResult')}
            </p>
          </div>
        )}
      </div>
    </Drawer>
  );
}

export default memo(FlowChatResult);
