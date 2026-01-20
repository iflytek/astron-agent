import {
  Button,
  Select,
  Form,
  Input,
  Radio,
  Tooltip,
  FormInstance,
} from 'antd';
import { debounce } from 'lodash';
import JsonMonacoEditor from '@/components/monaco-editor/json-monaco-editor';
import ToolInputParameters from '@/components/table/tool-input-parameters';
import ToolInputParametersDetail from '@/components/table/tool-input-parameters-detail';
import ToolOutputParameters from '@/components/table/tool-output-parameters';
import ToolOutputParametersDetail from '@/components/table/tool-output-parameters-detail';
import DebuggerTable from '@/components/table/debugger-table';
import { isJSON } from '@/utils/utils';
import { useTranslation } from 'react-i18next';
import ImportModal from './import';

import publishIcon from '@/assets/imgs/workflow/publish-icon.png';
import noAuthorizationRequired from '@/assets/imgs/plugin/no-authorization-required.png';
import toolModalChecked from '@/assets/imgs/workflow/tool-modal-checked.png';
import serviceIcon from '@/assets/imgs/plugin/service-icon.png';
import questionCircle from '@/assets/imgs/workflow/question-circle.png';
import createToolStep from '@/assets/imgs/workflow/create-tool-step.png';
import toolArrowLeft from '@/assets/imgs/workflow/tool-arrow-left.png';
import toolCreateUser from '@/assets/imgs/workflow/tool-create-user.png';
import { AvatarType, InputParamsData, ToolItem } from '@/types/resource';
import MoreIcons from '../more-icons';
import { useToolDebugger } from './hooks/use-tool-debugger';
import React, { FC, forwardRef, useEffect, useState } from 'react';

import {
  BaseFormData,
  ParamsFormData,
  useCreateTool,
} from './hooks/use-create-tool';

// 步骤指示器组件
const StepIndicator: React.FC<{
  step: number;
  setStep: (step: number) => void;
}> = ({ step, setStep }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-[53px] mb-[45px] w-4/5 mx-auto">
      <div className="flex-1">
        <div
          className="flex items-center gap-1.5 cursor-pointer"
          onClick={() => setStep(1)}
        >
          <div
            className="w-4 h-4 rounded-full text-center text-[#fff]"
            style={{
              lineHeight: '16px',
              background: step === 1 ? '#6356EA' : '#333333',
            }}
          >
            1
          </div>
          <span
            className="font-medium text-lg"
            style={{
              color: step === 1 ? '#6356EA' : '',
              lineHeight: '28px',
            }}
          >
            {t('plugin.fillBasicInfo')}
          </span>
        </div>
        <div
          className="w-full h-[7px] mt-1"
          style={{
            background: step === 1 ? '#6356EA' : '#E2E3E5',
          }}
        ></div>
        <p className="text-desc mt-2.5">{t('plugin.fillPluginIntro')}</p>
      </div>
      <img className="w-[14px] h-[12px]" src={createToolStep} alt="" />
      <div className="flex-1">
        <div
          className="flex items-center gap-1.5 cursor-pointer"
          onClick={() => setStep(2)}
        >
          <div
            className="w-4 h-4 rounded-full text-center text-[#fff]"
            style={{
              lineHeight: '16px',
              background: step === 2 ? '#6356EA' : '#333333',
            }}
          >
            2
          </div>
          <span
            className="font-medium text-lg"
            style={{
              color: step === 2 ? '#6356EA' : '',
              lineHeight: '28px',
            }}
          >
            {t('plugin.addPlugin')}
          </span>
        </div>
        <div
          className="w-full h-[7px] mt-1"
          style={{
            background: step === 2 ? '#6356EA' : '#E2E3E5',
          }}
        ></div>
        <p className="text-desc mt-2.5">{t('plugin.submitPluginParams')}</p>
      </div>
      <img className="w-[14px] h-[12px]" src={createToolStep} alt="" />
      <div className="flex-1">
        <div
          className="flex items-center gap-1.5 cursor-pointer"
          onClick={() => setStep(3)}
        >
          <div
            className="w-4 h-4 rounded-full text-center text-[#fff]"
            style={{
              lineHeight: '16px',
              background: step === 3 ? '#6356EA' : '#333333',
            }}
          >
            3
          </div>
          <span
            className="font-medium text-lg"
            style={{
              color: step === 3 ? '#6356EA' : '',
              lineHeight: '28px',
            }}
          >
            {t('plugin.debugAndVerify')}
          </span>
        </div>
        <div
          className="w-full h-[7px] mt-1"
          style={{
            background: step === 3 ? '#6356EA' : '#E2E3E5',
          }}
        ></div>
        <p className="text-desc mt-2.5">{t('plugin.debugAndVerifyDesc')}</p>
      </div>
    </div>
  );
};

