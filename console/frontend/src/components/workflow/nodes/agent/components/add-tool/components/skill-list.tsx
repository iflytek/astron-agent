import React, { useMemo, useCallback } from 'react';
import { Button, message } from 'antd';
import { FlowInput } from '@/components/workflow/ui';
import { useTranslation } from 'react-i18next';
import search from '@/assets/imgs/workflow/search-icon.svg';
import publishIcon from '@/assets/imgs/workflow/publish-icon.png';
import toolModalAdd from '@/assets/imgs/workflow/tool-modal-add.png';

const SkillToolbar = ({
  searchValue,
  handleInputChange,
}): React.ReactElement => {
  return (
    <div
      className="flex items-center justify-between mx-auto"
      style={{
        width: '90%',
        minWidth: 1000,
      }}
    >
      <div className="w-full flex items-center gap-4 justify-between">
        <div className="relative">
          <img
            src={search}
            className="w-4 h-4 absolute left-[10px] top-[7px] z-10"
            alt=""
          />
          <FlowInput
            value={searchValue}
            className="w-[320px] pl-8 h-[32px] text-sm"
            placeholder="搜索 skill"
            onChange={handleInputChange}
          />
        </div>
        <Button
          type="primary"
          className="flex items-center gap-2"
          onClick={e => {
            e.stopPropagation();
            window.open(`${window.location.origin}/resource/skill`, '_blank');
          }}
          style={{
            height: 40,
          }}
        >
          <img className="w-3 h-3" src={toolModalAdd} alt="" />
          <span>管理 Skill</span>
        </Button>
      </div>
    </div>
  );
};

function SkillList({
  dataSource,
  toolRef,
  searchValue,
  handleInputChange,
  toolsList,
  loading,
  handleAddTool,
}): React.ReactElement {
  const { t } = useTranslation();
  const checkedIds = useMemo(() => {
    return toolsList?.map(item => item?.toolId) || [];
  }, [toolsList]);

  const handleChangeSkill = useCallback(
    (skill): void => {
      if (!checkedIds.includes(String(skill?.id)) && checkedIds?.length >= 30) {
        message.warning(t('workflow.nodes.common.maxAddWarning'));
        return;
      }
      handleAddTool({
        ...skill,
        toolId: String(skill?.id),
        name: skill?.name,
        description: skill?.description,
        type: 'skill',
      });
    },
    [checkedIds, handleAddTool, t]
  );

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{
        padding: '26px 0 43px',
      }}
    >
      <div className="h-full overflow-hidden flex flex-col">
        <div className="flex flex-col mt-4 gap-1.5 flex-1 overflow-hidden">
          <SkillToolbar
            searchValue={searchValue}
            handleInputChange={handleInputChange}
          />
          <div className="flex flex-col gap-[18px] overflow-hidden">
            <div
              className="flex items-center font-medium px-4 mx-auto"
              style={{
                width: '90%',
                minWidth: 1000,
              }}
            >
              <span className="flex-1">Skill</span>
              <span className="w-2/5 min-w-[500px]">更新时间</span>
            </div>
            <div className="flex-1 overflow-auto" ref={toolRef}>
              <div
                className="h-full mx-auto"
                style={{
                  width: '90%',
                  minWidth: 1000,
                }}
              >
                {dataSource.map(item => (
                  <div
                    key={item.id}
                    className="px-4 py-2.5 hover:bg-[#EBEBF1] cursor-pointer border-t border-[#E5E5EC]"
                  >
                    <div className="flex justify-between gap-[52px]">
                      <div className="flex-1 flex items-center gap-[30px] overflow-hidden">
                        <div className="w-[40px] h-[40px] rounded bg-[#ECFDF3] text-[#128058] flex items-center justify-center font-semibold">
                          SK
                        </div>
                        <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                          <div className="font-semibold flex items-center gap-2">
                            <span>{item?.name}</span>
                            <div className="bg-[#E8FFF4] text-[#128058] px-2 py-0.5 rounded text-xs">
                              {item?.folderName || 'root'}
                            </div>
                          </div>
                          <p
                            className="text-[#757575] text-xs text-overflow flex-1"
                            title={item?.description}
                          >
                            {item?.description || '暂无描述'}
                          </p>
                        </div>
                      </div>
                      <div className="w-2/5 flex items-center justify-between min-w-[500px]">
                        <div className="w-1/3 flex items-center gap-1.5 flex-shrink-0">
                          <img src={publishIcon} className="w-3 h-3" alt="" />
                          <p className="text-[#757575] text-xs">
                            {item?.updateTime || '-'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {checkedIds.includes(String(item?.id)) ? (
                            <div
                              className="border border-[#D3DBF8] bg-[#fff] py-1 px-6 rounded-lg cursor-pointer"
                              style={{
                                height: '40px',
                              }}
                              onClick={() => handleChangeSkill(item)}
                            >
                              移除
                            </div>
                          ) : (
                            <Button
                              type="primary"
                              className="px-6"
                              style={{
                                height: 40,
                              }}
                              onClick={() => handleChangeSkill(item)}
                            >
                              {t('workflow.nodes.toolNode.addTool')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {!loading && dataSource.length === 0 ? (
                  <p className="mt-3 px-4">暂无可导入 Skill</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkillList;
