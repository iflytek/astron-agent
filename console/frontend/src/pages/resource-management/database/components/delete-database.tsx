import React, { useState } from 'react';
import { Button, message } from 'antd';
import { deleteDb } from '@/services/database';
import { useTranslation } from 'react-i18next';
import dialogDel from '@/assets/imgs/common/delete-red.png';
import { DatabaseItem } from '@/types/database';

export default function DeleteModal({
  setDeleteModal,
  currentData,
  getDataBase,
}: {
  setDeleteModal: (val: boolean) => void;
  currentData: DatabaseItem;
  getDataBase: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleDelete = (): void => {
    setLoading(true);
    deleteDb({ id: currentData.id })
      .then(() => {
        setDeleteModal(false);
        getDataBase();
      })
      .catch(error => {
        message.error(error.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="mask">
      <div className="p-6 absolute bg-[#fff] rounded-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-second font-medium text-md min-w-[310px]">
        <div className="flex items-center">
          <div className="bg-[#fff5f4] w-10 h-10 flex justify-center items-center rounded-lg">
            <img src={dialogDel} className="w-7 h-7" alt="" />
          </div>
          <p className="ml-2.5">{t('database.confirmDeleteDatabase')}</p>
        </div>
        <div
          className="w-full h-10 bg-[#F9FAFB] text-center mt-7 py-2 px-5 text-overflow"
          title={currentData.name}
        >
          {currentData.name}
        </div>
        <p className="mt-6 text-desc max-w-[310px]">
          {t('database.deleteDatabaseIrreversible')}
        </p>
        <div className="flex flex-row-reverse gap-3 mt-7">
          <Button
            type="text"
            loading={loading}
            className="delete-btn px-6"
            onClick={handleDelete}
          >
            {t('database.delete')}
          </Button>
          <Button
            type="text"
            className="origin-btn px-6"
            onClick={(): void => setDeleteModal(false)}
          >
            {t('database.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
