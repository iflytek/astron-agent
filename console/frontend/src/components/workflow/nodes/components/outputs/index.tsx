import type { NodeChildrenProps } from '@/components/workflow/nodes/types';
import React, { useMemo, memo } from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { cloneDeep } from 'lodash';
import { useTranslation } from 'react-i18next';
import { FLowCollapse, FLowTree } from '@/components/workflow/ui';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

interface OutputParamsProps extends NodeChildrenProps {
  hasRef?: boolean;
  hasDescription?: boolean;
  allowAdd?: boolean;
  allowRemove?: boolean;
  disabled?: boolean;
  typeStringOnly?: boolean;
}

function index({ id, data, children }: OutputParamsProps): React.ReactElement {
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
          {children || (
            <div className="text-base font-medium">
              {t('workflow.nodes.common.output')}
            </div>
          )}
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
            <Button
              type="text"
              size="small"
              className="workflow-add-parameter"
              icon={<PlusOutlined />}
              onClick={() => handleAddOutputLine()}
            >
              {t('workflow.nodes.common.add')}
            </Button>
          )}
        </div>
      }
    />
  );
}

export default memo(index);
