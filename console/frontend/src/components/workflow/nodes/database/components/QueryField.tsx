import React, { useMemo, useState, memo, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { useTranslation } from 'react-i18next';
import { FLowCollapse } from '@/components/workflow/ui';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import { capitalizeFirstLetter } from '@/components/workflow/utils/reactflowUtils';
import { Select, Radio } from 'antd';
import { cn } from '@/utils';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import { UseQueryFieldReturnProps } from '@/components/workflow/types';

import inputAddIcon from '@/assets/imgs/workflow/input-add-icon.png';
import remove from '@/assets/imgs/workflow/input-remove-icon.png';

const useQueryField = ({
  fieldList,
  setFieldList,
  addDataOptions,
  setAddDataOptions,
  handleChangeNodeParam,
  historyVersion,
  from,
  data,
  allFields,
}): UseQueryFieldReturnProps => {
  const handleRemoveLine = (id): void => {
    const newList = fieldList.filter(it => it.id != id);
    setFieldList(newList);
    updateFieldList(newList);
  };

  const handleAddSelect = (value): void => {
    const findRes = addDataOptions.find(it => it.value == value);
    fieldList.push({
      id: uuid(),
      name: findRes.name,
      type: findRes.type,
      order: 'asc',
    });
    setFieldList([...fieldList]);
    updateFieldList([...fieldList]);
  };

  const sortChange = (e, it): void => {
    const current = fieldList.find(cit => cit.id == it.id);
    current.order = e.target.value;
    setFieldList([...fieldList]);
    updateFieldList([...fieldList]);
  };

  const updateFieldList = (newFieldLsit): void => {
    if (historyVersion) return;
    if (from == 'query') {
      handleChangeNodeParam(
        (data, value) => (data.nodeParam.assignmentList = value),
        newFieldLsit.map(it => it.name)
      );
    } else {
      handleChangeNodeParam(
        (data, value) => (data.nodeParam.orderData = value),
        newFieldLsit.map(it => {
          return {
            fieldName: it.name,
            order: it.order,
          };
        })
      );
    }
    updateOptions(newFieldLsit);
  };

  const updateOptions = (list): void => {
    const addOpts: unknown = [];
    for (let i = 0; i < originOptions.length; i++) {
      const isExit = list.some(item => item.name === originOptions[i].name);
      if (!isExit) {
        addOpts.push(originOptions[i]);
      }
    }
    setAddDataOptions(addOpts);
  };

  const assignList = useMemo(() => {
    return data?.nodeParam?.assignmentList || [];
  }, [data]);

  const orderList = useMemo(() => {
    return data?.nodeParam?.orderData || [];
  }, [data?.nodeParam?.orderData]);
  const originOptions = useMemo(() => {
    return allFields.map(field => {
      return {
        value: uuid(),
        name: field.name,
        required: field.isRequired,
        type: field.type,
        label: `${field.name}(${field.type})`,
      };
    });
  }, [allFields]);

  return {
    originOptions,
    assignList,
    updateOptions,
    updateFieldList,
    orderList,
    handleAddSelect,
    sortChange,
    handleRemoveLine,
  };
};

function index({ id, data, allFields, from, children }): React.ReactElement {
  const { handleChangeNodeParam } = useNodeCommon({ id, data });
  const { t } = useTranslation();
  const historyVersion = useFlowsManager(state => state.historyVersion);
  const [showParams, setShowParams] = useState(true);
  const [addDataOptions, setAddDataOptions] = useState<unknown[]>([]);
  const [fieldList, setFieldList] = useState([]);

  const {
    originOptions,
    assignList,
    updateOptions,
    updateFieldList,
    orderList,
    handleAddSelect,
    sortChange,
    handleRemoveLine,
  } = useQueryField({
    fieldList,
    setFieldList,
    addDataOptions,
    setAddDataOptions,
    handleChangeNodeParam,
    historyVersion,
    from,
    data,
    allFields,
  });

  useEffect(() => {
    setAddDataOptions(originOptions);
  }, [originOptions]);

  useEffect(() => {
    if (!originOptions.length) return;
    if (from === 'query') {
      const list = assignList
        .map(item => {
          const current = originOptions.find(i => i.name === item);
          if (!current) return null;
          return {
            id: uuid(),
            name: current.name,
            type: current.type,
            order: 'asc',
          };
        })
        .filter(Boolean);
      setFieldList(list);
      updateOptions(list);
      if (list.length !== assignList.length) {
        updateFieldList(list);
      }
    }
    if (from === 'sort') {
      const list = orderList
        .map(item => {
          const current = originOptions.find(i => i.name === item.fieldName);
          if (!current) return null;
          return {
            id: uuid(),
            name: item.fieldName,
            type: current.type,
            order: item.order,
          };
        })
        .filter(Boolean);
      setFieldList(list);
      updateOptions(list);
      if (list.length !== orderList.length) {
        updateFieldList(list);
      }
    }
  }, [assignList, orderList, originOptions]);

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
          <div className="flex items-center gap-3 text-desc">
            <h4 className="w-1/3">
              {t('workflow.nodes.databaseNode.queryParameterName')}
            </h4>
            <span className="w-5 h-5"></span>
          </div>
          <div className="flex flex-col gap-3 mt-4 mb-2">
            {fieldList.map(item => {
              return (
                item.type != 'range' && (
                  <div key={item.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex flex-shrink-0 w-1/3">
                        <div className="flex items-center relative gap-2.5 overflow-hidden">
                          <span className="relative flex items-center gap-1.5 max-w-[100px]">
                            <span
                              className="flex-1 text-overflow"
                              title={item?.name}
                            >
                              {item.name}
                            </span>
                          </span>
                          <div className="bg-[#F0F0F0] py-1 px-2.5 rounded text-xs ml-1 flex-shrink-0">
                            {capitalizeFirstLetter(item?.type)}
                          </div>
                        </div>
                      </div>

                      {from == 'sort' && (
                        <div className="flex justify-end flex-1 overflow-hidden">
                          <Radio.Group
                            value={item?.order || null}
                            onChange={e => sortChange(e, item)}
                            defaultValue="asc"
                          >
                            <Radio.Button value="asc">
                              {t('workflow.nodes.databaseNode.ascending')}
                            </Radio.Button>
                            <Radio.Button value="desc">
                              {t('workflow.nodes.databaseNode.descending')}
                            </Radio.Button>
                          </Radio.Group>
                        </div>
                      )}

                      <img
                        src={remove}
                        className="w-[16px] h-[17px] flex-none"
                        style={{
                          cursor: 'pointer',
                          opacity: 1,
                        }}
                        onClick={() => {
                          setAddDataOptions([
                            ...addDataOptions,
                            {
                              value: uuid(),
                              name: item.name,
                              label: item.name,
                              type: item.type,
                            },
                          ]);
                          handleRemoveLine(item.id);
                        }}
                        alt=""
                      />
                    </div>
                  </div>
                )
              );
            })}
          </div>
          <Select
            value={null}
            disabled={!addDataOptions.length}
            className={cn('flow-select nodrag w-1/3')}
            dropdownAlign={{ offset: [0, 0] }}
            placeholder={
              <div className="text-[#6356EA] text-xs font-medium mt-1 inline-flex items-center cursor-pointer gap-1.5">
                <img src={inputAddIcon} className="w-3 h-3" alt="" />
                <span>{t('workflow.nodes.databaseNode.queryAdd')}</span>
              </div>
            }
            options={addDataOptions}
            onChange={value => handleAddSelect(value)}
          />
        </div>
      }
    />
  );
}

export default memo(index);
