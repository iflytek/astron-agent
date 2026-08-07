import React, { useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';

import close from '@/assets/imgs/workflow/modal-close.png';

// ========= Props 类型 =========
interface ConfirmModalProps {
  setConfirmModal: (value: boolean) => void;
}

// ========= ConfirmModal 组件 =========
function ConfirmModal({
  setConfirmModal,
}: ConfirmModalProps): React.ReactElement {
  const { t } = useTranslation();
  const setCanvasesDisabled = useFlowsManager(
    state => state.setCanvasesDisabled
  );
  const setShowMultipleCanvasesTip = useFlowsManager(
    state => state.setShowMultipleCanvasesTip
  );
  const getFlowDetail = useFlowsManager(state => state.getFlowDetail);

  const handleOk = (): void => {
    setConfirmModal(false);
    setCanvasesDisabled(false);
    setShowMultipleCanvasesTip(false);
    getFlowDetail();
  };

  return (
    <div className="mask">
      <div className="modal-container">
        <div className="flex items-center justify-end">
          <img
            src={close}
            className="w-3 h-3 cursor-pointer"
            alt=""
            onClick={() => setConfirmModal(false)}
          />
        </div>
        <div className="text-sm mt-5 text-center">
          {t(
            'workflow.nodes.multipleCanvasesTip.continueEditingInCurrentWindow'
          )}
        </div>
        <div className="flex flex-row-reverse gap-3 mt-7">
          <Button
            type="primary"
            style={{ paddingLeft: 48, paddingRight: 48 }}
            onClick={handleOk}
          >
            {t('workflow.nodes.multipleCanvasesTip.confirm')}
          </Button>
          <Button
            type="text"
            className="origin-btn"
            style={{ paddingLeft: 48, paddingRight: 48 }}
            onClick={() => setConfirmModal(false)}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ========= MultipleCanvasesTip 组件 =========
function MultipleCanvasesTip(): React.ReactElement | null {
  const { t } = useTranslation();
  const showMultipleCanvasesTip = useFlowsManager(
    state => state.showMultipleCanvasesTip
  );
  const [confirmModal, setConfirmModal] = useState<boolean>(false);

  if (!showMultipleCanvasesTip) return null;

  return (
    <>
      {confirmModal && <ConfirmModal setConfirmModal={setConfirmModal} />}
      <div className="w-full bg-[#E3EDFF] rounded flex items-center justify-center gap-4 py-2.5 text-xs">
        <div className="text-[#73819B]">
          {t('workflow.nodes.multipleCanvasesTip.multipleWindowsTip')}
        </div>
        <div
          className="text-[#6356EA] cursor-pointer"
          onClick={() => setConfirmModal(true)}
        >
          {t('workflow.nodes.multipleCanvasesTip.continueEditing')}
        </div>
      </div>
    </>
  );
}

export default MultipleCanvasesTip;
