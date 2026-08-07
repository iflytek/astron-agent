import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Input, Button, Select, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { saveFlowAPI } from '@/services/flow';
import { getAgentType } from '@/services/agent-square';
import MoreIcons from './more-icons';
import globalStore from '@/store/global-store';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import copy from 'copy-to-clipboard';

import formSelect from '@/assets/imgs/main/icon_nav_dropdown.svg';
import close from '@/assets/imgs/workflow/modal-close.png';
import flowIdCopyIcon from '@/assets/imgs/workflow/flowId-copy-icon.svg';

const { TextArea } = Input;

const EditFlowForm = ({
  typeList,
  tempFlow,
  setTempFlow,
  setShowModal,
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className="mt-6">
      <div className="flex items-center gap-6">
        <div className="flex flex-col flex-1">
          <div className="text-second font-medium text-sm flex gap-0.5">
            <span className="text-[#F74E43]">*</span>
            <span>{t('workflow.nodes.flowModal.workflowName')}</span>
          </div>
          <div className="flex items-center mt-1.5">
            <div
              className={`w-10 h-10 flex justify-center items-center rounded-lg mr-3 cursor-pointer`}
              style={{
                background: `url(${tempFlow.avatarIcon}) no-repeat center / cover`,
              }}
              onClick={() => setShowModal(true)}
            ></div>
            <Input
              value={tempFlow?.name}
              maxLength={20}
              showCount
              onChange={e =>
                setTempFlow({
                  ...tempFlow,
                  name: e.target.value,
                })
              }
              placeholder={t('common.inputPlaceholder')}
              className="global-input flex-1"
            />
          </div>
        </div>
        <div className="flex flex-col flex-1">
          <div className="text-second font-medium text-sm flex gap-0.5">
            <span>{t('workflow.nodes.flowModal.workflowCategory')}</span>
          </div>
          <Select
            className="global-select w-full mt-1.5"
            suffixIcon={<img src={formSelect} className="w-4 h-4 " />}
            placeholder={t('common.pleaseSelect')}
            options={typeList}
            value={tempFlow?.category}
            onChange={value =>
              setTempFlow({
                ...tempFlow,
                category: value,
              })
            }
          />
        </div>
      </div>
      <div className="mt-6 text-second font-medium text-sm flex gap-0.5">
        <span className="text-[#F74E43]">*</span>
        <span>{t('workflow.nodes.flowModal.workflowDescription')}</span>
      </div>
      <p className="mt-1.5 text-xs font-medium desc-color">
        {t('workflow.nodes.flowModal.workflowDescriptionTip')}
      </p>
      <div className="relative">
        <TextArea
          value={tempFlow?.description}
          onChange={e =>
            setTempFlow({
              ...tempFlow,
              description: e.target.value,
            })
          }
          className="mt-1.5 global-textarea"
          style={{ height: 104 }}
          maxLength={200}
          placeholder={t('common.inputPlaceholder')}
        />
        <div className="absolute bottom-3 right-3 ant-input-limit ">
          {tempFlow?.description?.length} / 200
        </div>
      </div>
    </div>
  );
};

function EditModal({ currentFlow, setModalType }): React.ReactElement {
  const { t } = useTranslation();
  const setCurrentFlow = useFlowsManager(state => state.setCurrentFlow);
  const avatarIcon = globalStore(state => state.avatarIcon);
  const avatarColor = globalStore(state => state.avatarColor);
  const getAvatarConfig = globalStore(state => state.getAvatarConfig);
  const [showModal, setShowModal] = useState(false);
  const [tempFlow, setTempFlow] = useState({});
  const [loading, setLoading] = useState(false);
  const [typeList, setTypeList] = useState([]);

  useEffect(() => {
    setTempFlow({ ...currentFlow });
  }, [currentFlow]);

  useEffect(() => {
    getAvatarConfig();
    getAgentType().then(data =>
      setTypeList(
        data?.map(item => ({ label: item.typeName, value: item.typeKey }))
      )
    );
  }, []);

  const handleOk = useCallback(() => {
    setLoading(true);
    const params = {
      id: tempFlow?.id,
      flowId: tempFlow?.flowId,
      name: tempFlow?.name,
      description: tempFlow?.description,
      avatarIcon: tempFlow.avatarIcon,
      color: tempFlow.color,
      category: tempFlow.category,
    };
    saveFlowAPI(params)
      .then(data => {
        setModalType('');
        setCurrentFlow(currentFlow => ({
          ...currentFlow,
          name: tempFlow.name,
          description: tempFlow.description,
          updateTime: tempFlow.updateTime,
          avatarIcon: tempFlow.avatarIcon,
          color: tempFlow.color,
          category: tempFlow.category,
        }));
      })
      .finally(() => setLoading(false));
  }, [tempFlow]);

  const canSubmit = useMemo(() => {
    return !loading && tempFlow?.name?.trim() && tempFlow?.description?.trim();
  }, [loading, tempFlow]);

  return (
    <>
      {createPortal(
        <div
          className="mask"
          style={{
            zIndex: 1001,
          }}
        >
          {showModal && (
            <MoreIcons
              icons={avatarIcon}
              colors={avatarColor}
              botIcon={{
                name: tempFlow?.address,
                value: tempFlow?.avatarIcon,
              }}
              setBotIcon={appIcon =>
                setTempFlow(tempFlow => ({
                  ...tempFlow,
                  address: appIcon.name,
                  avatarIcon: appIcon.value,
                }))
              }
              botColor={currentFlow?.color}
              setBotColor={value =>
                setTempFlow(tempFlow => ({
                  ...tempFlow,
                  color: value,
                }))
              }
              setShowModal={setShowModal}
              isFlow={true}
            />
          )}
          <div className="absolute bg-[#fff] rounded-2xl p-6 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[640px]">
            <div className="flex items-center justify-between font-medium">
              <span className="font-semibold text-base">
                {t('workflow.nodes.flowModal.editWorkflow')}
              </span>
              <img
                src={close}
                className="w-3 h-3 cursor-pointer"
                alt=""
                onClick={() => setModalType('')}
              />
            </div>
            <EditFlowForm
              typeList={typeList}
              tempFlow={tempFlow}
              setTempFlow={setTempFlow}
              setShowModal={setShowModal}
            />
            <div className="flex items-end justify-between mt-10">
              <div className="flex items-center gap-3">
                <p className="text-desc text-[#7F7F7F]">
                  {t('workflow.nodes.flowModal.flowId')}：{currentFlow?.flowId}
                </p>
                <img
                  src={flowIdCopyIcon}
                  className="w-[14px] h-[14px] cursor-pointer"
                  alt=""
                  onClick={() => {
                    copy(currentFlow?.flowId);
                    message.success(t('workflow.nodes.flowModal.copySuccess'));
                  }}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="primary"
                  className="px-6"
                  onClick={handleOk}
                  disabled={!canSubmit}
                >
                  {t('common.save')}
                </Button>
                <Button
                  type="text"
                  className="origin-btn px-6"
                  onClick={() => setModalType('')}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default EditModal;
