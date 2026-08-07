import React, { memo } from 'react';
import {
  NodeWrapper,
  NodeHeader,
  NodeContent,
  IteratorChildNode,
} from '@/components/workflow/nodes/node-common';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

const BaseNode = memo(props => {
  const { id, data } = props;
  const { isIteratorChildNode } = useNodeCommon({ id, data });

  if (isIteratorChildNode) {
    return <IteratorChildNode id={id} data={data} />;
  }

  return (
    <NodeWrapper id={id} data={data}>
      <NodeHeader id={id} data={data} />
      <NodeContent id={id} data={data} />
    </NodeWrapper>
  );
});

export default BaseNode;
