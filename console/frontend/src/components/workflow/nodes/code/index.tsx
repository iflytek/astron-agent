import React, { useMemo, memo } from 'react';
import { FLowCollapse } from '@/components/workflow/ui';
import Inputs from '@/components/workflow/nodes/components/inputs';
import Outputs from '@/components/workflow/nodes/components/outputs';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { useMemoizedFn } from 'ahooks';
import MonacoEditor from '@/components/monaco-editor';
import { useTranslation } from 'react-i18next';
import ExceptionHandling from '../components/exception-handling';
import { CodeDetailProps, CodeNodeParam } from '@/components/workflow/types';
import { Icons } from '@/components/workflow/icons';

export const CodeDetail = memo((props: CodeDetailProps) => {
  const { id, data } = props;
  const { t } = useTranslation();
  const canvasesDisabled = useFlowsManager(state => state.canvasesDisabled);
  const setCodeIDEADrawerlInfo = useFlowsManager(
    state => state.setCodeIDEADrawerlInfo
  );

  const handleOpenIDEA = useMemoizedFn((e: React.MouseEvent) => {
    e.stopPropagation();
    setCodeIDEADrawerlInfo({ open: true, nodeId: id });
  });

  const nodeParam = useMemo<CodeNodeParam>(() => {
    return data?.nodeParam || {};
  }, [data]);

  return (
    <div className="p-[14px] pb-[6px]">
      <div className="bg-[#fff] rounded-lg flex flex-col gap-2.5">
        <Inputs id={id} data={data}>
          <div className="text-base font-medium">
            {t('workflow.nodes.common.input')}
          </div>
        </Inputs>
        <FLowCollapse
          label={
            <div className="flex items-center justify-between">
              <div className="text-base font-medium">
                {t('workflow.nodes.codeNode.code')}
              </div>
              <div
                className="flex items-center gap-0.5 cursor-pointer text-[#6356EA] text-xs"
                onClick={e => handleOpenIDEA(e)}
              >
                <img src={Icons.code.editCode} className="w-3 h-3" alt="" />
                <span>
                  {canvasesDisabled
                    ? t('workflow.nodes.codeNode.viewCode')
                    : t('workflow.nodes.codeNode.editCode')}
                  {t('workflow.nodes.codeNode.code')}
                </span>
              </div>
            </div>
          }
          content={
            <div className="rounded-lg overflow-hidden pt-3 px-3.5 pointer-events-auto global-monaco-editor-python">
              {React.createElement(MonacoEditor as unknown, {
                height: '238px',
                defaultLanguage: 'python',
                value: nodeParam?.code || '',
                options: {
                  readOnly: true,
                  readOnlyEditor: t('workflow.nodes.codeNode.readOnlyEditor'),
                },
              })}
              <p className="mt-2 text-xs text-[#F74E43]">
                {nodeParam?.codeErrMsg}
              </p>
            </div>
          }
        />
        <Outputs id={id} data={data} allowRemove={true} hasDescription={false}>
          <div className="text-base font-medium">
            {t('workflow.nodes.common.output')}
          </div>
        </Outputs>
        <ExceptionHandling id={id} data={data} />
      </div>
    </div>
  );
});
