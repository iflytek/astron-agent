import React, { memo } from 'react';
import { FLowCollapse } from '@/components/workflow/ui';
import InputParams from '@/components/workflow/nodes/components/inputs';
import OutputParams from './components/OutputParams';
import ModelSelect from '@/components/workflow/nodes/components/model-select';
import { useTranslation } from 'react-i18next';
import ExceptionHandling from '@/components/workflow/nodes/components/exception-handling';

export const ExtractorParameterDetail = memo(props => {
  const { id, data } = props;
  const { t } = useTranslation();

  return (
    <div id={id}>
      <div className="w-full bg-[#fff] rounded-lg px-[18px]">
        <FLowCollapse
          label={
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium">模型</h2>
            </div>
          }
          content={
            <div className="rounded-md px-[18px] pb-3">
              <ModelSelect id={id} data={data} />
            </div>
          }
        />
        <InputParams allowAdd={false} id={id} data={data}>
          <div className="text-base font-medium">
            {t('workflow.nodes.common.input')}
          </div>
        </InputParams>
        <FLowCollapse
          label={
            <div className="text-base font-medium">
              {t('workflow.nodes.common.output')}
            </div>
          }
          content={<OutputParams id={id} data={data} />}
        />
        <ExceptionHandling id={id} data={data} />
      </div>
    </div>
  );
});
