import React, { useMemo, memo } from 'react';
import { cloneDeep } from 'lodash';
import { useTranslation } from 'react-i18next';
import { FLowCollapse, FLowTree } from '@/components/workflow/ui';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';

function index({ id, data, children }): React.ReactElement {
  const {
    handleAddOutputLine,
    addUniqueComponentToProperties,
    outputs,
    isStartNode,
    allowAddOutput,
  } = useNodeCommon({ id, data });
  const { t } = useTranslation();

  const treeData = useMemo(() => {
    return addUniqueComponentToProperties(cloneDeep(outputs));
  }, [outputs]);

  return (
    <FLowCollapse
      label={
        <div className="w-full flex items-center cursor-pointer gap-2">
          {children}
        </div>
      }
      content={
        <div className="rounded-md">
          <div className="flex items-start gap-3 text-desc px-[18px] mb-4">
            <h4 className="w-1/4">
              {t('workflow.nodes.common.parameterName')}
            </h4>
            <h4 className="w-1/4">
              {t('workflow.nodes.common.parameterValue')}
            </h4>
            <h4 className="flex-1"></h4>
            {isStartNode && (
              <h4 className="w-[50px]">
                {t('workflow.nodes.common.required')}
              </h4>
            )}
            {outputs.length > 1 && <span className="w-5 h-5"></span>}
          </div>
          <div className="pr-[18px]">
            <FLowTree
              fieldNames={{
                children: 'properties',
              }}
              showLine={false}
              treeData={treeData}
              className="flow-output-tree"
            />
          </div>
          {allowAddOutput && (
            <div
              className="text-[#6356EA] text-xs font-medium mt-1 inline-flex items-center cursor-pointer gap-1.5 pl-6"
              onClick={() => handleAddOutputLine()}
            >
              <img src={inputAddIcon} className="w-3 h-3" alt="" />
              <span>{t('workflow.nodes.common.add')}</span>
            </div>
          )}
        </div>
      }
    />
  );
}

export default memo(index);
