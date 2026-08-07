import React, { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Form } from 'antd';
import DataBaseTable from './components/database-table';
import ImportDataModal from '../../database/components/import-data-modal';
import { DatabaseItem } from '@/types/database';
import {
  TableAddProvider,
  useTableAddState,
  useTableAddForm,
  useTableAddRef,
  useTableAddContext,
} from './context/table-add-context';
import { useTableActions } from './hooks/use-table-actions';
import { useTableInitializer } from './hooks/use-table-initializer';
import { TableForm } from './components/table-form';
import { FieldActions } from './components/field-actions';
import { ActionButtons } from './components/action-buttons';
import { BackButton } from './components/back-button';

interface DataBaseTableAddProps {
  isModule?: boolean;
  info?: DatabaseItem;
  handleUpdate?: () => void;
}

/**
 * 表格添加页面内容组件
 */
const DataBaseTableAddContent: React.FC<{ handleUpdate?: () => void }> = memo(
  ({ handleUpdate }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // 从Context获取状态
    const state = useTableAddState();
    const baseForm = useTableAddForm();
    const databaseRef = useTableAddRef();

    // 初始化
    useTableInitializer();

    // 获取业务方法
    const {
      handleAddField,
      handleInputParamsChange,
      handleBatchInputParamsChange,
      handleDeleteField,
      handleValidateInput,
      handleOk,
      handleImportModalOpen,
      handleImportModalClose,
      handleImport,
    } = useTableActions(handleUpdate);

    const handleNavigateBack = (): void => {
      navigate(-1);
    };

    return (
      <div
        className="flex flex-col w-full h-full mx-auto overflow-hidden"
        style={{
          width: state.isModule ? '100%' : '85%',
        }}
      >
        {!state.isModule && <BackButton onBack={handleNavigateBack} />}

        <div className="flex-1 w-full overflow-scroll rounded-2xl bg-[#fff] p-6">
          <TableForm
            form={baseForm}
            databaseKeywords={state.databaseKeywords}
          />

          <div className="mt-8">
            <FieldActions
              onImportClick={handleImportModalOpen}
              onAddFieldClick={handleAddField}
            />

            <DataBaseTable
              ref={databaseRef}
              dataSource={state.dataSource}
              handleInputParamsChange={handleInputParamsChange}
              handleBatchInputParamsChange={handleBatchInputParamsChange}
              handleCheckInput={handleValidateInput}
              onDel={handleDeleteField}
            />

            {state.dataSource.length < 4 && state.isCheck && (
              <div className="text-[12px] text-[#ff4d4f] mt-2">
                {t('database.atLeastOneCustomField')}
              </div>
            )}
          </div>
        </div>

        <ActionButtons
          isModule={state.isModule}
          saveLoading={state.saveLoading}
          onCancel={handleNavigateBack}
          onSave={handleOk}
        />

        <ImportDataModal
          visible={state.importModalOpen}
          handleCancel={handleImportModalClose}
          onImport={handleImport}
          type={1}
          info={state.info}
        />
      </div>
    );
  }
);

DataBaseTableAddContent.displayName = 'DataBaseTableAddContent';

/**
 * 初始化组件
 */
const DataBaseTableAddInitializer: React.FC<{
  isModule: boolean;
  info?: DatabaseItem;
  handleUpdate?: () => void;
}> = memo(({ isModule, info, handleUpdate }) => {
  const { actions } = useTableAddContext();

  // 设置组件props到Context
  useEffect(() => {
    actions.setComponentProps(isModule, info);
  }, [actions, isModule, info]);

  return <DataBaseTableAddContent handleUpdate={handleUpdate} />;
});

DataBaseTableAddInitializer.displayName = 'DataBaseTableAddInitializer';

/**
 * 表格添加主组件
 */
function DataBaseTableAdd(props: DataBaseTableAddProps): React.JSX.Element {
  const { isModule = false, info, handleUpdate } = props;
  const [baseForm] = Form.useForm();

  return (
    <TableAddProvider baseForm={baseForm}>
      <DataBaseTableAddInitializer
        isModule={isModule}
        info={info}
        handleUpdate={handleUpdate}
      />
    </TableAddProvider>
  );
}

export default memo(DataBaseTableAdd);
