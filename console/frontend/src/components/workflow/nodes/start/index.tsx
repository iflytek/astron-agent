import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import OutputParams from '@/components/workflow/nodes/components/outputs';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';

export const StartDetail = memo(props => {
  const { id, data } = props;
  const { isIteratorStart } = useNodeCommon({ id, data });
  const { t } = useTranslation();

  return (
    <div className="p-[14px] pb-[6px]">
      <OutputParams
        id={id}
        hasRef={false}
        data={data}
        allowAdd={!isIteratorStart}
        disabled={isIteratorStart}
      >
        <div className="text-base font-medium">
          {t('workflow.nodes.common.input')}
        </div>
      </OutputParams>
    </div>
  );
});
