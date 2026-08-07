import React from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import dialogDel from '@/assets/imgs/main/icon_dialog_del.png';

interface DeleteChatHistoryProps {
  setDeleteModal: (value: boolean) => void;
  deleteChat: () => void;
}

function DeleteChatHistory({
  setDeleteModal,
  deleteChat,
}: DeleteChatHistoryProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="mask">
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md w-[310px]">
        <div className="flex items-center">
          <div className="bg-[#fff5f4] w-10 h-10 flex justify-center items-center rounded-lg">
            <img src={dialogDel} className="w-7 h-7" alt="" />
          </div>
          <span className="ml-2.5">
            {t('workflow.nodes.chatDebugger.confirmDeleteAllDialogue')}
          </span>
        </div>
        <div className="flex flex-row-reverse gap-3 mt-7">
          <Button
            type="text"
            className="delete-btn px-6"
            onClick={() => deleteChat()}
          >
            {t('common.continue')}
          </Button>
          <Button
            type="text"
            className="origin-btn px-6"
            onClick={() => setDeleteModal(false)}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeleteChatHistory;
