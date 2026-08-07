/** 判断输入是否命中推广 */
export const judgePromoteType = (question: string) => {
  if (!question) return '';
  switch (true) {
    case /\b(PPT|PPT生成|年终总结|年终汇报|年终|总结|述职|ppt)\b/.test(
      question
    ):
      return 'ppt';
    default:
      return '';
  }
};

/** 处理otherProps */
export const handleOtherProps = (
  otherProps: any,
  ansContent: any,
  ansType: string
) => {
  const tempProps = { ...otherProps };
  if (ansType === 'o1') {
    return {
      ...tempProps,
      reasoning: ansContent?.text,
      reasoningElapsedSecs: ansContent?.thinking_cost,
    };
  }
  return {};
};
