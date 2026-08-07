import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { message, Modal } from 'antd';
import { cloneDeep } from 'lodash';
import { createTable, updateTable, tableList } from '@/services/database';
import { useTableAddContext } from '../context/table-add-context';
import { useTableImportOps } from './use-table-import-ops';
import { TableField, OperateType } from '@/types/database';

interface BaseFormValues {
  name: string;
  description: string;
}

/**
 * 表格保存Hook
 */
export const useTableSave = (
  handleUpdate?: () => void
): {
  handleOk: () => void;
} => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, actions, baseForm } = useTableAddContext();
  const { markOperationTypes } = useTableImportOps();

  // 表单验证函数
  const handleCheckTableParams = useCallback((): Promise<BaseFormValues> => {
    return new Promise((resolve, reject) => {
      baseForm.validateFields().then((values: BaseFormValues) => {
        let passFlag = true;

        state.dataSource?.forEach(item => {
          if (!item.name || !item.description) {
            passFlag = false;
          }
        });

        actions.setDataSource([...state.dataSource]);

        if (passFlag) {
          resolve(values);
        } else {
          reject(false);
        }
      });
    });
  }, [baseForm, state.dataSource, actions.setDataSource]);

  const handleOk = useCallback((): void => {
    handleCheckTableParams()
      .then(async (values: BaseFormValues) => {
        actions.setIsCheck(true);

        if (state.dataSource.length <= 3) {
          message.warning(t('database.parameterError'));
          return;
        }
        const { name, description } = values;

        try {
          let fields: TableField[] = [];
          const tempData = cloneDeep(state.dataSource);

          if (state.isModule) {
            const finalData = markOperationTypes(
              state.originTableData,
              tempData
            );
            fields = finalData;
          } else {
            fields = tempData.map(it => {
              it.id = 0;
              return it;
            });
          }

          if (state.dataSource.length > 20) {
            message.error(t('database.fieldCountExceeded'));
            return;
          }

          actions.setSaveLoading(true);
          const params = {
            id: state.isModule ? state.info?.id : 0,
            dbId: Number(id) || 0,
            name: name,
            description: description,
            fields,
          };

          const serviceFunc = state.isModule ? updateTable : createTable;

          if (state.isModule) {
            const isModify = fields.some(
              (it: TableField) =>
                it.operateType === OperateType.ADD ||
                it.operateType === OperateType.DELETE
            );

            if (isModify) {
              Modal.confirm({
                title: t('database.tip'),
                content: t('database.confirmModifyTableStructure'),
                centered: true,
                onOk: async () => {
                  try {
                    await serviceFunc(params);
                    actions.setSaveLoading(false);
                    message.success(t('database.saveSuccess'));
                    handleUpdate?.();
                  } catch (error) {
                    actions.setSaveLoading(false);
                  }
                },
                onCancel() {
                  actions.setSaveLoading(false);
                },
              });
            } else {
              await serviceFunc(params);
              actions.setSaveLoading(false);
              message.success(t('database.saveSuccess'));
              handleUpdate?.();
            }
          } else {
            const tables = await tableList({
              dbId: Number(id) || 0,
            });

            if (tables.length >= 20) {
              message.error(t('database.tableCountExceeded'));
              actions.setSaveLoading(false);
              return;
            }

            await serviceFunc(params);
            message.success(t('database.saveSuccess'));
            actions.setSaveLoading(false);
            navigate(-1);
          }
        } catch (error) {
          actions.setSaveLoading(false);
          message.error(t('database.saveFailed'));
        }
      })
      .catch(() => {
        message.warning(t('database.parameterError'));
      });
  }, [
    handleCheckTableParams,
    actions,
    state.dataSource,
    state.isModule,
    state.originTableData,
    state.info?.id,
    markOperationTypes,
    id,
    navigate,
    handleUpdate,
  ]);

  return {
    handleOk,
  };
};