// 认证字段组件
const AuthorizationFields: React.FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <Form.Item
        name="location"
        label={
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              <span className="text-[#F74E43]">*</span> {t('plugin.position')}
            </span>
            <p className="text-desc">{t('plugin.headerOrQuery')}</p>
          </div>
        }
        rules={[
          {
            required: true,
            message: t('plugin.pleaseEnterLocation'),
          },
        ]}
      >
        <Radio.Group>
          <Radio.Button value="header">
            <div
              className="w-full flex justify-between items-center gap-2.5"
              style={{
                padding: '11px 4px',
              }}
            >
              <div className="text-[#333333] font-medium">
                {t('plugin.header')}
              </div>
              <div className="w-[18px] h-[18px] rounded-full bg-[#fff] border border-[#CACEE0] flex items-center justify-center checked-icon-container">
                <img
                  src={toolModalChecked}
                  className="w-[14px] h-[14px] checked-icon hidden"
                  alt=""
                />
              </div>
            </div>
          </Radio.Button>
          <Radio.Button value="query">
            <div
              className="w-full flex justify-between items-center gap-2.5"
              style={{
                padding: '11px 4px',
              }}
            >
              <div className="text-[#333333] font-medium">
                {t('plugin.query')}
              </div>
              <div className="w-[18px] h-[18px] rounded-full bg-[#fff] border border-[#CACEE0] flex items-center justify-center checked-icon-container">
                <img
                  src={toolModalChecked}
                  className="w-[14px] h-[14px] checked-icon hidden"
                  alt=""
                />
              </div>
            </div>
          </Radio.Button>
        </Radio.Group>
      </Form.Item>
      <Form.Item
        name="parameterName"
        label={
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              <span className="text-[#F74E43]">*</span>{' '}
              {t('plugin.parameterName')}
            </span>
            <p className="text-desc">{t('plugin.parameterNameDesc')}</p>
          </div>
        }
        rules={[
          {
            required: true,
            message: t('plugin.pleaseEnterParameterName'),
          },
          {
            pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
            message: t('common.onlyLettersNumbersUnderscore'),
          },
        ]}
      >
        <Input
          placeholder={t('common.inputPlaceholder')}
          className="global-input params-input"
        />
      </Form.Item>
      <Form.Item
        name="serviceToken"
        label={
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              <span className="text-[#F74E43]">*</span>{' '}
              {t('plugin.serviceToken')}
            </span>
            <p className="text-desc">{t('plugin.serviceTokenDesc')}</p>
          </div>
        }
        rules={[
          {
            required: true,
            message: t('plugin.pleaseEnterServiceToken'),
          },
        ]}
      >
        <Input
          placeholder={t('common.inputPlaceholder')}
          className="global-input params-input"
        />
      </Form.Item>
    </>
  );
};

