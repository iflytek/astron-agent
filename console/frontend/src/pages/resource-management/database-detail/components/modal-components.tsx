import React, { memo } from 'react';
import CreateDatabase from '../../database/components/create-database';
import AddTableRowModal from './add-tablerow-modal';
import { useDatabaseState } from '../context/database-context';
import { useDatabaseActions } from '../hooks/use-database-actions';

/**
 * 弹框组件集合
 */
const ModalComponents: React.FC = () => {
  // 从Context获取状态
  const {
    createDatabaseOpen,
    addRowModalOpen,
    dataType,
    currentSheet,
    dbDetailData,
  } = useDatabaseState();

  // 获取业务方法
  const { updateDatabase, closeModal, refreshCurrentTableData } =
    useDatabaseActions();

  return (
    <>
      {/* 创建/编辑数据库模态框 */}
      {createDatabaseOpen && (
        <CreateDatabase
          open={createDatabaseOpen}
          type={'edit'}
          handleCancel={(): void => closeModal('createDatabase')}
          handleOk={updateDatabase}
          info={dbDetailData}
        />
      )}

      {/* 添加行模态框 */}
      {addRowModalOpen && currentSheet && (
        <AddTableRowModal
          dataType={dataType}
          info={currentSheet}
          open={addRowModalOpen}
          setOpen={(): void => closeModal('addRow')}
          handleUpdateTable={refreshCurrentTableData}
        />
      )}
    </>
  );
};

export default memo(ModalComponents);
