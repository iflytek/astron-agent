import React, { useEffect, useRef, useState, useMemo } from 'react';
import { getCommonConfig } from '@/services/common';
import MarkdownRender from '@/components/markdown-render';
import { NodeDetailProps, NodeTemplateItem } from '@/components/workflow/types';
import { Icons } from '@/components/workflow/icons';

function NodeDetail({
  currentNodeId,
  handleCloseNodeTemplate,
}: NodeDetailProps): void {
  const nodeDetailRef = useRef<HTMLDivElement | null>(null);
  const [nodeTemplate, setNodeTemplate] = useState<NodeTemplateItem[]>([]);

  useEffect(() => {
    const params = {
      category: 'TEMPLATE',
      code: 'node',
    };
    getCommonConfig(params).then((data: unknown) => {
      setNodeTemplate(JSON.parse(data?.value));
    });
  }, []);

  useEffect(() => {
    const dom = document.getElementById('flow-container');
    if (dom && nodeDetailRef.current) {
      const left = dom.getBoundingClientRect()?.left;
      nodeDetailRef.current.style.left = `${left + 16}px`;
    }
  }, []);

  const currentTemplateNode = useMemo(() => {
    return nodeTemplate?.find(
      (item: NodeTemplateItem) => item?.idType === currentNodeId
    );
  }, [nodeTemplate, currentNodeId]);

  return (
    <div
      className="node-detail-template fixed top-[104px] left-0  bg-[#fff]"
      style={{
        height: 'calc(100vh - 152px)',
        borderRadius: '10px',
        boxShadow: '0px 2px 11px 0px rgba(0,0,0,0.06)',
        padding: '11px 5px 16px 11px',
        width: '30%',
        zIndex: 998,
      }}
      ref={nodeDetailRef}
    >
      <div className="h-full flex flex-col gap-2.5 overflow-hidden">
        <div className="w-full flex items-center justify-between pr-1.5">
          <img src={currentTemplateNode?.icon} className="w-6 h-6" alt="" />
          <img
            src={Icons.nodeDetail.close}
            className="w-3 h-3 cursor-pointer"
            alt=""
            onClick={() => handleCloseNodeTemplate()}
          />
        </div>
        {
          <div className="flex-1 overflow-auto">
            <div className="text-sm font-medium">
              {currentTemplateNode?.name}
            </div>
            <MarkdownRender
              content={currentTemplateNode?.markdown}
              isSending={false}
            />
          </div>
        }
      </div>
    </div>
  );
}

export default NodeDetail;
