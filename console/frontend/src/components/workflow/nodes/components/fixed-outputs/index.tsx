import React, { useMemo } from 'react';
import { FLowCollapse, FLowTree } from '@/components/workflow/ui';
import { useTranslation } from 'react-i18next';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

function index({ id, data }): React.ReactElement {
  const { titleRender, outputs } = useNodeCommon({ id, data });
  const { t } = useTranslation();
  const treeData = useMemo(() => {
    return outputs?.map(output => ({
      ...output,
      properties: output?.schema?.properties || [],
    }));
  }, [outputs]);
  return (
    <FLowCollapse
      label={
        <div className="text-base font-medium">
          {t('workflow.nodes.common.output')}
        </div>
      }
      content={
        <div
          className="px-[18px]"
          style={{
            pointerEvents: 'auto',
          }}
        >
          <FLowTree
            className="flow-output-tree"
            fieldNames={{
              key: 'id',
              title: 'name',
              children: 'properties',
            }}
            titleRender={titleRender}
            treeData={treeData}
          />
        </div>
      }
    />
  );
}

export default index;
