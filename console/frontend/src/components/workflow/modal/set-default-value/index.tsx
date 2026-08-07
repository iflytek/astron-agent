import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useMemoizedFn } from 'ahooks';
import { cloneDeep } from 'lodash';
import { Button } from 'antd';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import JsonMonacoEditor from '@/components/monaco-editor/JsonMonacoEditor';
import Ajv from 'ajv';
import { generateValidationSchema } from '@/components/workflow/utils/reactflowUtils';
import { Icons } from '@/components/workflow/icons';

function SetDefaultValue(): React.ReactElement {
  const defaultValueModalInfo = useFlowsManager(
    state => state.defaultValueModalInfo
  );
  const setDefaultValueModalInfo = useFlowsManager(
    state => state.setDefaultValueModalInfo
  );
  const currentStore = useFlowsManager(state => state.getCurrentStore());
  const setNode = currentStore(state => state.setNode);
  const [value, setValue] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const validationSchema = useMemo(() => {
    if (defaultValueModalInfo?.nodeId) {
      return generateValidationSchema(defaultValueModalInfo?.data);
    }
    return {};
  }, [defaultValueModalInfo]);

  useEffect(() => {
    if (defaultValueModalInfo?.open) {
      setValue(
        JSON.stringify(defaultValueModalInfo?.data?.schema?.default, null, 2)
      );
    }
  }, [defaultValueModalInfo]);

  const handleOk = useMemoizedFn(() => {
    setNode(defaultValueModalInfo?.nodeId, (old: unknown) => {
      const currentInput = old.data?.outputs.find(
        (item: unknown) => item.id === defaultValueModalInfo?.paramsId
      );
      if (currentInput) {
        currentInput.schema.default = JSON.parse(value);
      }
      return {
        ...cloneDeep(old),
      };
    });
    setDefaultValueModalInfo({
      open: false,
      nodeId: '',
      paramsId: '',
    });
  });

  const validateInputJSON = useMemoizedFn(
    (newValue: string, schema: unknown): string => {
      try {
        const ajv = new Ajv();
        const jsonData = JSON.parse(newValue);
        const validate = ajv.compile(schema);
        const valid = validate(jsonData);
        if (!valid) {
          return (
            validate?.errors?.[0]?.instancePath?.slice(1) +
              ' ' +
              validate?.errors?.[0]?.message || ''
          );
        } else {
          return '';
        }
      } catch {
        return 'Invalid JSON format';
      }
    }
  );

  const handleInputChange = useMemoizedFn((value: string) => {
    setValue(value);
    setErrorMsg(validateInputJSON(value, validationSchema));
  });

  const handleCloseModal = useMemoizedFn(() => {
    setDefaultValueModalInfo({
      open: false,
      nodeId: '',
      paramsId: '',
    });
  });

  return (
    <>
      {defaultValueModalInfo?.open
        ? createPortal(
            <div className="mask">
              <div className="modal-container w-[440px]">
                <div className="flex items-center justify-between font-medium pr-6">
                  <span className="font-semibold text-base">设置默认值</span>
                  <img
                    src={Icons.setDefaultValue.close}
                    className="w-3 h-3 cursor-pointer"
                    alt=""
                    onClick={handleCloseModal}
                  />
                </div>
                <div className="mt-6">
                  <JsonMonacoEditor
                    value={value}
                    onChange={handleInputChange}
                  />
                  <div className="text-[#F74E43] text-xs">{errorMsg}</div>
                </div>
                <div className="flex flex-row-reverse gap-3 mt-7">
                  <Button
                    type="primary"
                    className="px-[48px]"
                    onClick={handleOk}
                    disabled={!!errorMsg}
                  >
                    保存
                  </Button>
                  <Button
                    type="text"
                    className="origin-btn px-[48px]"
                    onClick={handleCloseModal}
                  >
                    取消
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export default SetDefaultValue;