// 插件基本信息字段组件
const PluginBasicFields: React.FC<{
  botIcon: AvatarType;
  botColor: string;
  setShowModal: (show: boolean) => void;
  name: string;
  setName: (name: string) => void;
  desc: string;
  setDesc: (desc: string) => void;
}> = ({ botIcon, botColor, setShowModal, name, setName, desc, setDesc }) => {
  const { t } = useTranslation();
  return (
    <>
      <Form.Item
        name="name"
        label={
          <span className="text-sm font-medium">
            <span className="text-[#F74E43]">*</span> {t('plugin.pluginName')}
          </span>
        }
        rules={[
          {
            required: true,
            message: t('plugin.pleaseEnterPluginName'),
          },
          {
            whitespace: true,
            message: t('plugin.pleaseEnterPluginName'),
          },
        ]}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-10 h-10 rounded-lg flex justify-center items-center flex-shrink-0 cursor-pointer"
            style={{
              background: botColor
                ? botColor
                : `url(${botIcon.value || ''}) no-repeat center / cover`,
            }}
            onClick={() => setShowModal(true)}
          >
            {botColor && (
              <img src={botIcon.value || ''} className="w-6 h-6" alt="" />
            )}
          </span>
          <Input
            maxLength={20}
            showCount
            placeholder={t('common.inputPlaceholder')}
            className="global-input"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
      </Form.Item>
      <Form.Item
        name="description"
        label={
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              <span className="text-[#F74E43]">*</span>
              {t('plugin.pluginDescription')}
            </span>
            <p className="text-desc">{t('plugin.describePlugin')}</p>
          </div>
        }
        rules={[
          {
            required: true,
            message: t('plugin.pleaseEnterPluginDescription'),
          },
          {
            whitespace: true,
            message: t('plugin.pleaseEnterPluginDescription'),
          },
        ]}
      >
        <div className="relative">
          <Input.TextArea
            placeholder={t('common.inputPlaceholder')}
            className="global-textarea params-input"
            style={{
              height: 78,
            }}
            maxLength={200}
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
          <div className="absolute bottom-3 right-3 ant-input-limit ">
            {desc?.length || 0} / 200
          </div>
        </div>
      </Form.Item>
    </>
  );
};

// 认证方式组件
const AuthTypeSelector: React.FC<{
  authType: number;
  setAuthType: (type: number) => void;
  baseForm: FormInstance;
}> = ({ authType, setAuthType, baseForm }) => {
  const { t } = useTranslation();
  return (
    <Form.Item
      name="authType"
      label={
        <span className="text-sm font-medium">
          <span className="text-[#F74E43]">*</span>{' '}
          {t('plugin.authorizationMethod')}
        </span>
      }
      rules={[
        {
          required: true,
          message: t('plugin.pleaseEnterAuthorizationMethod'),
        },
      ]}
    >
      <Radio.Group
        onChange={e => {
          setAuthType(e.target.value);
          if (e.target.value === 2) {
            baseForm.setFieldsValue({
              location: 'header',
            });
          }
        }}
      >
        <Radio.Button value={1}>
          <div
            className="w-full flex justify-between items-start gap-2.5 relative"
            style={{
              padding: '24px 4px',
            }}
          >
            <div className="flex-1 flex flex-col mt-[-6px]">
              <div
                className="text-[#333333] font-medium"
                style={{
                  color: authType === 1 ? '#6356EA' : '',
                }}
              >
                {t('plugin.noAuthorization')}
              </div>
              <p className="text-desc">
                {t('plugin.useAPIWithoutAuthorization')}
              </p>
            </div>
            <div className="absolute right-[-15px] bottom-0">
              <img
                src={noAuthorizationRequired}
                className="w-[112px] h-[89px]"
                alt=""
              />
            </div>
          </div>
        </Radio.Button>
        <Radio.Button value={2}>
          <div
            className="w-full flex justify-between items-start gap-2.5 relative"
            style={{
              padding: '24px 4px',
            }}
          >
            <div className="flex-1 flex flex-col mt-[-6px]">
              <div
                className="text-[#333333] font-medium"
                style={{
                  color: authType === 2 ? '#6356EA' : '',
                }}
              >
                {t('plugin.service')}
              </div>
              <p className="text-desc">{t('plugin.authorizationRequired')}</p>
            </div>
            <div className="absolute right-[-15px] bottom-0">
              <img src={serviceIcon} className="w-[80px] h-[85px]" alt="" />
            </div>
          </div>
        </Radio.Button>
      </Radio.Group>
    </Form.Item>
  );
};

