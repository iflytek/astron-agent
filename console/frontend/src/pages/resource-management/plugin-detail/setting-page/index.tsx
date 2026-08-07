import React, { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button, Form } from 'antd';
import { temporaryTool } from '@/services/plugin';
import MoreIcons from '@/components/modal/more-icons';
import globalStore from '@/store/global-store';
import { AvatarType, ToolItem } from '@/types/resource';

const SettingPage: FC<{
  toolId: string;
  toolInfo: ToolItem;
  initData: () => void;
}> = ({ toolId, toolInfo, initData }) => {
  const { t } = useTranslation();
  const avatarIcon = globalStore(state => state.avatarIcon);
  const avatarColor = globalStore(state => state.avatarColor);
  const getAvatarConfig = globalStore(state => state.getAvatarConfig);
  const [baseForm] = Form.useForm();
  const getTools = globalStore(state => state.getTools);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [_, setPermission] = useState(0);
  const [botIcon, setBotIcon] = useState<AvatarType>({});
  const [botColor, setBotColor] = useState<string>('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getAvatarConfig();
  }, []);

  useEffect(() => {
    setBotColor(toolInfo.avatarColor);
    setBotIcon({
      name: toolInfo.address,
      value: toolInfo.icon || '',
    });
  }, [toolInfo]);

  useEffect(() => {
    setName(toolInfo.name);
    setDesc(toolInfo?.description);
    setPermission(toolInfo.visibility);
    baseForm.setFieldsValue({
      name: toolInfo?.name,
      description: toolInfo?.description,
      visibility: toolInfo?.visibility,
    });
  }, [toolInfo]);

  function handleSave(): void {
    baseForm.validateFields().then(values => {
      setLoading(true);
      const params = {
        id: toolId,
        name,
        description: values?.description,
        avatarColor: botColor,
        avatarIcon: botIcon.value,
      };
      temporaryTool(params as unknown as ToolItem)
        .then(() => {
          initData();
          getTools();
        })
        .finally(() => setLoading(false));
    });
  }

  return (
    <div
      className="h-full flex flex-col overflow-auto mx-auto p-6 bg-[#fff] rounded-2xl mt-9 pb-12"
      style={{
        width: '85%',
        minWidth: 1000,
        maxWidth: 1425,
      }}
    >
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
      <div className="flex-1 w-full">
        <Form form={baseForm} layout="vertical" className="tool-create-form">
          <Form.Item
            name="name"
            label={
              <span className="text-base font-medium">
                <span className="text-[#F74E43]">* </span>
                {t('plugin.pluginName')}
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
                placeholder={t('common.inputPlaceholder')}
                className="global-input params-input"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={20}
                showCount
              />
            </div>
          </Form.Item>
          <Form.Item
            name="description"
            label={
              <div className="flex flex-col gap-1">
                <span className="text-base font-medium">
                  <span className="text-[#F74E43]">* </span>
                  {t('plugin.pluginDescription')}
                </span>
                <p className="text-desc">{t('plugin.pluginDescriptionHint')}</p>
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
                value={desc}
                onChange={e => setDesc(e?.target?.value)}
                placeholder={t('common.inputPlaceholder')}
                className="global-textarea params-input"
                style={{
                  height: 108,
                }}
                maxLength={200}
              />
              <div className="absolute bottom-3 right-3 ant-input-limit ">
                {desc?.length} / 200
              </div>
            </div>
          </Form.Item>
        </Form>
      </div>
      <div className="flex justify-end">
        <Button
          type="primary"
          disabled={!name?.trim()}
          loading={loading}
          className="primary-btn ml-3 w-[125px] h-10"
          onClick={() => handleSave()}
        >
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
};

export default SettingPage;
