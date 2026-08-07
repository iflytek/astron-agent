import React, { useState } from 'react';
import { Button, message } from 'antd';
import { deleteTool } from '@/services/plugin';
import dialogDel from '@/assets/imgs/main/icon_dialog_del.png';

function DeleteModal({
  setDeleteModal,
  currentTool,
  getPersonTools,
}): React.ReactElement {
  const [loading, setLoading] = useState(false);

  function handleDelete(): void {
    setLoading(true);
    deleteTool(currentTool.id)
      .then(data => {
        setDeleteModal(false);
        getPersonTools();
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <div className="mask">
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md w-[310px]">
        <div className="flex items-center">
          <div className="bg-[#fff5f4] w-10 h-10 flex justify-center items-center rounded-lg">
            <img src={dialogDel} className="w-7 h-7" alt="" />
          </div>
          <p className="ml-2.5">确认删除插件？</p>
        </div>
        <div
          className="w-full h-10 bg-[#F9FAFB] text-center mt-7 py-2 px-5 text-overflow"
          title={currentTool.name}
        >
          {currentTool.name}
        </div>
        <p className="mt-6 text-desc">
          删除插件是不可逆的。用户将无法再继续问您的插件。
        </p>
        <div className="flex flex-row-reverse gap-3 mt-7">
          <Button
            type="text"
            loading={loading}
            className="delete-btn px-6"
            onClick={handleDelete}
          >
            删除
          </Button>
          <Button
            type="text"
            className="origin-btn px-6"
            onClick={() => setDeleteModal(false)}
          >
            取消
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeleteModal;
