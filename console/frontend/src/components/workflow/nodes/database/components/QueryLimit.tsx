import React, { useCallback, useState, memo } from 'react';
import { cloneDeep } from 'lodash';
import { FlowInputNumber, FLowCollapse } from '@/components/workflow/ui';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';

function index({ id, data, children }): React.ReactElement {
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const canPublishSetNot = useFlowsManager(state => state.canPublishSetNot);
  const autoSaveCurrentFlow = useFlowsManager(
    state => state.autoSaveCurrentFlow
  );
  const setNode = currentStore(state => state.setNode);
  const [showParams, setShowParams] = useState(true);

  // 节点参数改变
  const handleChangeNodeParam = useCallback(
    (fn, value) => {
      setNode(id, old => {
        fn(old.data, value);
        return {
          ...cloneDeep(old),
        };
      });
      autoSaveCurrentFlow();
      canPublishSetNot();
    },
    [id, autoSaveCurrentFlow, canPublishSetNot]
  );

  return (
    <FLowCollapse
      label={
        <div
          className="flex items-center w-full gap-2 cursor-pointer"
          onClick={() => setShowParams(!showParams)}
        >
          {children}
        </div>
      }
      content={
        <div className="px-[18px] rounded-lg overflow-hidden">
          <div className="flex items-center">
            <h4 className="w-1/3">
              <FlowInputNumber
                className="w-full"
                value={data?.nodeParam?.limit}
                min={1}
                max={1000}
                precision={0}
                onChange={value => {
                  handleChangeNodeParam(
                    (data, value) => (data.nodeParam.limit = value),
                    value
                  );
                }}
                onBlur={e => {
                  const value = e.target.value;
                  if (!value && typeof value !== 'number') {
                    handleChangeNodeParam(
                      (data, value) => (data.nodeParam.limit = value),
                      1
                    );
                  }
                }}
              />
            </h4>
          </div>
        </div>
      }
    />
  );
}

export default memo(index);
