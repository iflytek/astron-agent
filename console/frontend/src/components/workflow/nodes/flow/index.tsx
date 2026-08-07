import React, { memo } from 'react';
import ExceptionHandling from '@/components/workflow/nodes/components/exception-handling';
import FixedOutputs from '@/components/workflow/nodes/components/fixed-outputs';
import FixedInputs from '@/components/workflow/nodes/components/fixed-inputs';

export const FlowDetail = memo(props => {
  const { id, data } = props;

  return (
    <div className="p-[14px] pb-[6px]">
      <div className="bg-[#fff] rounded-lg flex flex-col gap-2.5">
        <FixedInputs id={id} data={data} />
        <FixedOutputs id={id} data={data} />
        <ExceptionHandling id={id} data={data} />
      </div>
    </div>
  );
});
