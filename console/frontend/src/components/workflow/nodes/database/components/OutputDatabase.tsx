import React, { useMemo, memo } from 'react';
import { cloneDeep } from 'lodash';
import { useTranslation } from 'react-i18next';
import { FLowCollapse, FLowTree } from '@/components/workflow/ui';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

function index({ id, data, children }): React.ReactElement {
  const { addUniqueComponentToProperties, currentNode, outputs } =
    useNodeCommon({ id, data });
  const { t } = useTranslation();

  const treeData = useMemo(() => {
    return addUniqueComponentToProperties(cloneDeep(outputs));
  }, [outputs, id, currentNode, outputs]);

  return (
    <FLowCollapse
      label={
        <div className="flex items-center w-full gap-2 cursor-pointer">
          {children}
        </div>
      }
      content={
        <div className="rounded-md">
          <div className="flex items-start gap-3 text-desc px-[18px] mb-4">
            <h4 className="w-1/4">
              {t('workflow.nodes.databaseNode.outputParameterName')}
            </h4>
            <h4 className="w-1/4">
              {t('workflow.nodes.databaseNode.outputFieldType')}
            </h4>
            <h4 className="flex-1">
              {t('workflow.nodes.databaseNode.outputDescription')}
            </h4>
          </div>
          <div className="pr-[18px]">
            <FLowTree
              fieldNames={{
                children: 'properties',
              }}
              showLine={false}
              treeData={treeData}
              className="flow-output-tree"
              defaultExpandAll={true}
            />
          </div>
        </div>
      }
    />
  );
}

export default memo(index);
