import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Popconfirm } from 'antd';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import classNames from 'classnames';
import databaseEditIcon from '@/assets/imgs/database/database-edit-icon.svg';
import deleteIcon from '@/assets/imgs/database/delete.png';
import { useDatabaseState } from '../context/database-context';
import { useDatabaseActions } from '../hooks/use-database-actions';
import { DatabaseItem } from '@/types/database';

/**
 * 数据库侧边栏组件
 */
const DatabaseSidebar: React.FC = () => {
  // 从Context获取状态
  const { dbDetailData, tables, tablesLoad, currentSheet } = useDatabaseState();

  // 获取业务方法
  const {
    deleteTableById,
    handleSheetSelect,
    handleDataTypeChange,
    openModal,
  } = useDatabaseActions();

  const handleEditDatabase = (): void => openModal('createDatabase');

  return (
    <div className="w-[28%] flex-none h-full p-6 bg-[#fff] rounded-2xl flex flex-col">
      {/* 数据库信息头部 */}
      <DatabaseHeader
        dbDetailData={dbDetailData}
        onEditDatabase={handleEditDatabase}
      />

      {/* 表格列表 */}
      <TableList
        tables={tables}
        tablesLoad={tablesLoad}
        currentSheet={currentSheet}
        onSelectSheet={handleSheetSelect}
        onDeleteTable={deleteTableById}
        onDataTypeChange={handleDataTypeChange}
      />
    </div>
  );
};

/**
 * 数据库头部信息组件
 */
interface DatabaseHeaderProps {
  dbDetailData: DatabaseItem;
  onEditDatabase: () => void;
}

const DatabaseHeader: React.FC<DatabaseHeaderProps> = memo(
  ({ dbDetailData, onEditDatabase }) => {
    const { t } = useTranslation();

    return (
      <div className="flex items-center justify-between">
        <div
          title={dbDetailData?.name}
          className="text-[#3D3D3D] font-medium flex-1 w-0 truncate"
        >
          {dbDetailData?.name}
        </div>
        <div
          className="text-[#6356EA] text-sm flex items-center gap-2 cursor-pointer"
          onClick={onEditDatabase}
        >
          <img src={databaseEditIcon} className="w-[14px] h-[14px]" alt="" />
          <span>{t('database.edit')}</span>
        </div>
      </div>
    );
  }
);

DatabaseHeader.displayName = 'DatabaseHeader';

/**
 * 表格列表组件
 */
interface TableListProps {
  tables: DatabaseItem[];
  tablesLoad: boolean;
  currentSheet: DatabaseItem | null;
  onSelectSheet: (sheet: DatabaseItem | null) => void;
  onDeleteTable: (id: number) => void;
  onDataTypeChange: (type: number) => void;
}

const TableList: React.FC<TableListProps> = memo(
  ({
    tables,
    tablesLoad,
    currentSheet,
    onSelectSheet,
    onDeleteTable,
    onDataTypeChange,
  }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleSelectSheet = (item: DatabaseItem): void => {
      onDataTypeChange(1);
      onSelectSheet(item);
    };

    const { dbDetailData } = useDatabaseState();

    return (
      <Spin
        spinning={tablesLoad}
        wrapperClassName="flex-1 flex flex-col overflow-hidden [&>.ant-spin-container]:flex-1 [&>.ant-spin-container]:flex [&>.ant-spin-container]:flex-col [&>.ant-spin-container]:overflow-hidden [&>.ant-spin-container>div:first-child]:scrollbar-thin"
      >
        {tables.length ? (
          <div className="flex flex-col flex-1 h-0 gap-2 pt-6 overflow-auto">
            {tables?.map((item: DatabaseItem, index) => (
              <div
                key={index}
                className={classNames(
                  'flex items-center min-w-max w-full gap-1.5 h-12 px-3 py-3.5 text-gray-500 border border-blue-100 rounded-lg bg-white cursor-pointer hover:border-blue-600',
                  {
                    'border-blue-600 bg-blue-50':
                      currentSheet && item.id === currentSheet.id,
                  }
                )}
                onClick={(): void => handleSelectSheet(item)}
              >
                <div
                  className="flex-1 w-0 truncate text-[14px]"
                  title={item.name}
                >
                  {item.name}
                </div>
                <div className="flex-none flex items-center gap-[14px]">
                  <div className="text-[12px]">
                    {dayjs(item.createTime).format('YYYY-MM-DD HH:mm')}
                  </div>
                  <Popconfirm
                    title={t('database.confirmDeleteTable')}
                    onConfirm={(): void => onDeleteTable(item.id)}
                    okText={t('database.confirm')}
                    cancelText={t('database.cancel')}
                  >
                    <img
                      src={deleteIcon}
                      className="w-[14px] h-[14px]"
                      alt=""
                    />
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#B2B2B2] text-[14px]">
            {t('database.noData')}
          </div>
        )}
        <div className="w-full pt-6">
          <div
            className="w-full rounded-lg border border-[#6356EA] py-1 text-center text-[#6356EA] text-sm cursor-pointer"
            onClick={(): void =>
              navigate(`/resource/database/${dbDetailData?.id}/add`)
            }
          >
            {t('database.addDataTable')}
          </div>
        </div>
      </Spin>
    );
  }
);

TableList.displayName = 'TableList';

export default memo(DatabaseSidebar);
