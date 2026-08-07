import React, { useState, useEffect, FC } from 'react';
import { Drawer, Timeline, Card, Tabs } from 'antd';
import close from '@/assets/imgs/workflow/modal-close.png';
import { getToolVersionList } from '@/services/plugin';
import { useTranslation } from 'react-i18next';

import pointIcon from '@/assets/imgs/workflow/dot-icon.png';
import selectedPointIcon from '@/assets/imgs/workflow/select-dot-icon.png';

import './index.css';
import dayjs from 'dayjs';
import { ToolItem } from '@/types/resource';

const TAB_TYPE = {
  version: '1',
  feedback: '2',
};

interface VersionItem {
  id: string;
  version?: string;
  createTime?: string;
}

const VersionManagement: FC<{
  open: boolean;
  setOpen: (open: boolean) => void;
  currentDebuggerPluginInfo: ToolItem;
  selectedCard: ToolItem;
  handleCardClick: (data: ToolItem) => void;
}> = ({
  open,
  setOpen,
  currentDebuggerPluginInfo,
  selectedCard,
  handleCardClick,
}) => {
  const { t } = useTranslation();

  const [drawerStyle] = useState({
    height: window?.innerHeight - 80,
    top: 80,
    right: 0,
    zIndex: 998,
  });
  const [versionList, setVersionList] = useState<VersionItem[]>([]);
  const [activeKey, setActiveKey] = useState(TAB_TYPE['version']);

  useEffect(() => {
    currentDebuggerPluginInfo?.toolId &&
      getToolVersionList(currentDebuggerPluginInfo?.toolId).then(res => {
        setVersionList(res);
      });
  }, [currentDebuggerPluginInfo?.toolId]);

  return (
    <div>
      <Drawer
        rootClassName="advanced-configuration-container"
        rootStyle={drawerStyle}
        placement="right"
        open={open}
        mask={false}
        onClose={() => {
          setActiveKey(TAB_TYPE['version']);
        }}
      >
        <div className="flex flex-col w-full h-full p-5 overflow-hidden">
          {/* 1.title */}
          <div className="flex items-center justify-between mb-[12px]">
            <div className="text-lg font-semibold">
              {t('plugin.versionAndIssueTracking')}
            </div>
            <img
              src={close}
              className="w-3 h-3 cursor-pointer"
              alt=""
              onClick={() => setOpen(false)}
            />
          </div>
          <Tabs
            activeKey={activeKey}
            size="small"
            className="flex flex-col flex-1 h-0 overflow-hidden version-feedback-tabs"
            tabBarStyle={{ margin: '0 0 24px 0' }}
            tabBarGutter={40}
            onChange={key => setActiveKey(key)}
          >
            <Tabs.TabPane tab={t('plugin.versionRecord')} key="1">
              {/* 2.list */}
              <div className="flex flex-1 overflow-auto version-list">
                <Timeline mode="left">
                  <Timeline.Item
                    dot={
                      <img
                        src={
                          selectedCard?.id === '' ||
                          selectedCard?.id === undefined
                            ? selectedPointIcon
                            : pointIcon
                        }
                        className="w-[14px] h-[14px] mt-1"
                        alt=""
                      />
                    }
                  >
                    <Card
                      title={t('plugin.draftVersion')}
                      bordered={true}
                      style={{
                        borderColor:
                          selectedCard?.id === '' ||
                          selectedCard?.id === undefined
                            ? '#6356EA'
                            : '#e8e8e8',
                      }}
                      onClick={() =>
                        handleCardClick({
                          id: '',
                        } as ToolItem)
                      }
                      hoverable
                    ></Card>
                  </Timeline.Item>
                  {versionList.map((item, index) => (
                    <Timeline.Item
                      key={item.id}
                      dot={
                        <img
                          src={
                            selectedCard?.id === item.id
                              ? selectedPointIcon
                              : pointIcon
                          }
                          className="w-[14px] h-[14px]"
                          alt=""
                        />
                      }
                    >
                      <Card
                        title={`${t('plugin.version')}${
                          item.version || 'V1.0'
                        }`}
                        bordered={true}
                        style={{
                          borderColor:
                            selectedCard?.id === item.id
                              ? '#6356EA'
                              : '#e8e8e8',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleCardClick(item as ToolItem)}
                        hoverable
                      >
                        <div className="px-3 pb-[6px]">
                          {/* <p>版本ID：{item.versionNum}</p> */}
                          <p>
                            {t('plugin.publishTime')}
                            {dayjs(item.createTime)?.format(
                              'YYYY-MM-DD HH:mm:ss'
                            )}
                          </p>
                        </div>
                      </Card>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </div>
            </Tabs.TabPane>
          </Tabs>
        </div>
      </Drawer>
    </div>
  );
};

export default VersionManagement;