type OneOf<T> = {
  [K in keyof T]: { [P in K]: T[P] };
}[keyof T];
// 基本信息表单组件
const BasicInfoForm: React.FC<{
  baseForm: FormInstance<BaseFormData>;
  authType: number;
  setAuthType: (type: number) => void;
  botIcon: AvatarType;
  botColor: string;
  setShowModal: (show: boolean) => void;
  name: string;
  setName: (name: string) => void;
  desc: string;
  setDesc: (desc: string) => void;
  onValuesChange: (value: OneOf<BaseFormData>, values: BaseFormData) => void;
}> = ({
  baseForm,
  authType,
  setAuthType,
  botIcon,
  botColor,
  setShowModal,
  name,
  setName,
  desc,
  setDesc,
  onValuesChange,
}) => {
  const { t } = useTranslation();
  return (
    <Form
      form={baseForm}
      layout="vertical"
      className="tool-create-form"
      onValuesChange={onValuesChange}
    >
      <PluginBasicFields
        botIcon={botIcon}
        botColor={botColor}
        setShowModal={setShowModal}
        name={name}
        setName={setName}
        desc={desc}
        setDesc={setDesc}
      />
      <AuthTypeSelector
        authType={authType}
        setAuthType={setAuthType}
        baseForm={baseForm}
      />
      <Form.Item
        name="endPoint"
        label={
          <span className="text-sm font-medium">
            <span className="text-[#F74E43]">*</span> {t('plugin.pluginPath')}
          </span>
        }
        rules={[
          {
            required: true,
            message: t('plugin.pleaseEnterPluginPath'),
          },
          {
            whitespace: true,
            message: t('plugin.pleaseEnterPluginPath'),
          },
          {
            pattern:
              /^(https?:\/\/)?((([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/[-a-zA-Z0-9@:%_+.~#?&//={}]*)?(\?[;&a-zA-Z0-9%_+.~#?&//=]*)?(#[-a-zA-Z0-9@:%_+.~#?&//=]*)?)$/i,
            message: t('plugin.pleaseEnterValidUrl'),
          },
        ]}
      >
        <Input
          placeholder={t('common.inputPlaceholder')}
          className="global-input params-input"
        />
      </Form.Item>
      {authType === 2 && <AuthorizationFields />}
      <Form.Item
        name="method"
        className="mb-0"
        label={
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium">
              <span className="text-[#F74E43]">*</span>{' '}
              {t('plugin.requestMethod')}
            </span>
            <Tooltip
              title={
                <div className="whitespace-pre-wrap">
                  {`${t('plugin.getDesc')}\n${t(
                    'plugin.postDesc'
                  )}\n${t('plugin.putDesc')}\n${t(
                    'plugin.deleteDesc'
                  )}\n${t('plugin.patchDesc')}`}
                </div>
              }
              overlayClassName="black-tooltip config-secret"
            >
              <img src={questionCircle} className="w-3 h-3" alt="" />
            </Tooltip>
          </div>
        }
        rules={[
          {
            required: true,
            message: t('plugin.pleaseSelectRequestMethod'),
          },
        ]}
      >
        <Select
          placeholder={t('common.pleaseSelect')}
          className="global-select params-select"
          options={[
            {
              label: t('plugin.getMethod'),
              value: 'get',
            },
            {
              label: t('plugin.postMethod'),
              value: 'post',
            },
            {
              label: t('plugin.putMethod'),
              value: 'put',
            },
            {
              label: t('plugin.deleteMethod'),
              value: 'delete',
            },
            {
              label: t('plugin.patchMethod'),
              value: 'patch',
            },
          ]}
        />
      </Form.Item>
    </Form>
  );
};

// 参数表单组件
const ParametersForm: React.FC<{
  paramsForm: FormInstance<ParamsFormData>;
  inputParamsData: InputParamsData[];
  setInputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>;
  outputParamsData: InputParamsData[];
  setOutputParamsData: React.Dispatch<React.SetStateAction<InputParamsData[]>>;
  checkParmas: (params: InputParamsData[], id: string, key: string) => boolean;
  selectedCard?: ToolItem | undefined;
}> = ({
  paramsForm,
  inputParamsData,
  setInputParamsData,
  outputParamsData,
  setOutputParamsData,
  checkParmas,
  selectedCard,
}) => {
  return (
    <Form form={paramsForm} layout="vertical" className="tool-create-form">
      <ToolInputParameters
        inputParamsData={inputParamsData}
        setInputParamsData={setInputParamsData}
        checkParmas={checkParmas}
        selectedCard={selectedCard as ToolItem}
      />
      <ToolOutputParameters
        outputParamsData={outputParamsData}
        setOutputParamsData={setOutputParamsData}
        checkParmas={checkParmas}
        selectedCard={selectedCard as ToolItem}
      />
    </Form>
  );
};

// 调试表单组件
const DebuggerForm: React.FC<{
  debuggerParamsData: InputParamsData[];
  setDebuggerParamsData: React.Dispatch<
    React.SetStateAction<InputParamsData[]>
  >;
  debugLoading: boolean;
  handleDebuggerTool: () => void;
  debuggerJsonData: string;
}> = ({
  debuggerParamsData,
  setDebuggerParamsData,
  debugLoading,
  handleDebuggerTool,
  debuggerJsonData,
}) => {
  const { t } = useTranslation();
  return (
    <div>
      <DebuggerTable
        debuggerParamsData={debuggerParamsData}
        setDebuggerParamsData={setDebuggerParamsData}
      />
      <div className="w-full flex items-center justify-between mt-6">
        <span className="text-base font-medium">{t('plugin.debugResult')}</span>
        <Button
          loading={debugLoading}
          type="primary"
          style={{
            height: '36px',
          }}
          className="flex items-center w-[80px] gap-1.5 text-[#6356EA] cursor-pointer"
          onClick={handleDebuggerTool}
        >
          <span>{t('plugin.debug')}</span>
        </Button>
      </div>
      <div className="mt-6">
        <JsonMonacoEditor
          className="tool-debugger-json"
          value={debuggerJsonData}
          options={{
            readOnly: true,
          }}
        />
      </div>
    </div>
  );
};

// 操作按钮组件
const ActionButtons: React.FC<{
  selectedCard?: ToolItem | undefined;
  step: number;
  currentToolId?: number | string | undefined;
  canPublish: boolean;
  onHold: () => Promise<void>;
  handlePreStep: () => void;
  handleNextStep: () => void;
  handlePublishTool: () => void;
  updatePlugin: (tool: ToolItem) => void;
}> = ({
  selectedCard,
  step,
  currentToolId,
  canPublish,
  onHold,
  handlePreStep,
  handleNextStep,
  handlePublishTool,
  updatePlugin,
}) => {
  const { t } = useTranslation();
  const [importModalOpen, setImportModalOpen] = useState(false);
  return (
    <div
      className="mx-auto"
      style={{
        width: '85%',
        minWidth: 1000,
        maxWidth: 1425,
      }}
    >
      <ImportModal
        visible={importModalOpen}
        handleCancel={() => setImportModalOpen(false)}
        onImport={updatePlugin}
      />
      <div
        className="flex justify-end gap-3 mx-auto"
        style={{
          minWidth: 1000,
        }}
      >
        {step === 1 && (
          <Button
            type="text"
            className="px-6 origin-btn"
            onClick={() => {
              setImportModalOpen(true);
            }}
          >
            {t('plugin.import')}
          </Button>
        )}
        {!selectedCard?.id && (
          <Button
            type="text"
            className="origin-btn px-6"
            onClick={debounce(onHold, 500)}
          >
            {t('plugin.hold')}
          </Button>
        )}
        {step > 1 && (
          <Button
            type="text"
            className="origin-btn px-6"
            onClick={() => handlePreStep()}
          >
            {t('plugin.previousStep')}
          </Button>
        )}
        {step < 3 ? (
          <Button
            type="primary"
            className="px-6"
            onClick={() => handleNextStep()}
          >
            {t('plugin.nextStep')}
          </Button>
        ) : (
          <Button
            disabled={!canPublish}
            type="primary"
            className="px-6"
            onClick={() => handlePublishTool()}
          >
            {currentToolId ? t('plugin.save') : t('plugin.publish')}
          </Button>
        )}
      </div>
    </div>
  );
};

export const CreateTool = forwardRef<
  {
    updateToolInfo: (
      selectedCard: ToolItem,
      shouldUpdateToolInfo: boolean
    ) => void;
  },
  {
    currentToolInfo: ToolItem;
    handleCreateToolDone: () => void;
    showHeader: boolean;
    step: number;
    setStep: React.Dispatch<React.SetStateAction<number>>;
    botIcon: AvatarType;
    setBotIcon: React.Dispatch<React.SetStateAction<AvatarType>>;
    botColor: string;
    setBotColor: React.Dispatch<React.SetStateAction<string>>;
    selectedCard?: ToolItem;
  }
>(
  (
    {
      currentToolInfo,
      handleCreateToolDone,
      showHeader = true,
      step,
      setStep,
      botIcon,
      setBotIcon,
      botColor,
      setBotColor,
      selectedCard,
    },
    ref
  ) => {
    const { t } = useTranslation();

    const {
      showModal,

      handlePreStep,

      handleNextStep,
      onHold,
      handlePublishTool,

      checkParmas,

      handleDebuggerTool,
      authType,
      name,
      debuggerJsonData,
      canPublish,
      desc,
      setShowModal,
      debugLoading,
      currentToolId,
      inputParamsData,
      setAuthType,
      setName,
      setDesc,
      baseForm,
      paramsForm,
      setInputParamsData,
      setOutputParamsData,
      setDebuggerParamsData,
      debuggerParamsData,
      outputParamsData,
      avatarColor,
      avatarIcon,
      setBaseFormData,
      updatePlugin,
    } = useCreateTool({
      currentToolInfo,
      handleCreateToolDone,
      step,
      setStep,
      botIcon,
      setBotIcon,
      botColor,
      setBotColor,
      ref: ref as React.RefObject<{
        updateToolInfo: (
          selectedCard: ToolItem,
          shouldUpdateToolInfo: boolean
        ) => void;
      }>,
    });

    return (
      <div className="text-[#333333] text-sm h-full flex flex-col overflow-hidden gap-[30px] pt-9 pb-4">
        {showModal && (
          <MoreIcons
            icons={avatarIcon}
            colors={avatarColor}
            botIcon={botIcon}
            setBotIcon={setBotIcon}
            botColor={botColor}
            setBotColor={setBotColor}
            setShowModal={setShowModal}
          />
        )}
        <div className="flex-1 overflow-hidden">
          <div
            className="h-full mx-auto flex flex-col"
            style={{
              width: '85%',
              minWidth: 1000,
              maxWidth: 1425,
            }}
          >
            {showHeader && currentToolId && (
              <div className="flex items-center gap-2 mb-4">
                <img
                  src={toolArrowLeft}
                  className="w-[14px] h-[12px] cursor-pointer"
                  alt=""
                  onClick={() => handleCreateToolDone()}
                />
                <div className="flex items-center gap-1 text-[#666A73]">
                  <span>{t('plugin.editPlugin')}</span>
                  <span>/</span>
                  <span className="text-[#333]">{name}</span>
                </div>
              </div>
            )}
            {showHeader && <StepIndicator step={step} setStep={setStep} />}
            {/* <div className='w-full h-[2px] bg-[#E5E5EC] my-[18px]'>
      </div> */}
            <div className="w-full h-full  bg-[#fff] rounded-2xl p-6 overflow-auto">
              <div
                className="w-full"
                style={{
                  pointerEvents:
                    selectedCard?.id && step !== 3 ? 'none' : 'auto',
                }}
              >
                {step === 1 && (
                  <BasicInfoForm
                    onValuesChange={(_, values) => {
                      console.log('values', values);
                      setBaseFormData({ ...values });
                    }}
                    baseForm={baseForm}
                    authType={authType}
                    setAuthType={setAuthType}
                    botIcon={botIcon}
                    botColor={botColor}
                    setShowModal={setShowModal}
                    name={name}
                    setName={setName}
                    desc={desc}
                    setDesc={setDesc}
                  />
                )}
                {step === 2 && (
                  <ParametersForm
                    paramsForm={paramsForm}
                    inputParamsData={inputParamsData}
                    setInputParamsData={setInputParamsData}
                    outputParamsData={outputParamsData}
                    setOutputParamsData={setOutputParamsData}
                    checkParmas={checkParmas}
                    selectedCard={selectedCard}
                  />
                )}
                {step === 3 && (
                  <DebuggerForm
                    debuggerParamsData={debuggerParamsData}
                    setDebuggerParamsData={setDebuggerParamsData}
                    debugLoading={debugLoading}
                    handleDebuggerTool={handleDebuggerTool}
                    debuggerJsonData={debuggerJsonData}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <ActionButtons
          selectedCard={selectedCard}
          step={step}
          currentToolId={currentToolId}
          canPublish={canPublish}
          onHold={onHold}
          handlePreStep={handlePreStep}
          handleNextStep={handleNextStep}
          handlePublishTool={handlePublishTool}
          updatePlugin={updatePlugin}
        />
      </div>
    );
  }
);

export const ToolDebugger: FC<{
  currentToolInfo: ToolItem;
  handleClearData: () => void;
  showHeader?: boolean;
  offical?: boolean;
  selectedCard: ToolItem;
}> = ({
  currentToolInfo,
  handleClearData,
  showHeader = true,
  offical = false,
  selectedCard = {} as ToolItem,
}) => {
  const { t } = useTranslation();
  const {
    handleDebuggerTool,
    debuggerJsonData,
    debugLoading,
    debuggerParamsData,
    setDebuggerParamsData,
  } = useToolDebugger({
    currentToolInfo,
    offical,
    selectedCard,
  });

  return (
    <div
      className="h-full flex flex-col gap-[40px] mx-auto overflow-auto p-6 bg-[#FFFFFF] rounded-2xl mt-9"
      style={{
        width: '85%',
        minWidth: 1000,
        maxWidth: 1425,
      }}
    >
      {showHeader && (
        <div className="flex items-center gap-2 mx-auto w-full">
          <img
            src={toolArrowLeft}
            className="w-[14px] h-[12px] cursor-pointer"
            alt=""
            onClick={() => handleClearData()}
          />
          <div className="flex items-center gap-1 text-[#666A73]">
            <span>{t('plugin.debugPlugin')}</span>
            <span>/</span>
            <span className="text-[#333]">{currentToolInfo?.name}</span>
          </div>
        </div>
      )}
      <div className="flex-1">
        <div className="w-full h-full">
          <DebuggerTable
            debuggerParamsData={debuggerParamsData}
            setDebuggerParamsData={setDebuggerParamsData}
          />
          <div className="w-full flex items-center justify-between mt-6">
            <span className="text-base font-medium">
              {t('plugin.debugResult')}
            </span>
            <Button
              loading={debugLoading}
              type="primary"
              className="flex items-center w-[80px] gap-1.5 text-[#6356EA] cursor-pointer"
              onClick={handleDebuggerTool}
              style={{
                height: '36px',
              }}
            >
              <span>{t('plugin.debug')}</span>
            </Button>
          </div>
          <div className="mt-6">
            <JsonMonacoEditor
              className="tool-debugger-json"
              value={debuggerJsonData}
              options={{
                readOnly: true,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ToolDetail: FC<{
  currentToolInfo: ToolItem;
  handleClearData: () => void;
  handleToolDebugger: () => void;
}> = ({ currentToolInfo, handleClearData, handleToolDebugger }) => {
  const { t } = useTranslation();
  const [inputParamsData, setInputParamsData] = useState<InputParamsData[]>([]);
  const [outputParamsData, setOutputParamsData] = useState<InputParamsData[]>(
    []
  );

  useEffect(() => {
    if (currentToolInfo?.id) {
      const paramsData = isJSON(currentToolInfo?.webSchema)
        ? JSON.parse(currentToolInfo?.webSchema)
        : {};
      setOutputParamsData(paramsData?.toolRequestOutput || []);
      setInputParamsData(paramsData?.toolRequestInput || []);
    }
  }, [currentToolInfo?.id, currentToolInfo?.webSchema]);

  return (
    <div
      className="w-full h-full flex flex-col gap-[20px] overflow-hidden"
      style={{
        padding: '65px 0px 43px',
      }}
    >
      <div
        className="flex items-center gap-2 mx-auto"
        style={{
          width: '90%',
        }}
      >
        <img
          src={toolArrowLeft}
          className="w-[14px] h-[12px] cursor-pointer"
          alt=""
          onClick={() => handleClearData()}
        />
        <div className="flex items-center gap-1 text-[#666A73]">
          <span className="text-sm font-normal">
            {t('plugin.pluginDetail')}
          </span>
          <span>/</span>
          <span className="text-[#333]">{currentToolInfo?.name}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div
          className="h-full mx-auto"
          style={{
            width: '90%',
            minWidth: '1000px',
          }}
        >
          <div className="flex items-center gap-[28px]">
            <span
              className="w-10 h-10 flex items-center justify-center rounded-lg"
              style={{
                background: currentToolInfo?.avatarColor
                  ? currentToolInfo?.avatarColor
                  : `url(${currentToolInfo?.icon}) no-repeat center / cover`,
              }}
            >
              {currentToolInfo?.avatarColor && (
                <img
                  src={currentToolInfo?.icon || ''}
                  className="w-[22px] h-[22px]"
                  alt=""
                />
              )}
            </span>
            <div className="flex-1 flex flex-col gap-0.5">
              <span className="text-base font-medium">
                {currentToolInfo?.name}
              </span>
              <span className="text-desc">{currentToolInfo?.description}</span>
            </div>
            <div className="flex items-center gap-[20px] text-desc">
              {currentToolInfo?.creator && (
                <div className="flex items-center gap-1">
                  <img
                    src={toolCreateUser}
                    className="w-[9px] h-[11px]"
                    alt=""
                  />
                  <span>{currentToolInfo?.creator}</span>
                </div>
              )}
              {currentToolInfo?.creator && (
                <div className="w-[1px] h-[11px] bg-[#E5E5EC]"></div>
              )}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <img src={publishIcon} alt="" className="w-3 h-3" />
                  <p className="text-[#757575] text-xs">
                    {t('plugin.publishedAt')} {currentToolInfo?.updateTime}
                  </p>
                </div>
                <div
                  className="inline-flex w-fit items-center gap-1 text-[#333] bg-[#fff] border border-[#E5E5E5] py-1 px-6 rounded-lg hover:text-[#FFF] hover:bg-[#6356EA] cursor-pointer"
                  onClick={() => {
                    handleToolDebugger();
                  }}
                >
                  {t('workflow.nodes.toolNode.test')}
                </div>
              </div>
            </div>
          </div>
          <div className="text-base font-medium">
            {t('plugin.pluginParams')}
          </div>
          <div className="text-xs font-medium mt-5">
            {t('plugin.inputParams')}
          </div>
          <ToolInputParametersDetail inputParamsData={inputParamsData} />
          <div className="text-xs font-medium mt-5">
            {t('plugin.outputParams')}
          </div>
          <ToolOutputParametersDetail outputParamsData={outputParamsData} />
        </div>
      </div>
    </div>
  );
};
