import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Collapse from '@/assets/imgs/sparkImg/Collapse.png';
import errorIcon from '@/assets/imgs/sparkImg/errorIcon.svg';

import eventBus from '@/utils/event-bus';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from './ConfigHeader.module.scss';

interface ConfigHeaderProps {
  currentRobot?: {
    id?: string;
    name?: string;
    address?: string;
    avatarIcon?: string;
    color?: string;
  };
  currentTab?: string;
  coverUrl?: string;
  detailInfo?: {
    avatar?: string;
    botName?: string;
    botStatus?: number;
  };
  baseinfo?: {
    botName?: string;
  };
  botId?: string;
  children?: React.ReactNode;
}

const PUBLISHED_BOT_STATUSES = [1, 2, 4];

const isPublishedBotStatus = (botStatus?: number): boolean =>
  botStatus !== undefined && PUBLISHED_BOT_STATUSES.includes(botStatus);

function ConfigHeader(props: ConfigHeaderProps) {
  const [searchParams] = useSearchParams();
  const { currentRobot, currentTab } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const [showDropList, setShowDropList] = useState(false);
  const isPublished = isPublishedBotStatus(props.detailInfo?.botStatus);

  useEffect(() => {
    document.body.addEventListener('click', clickOutside);
    return () => document.body.removeEventListener('click', clickOutside);
  }, []);

  function clickOutside(event: MouseEvent) {
    if (
      optionsRef.current &&
      !optionsRef.current.contains(event.target as Node)
    ) {
      setShowDropList(false);
    }
  }

  return (
    <div
      className={`${styles.configHeader} w-full h-[80px] bg-[#fff] border-b border-[#e2e8ff] flex justify-between items-center px-6 py-5`}
      style={{
        borderRadius: '0px 0px 24px 24px',
        border: '0',
      }}
    >
      <div
        className={styles.CollapseIcon}
        onClick={() => {
          navigate(-1);
        }}
      >
        <img src={Collapse} alt="" />
      </div>

      <div className="flex flex-1 items-center gap-2 relative">
        <div className={styles.left}>
          <div className={styles.bot_info}>
            <img
              className={styles.bot_icon}
              src={props.coverUrl || props.detailInfo?.avatar || errorIcon}
            />
          </div>
          <div>
            <div>
              <span className={styles.botName}>
                {props.baseinfo?.botName ||
                  props.detailInfo?.botName ||
                  t('configBase.agentName')}
              </span>
            </div>
            <div>
              <span
                className={`${styles.botStatu_fabu} ${
                  isPublished ? '' : styles.botStatu_weifabu
                }`}
              >
                {isPublished
                  ? t('configBase.botStatus2')
                  : t('configBase.botStatus0')}
              </span>
            </div>
          </div>
        </div>
        <div
          className="flex items-center relative gap-2"
          onClick={e => {
            e.stopPropagation();
            setShowDropList(true);
          }}
        >
          {currentRobot?.id && (
            <img
              style={{
                borderRadius: currentRobot.color ? '' : '4px',
              }}
              src={`${currentRobot.address ?? ''}${currentRobot.avatarIcon ?? ''}`}
              className="w-[26px] h-[26px] flex-shrink-0"
              alt=""
            />
          )}
          <div
            className="text-second font-semibold text-overflow text-2xl"
            title={currentRobot?.name || ''}
          >
            {/* {currentRobot?.name || t('configBase.agentName')} */}
          </div>
          {showDropList && (
            <div
              className="w-full absolute  left-0 top-[38px] list-options py-3.5 pt-2 max-h-[255px] overflow-auto bg-[#fff] min-w-[150px] z-50"
              ref={optionsRef}
            ></div>
          )}
        </div>
      </div>
      <div className="flex flex-1 items-center gap-6 justify-center">
        <div
          className={`flex items-center px-5 py-2.5  rounded-[10px] font-medium cursor-pointer  h-[36px]  ${
            currentTab === 'base' ? 'config-tabs-active' : 'config-tabs-normal'
          }`}
          onClick={e => {
            e.stopPropagation();
            setShowDropList(false);
            if (searchParams.get('flag') === 'true') {
              return navigate(`/space/config/base?botId=${props.botId}`, {
                replace: true,
              });
            }
            if (props.botId) {
              navigate(
                isPublished
                  ? `/space/config/base?botId=${props.botId}&save=true`
                  : `/space/config/base?botId=${props.botId}`,
                {
                  replace: true,
                }
              );
            }
          }}
        >
          <span className="base-icon"></span>
          <span
            className="ml-2 "
            style={{ whiteSpace: 'nowrap', fontSize: '14px' }}
          >
            {t('configBase.createAgent')}
          </span>
        </div>
        <div
          className={`flex items-center px-5 py-2.5  rounded-[10px] font-medium cursor-pointer  h-[36px]  ${
            currentTab === 'overview'
              ? 'config-tabs-active'
              : 'config-tabs-normal'
          }`}
          onClick={() => {
            if (searchParams.get('create') === 'true') {
              return message.info(t('configBase.createAgentFirst'));
            }
            eventBus.emit('eventSavebot');
            return;
          }}
        >
          <span className="overview-icon"></span>
          <span
            className="ml-2"
            style={{ whiteSpace: 'nowrap', fontSize: '14px' }}
          >
            {t('configBase.analyze')}
          </span>
        </div>
      </div>
      <div className="flex-1 flex justify-end">{props.children}</div>
    </div>
  );
}

export default ConfigHeader;
