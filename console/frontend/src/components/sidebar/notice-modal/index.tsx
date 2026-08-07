import React, { useState, useEffect } from 'react';
import {
  getAllMessage,
  changeMessageStatus,
  type NotificationResponse,
  type Notification,
  deleteMessage,
} from '@/services/notification';
import { CaretDownOutlined } from '@ant-design/icons';
import { Dropdown, Menu, Modal, Button, message, Popconfirm } from 'antd';
import { CloseIcon } from '@/components/svg-icons';
import styles from './index.module.scss';
import { useSparkCommonStore } from '@/store/spark-store/spark-common';
import BotCard from './bot-card';
import { useTranslation } from 'react-i18next';
import messageSpace from '@/assets/imgs/share-page/message_space.svg';
import { getTextContent, createSafeHTML } from '@/utils/sanitizer';
interface NoticeModalProps {
  open: boolean;
  onClose: () => void;
  onMessageRead?: () => void;
}

const initCoverImg = (messageItem: Notification): string => {
  const systemCover = [
    '',
    'https://openres.xfyun.cn/xfyundoc/2023-12-20/d2285839-d0c5-481c-860a-f65e1dce63ee/1703071130174/picon-bell.png',
    'https://openres.xfyun.cn/xfyundoc/2023-12-20/9a15bf49-175c-42f0-ab53-7bce59249750/1703073213967/picon-notice.png',
  ];
  const typeIndex = messageItem.type === 'SYSTEM' ? 1 : 2;
  return systemCover[typeIndex] || '';
};

const renderSpecialMsg = (selectMessageObj: any) => {
  if (selectMessageObj?.type === 'SYSTEM') {
    return null;
  }
  return null;
};

const renderEmptyState = (t: any) => (
  <li className={styles.empty_list}>
    <div className={styles.empty_list_icon} />
    <span>{t('systemMessage.noMoreMessage')}</span>
  </li>
);

const renderNotificationItem = (
  item: Notification,
  selectedId: number,
  readMessage: (item: Notification) => void,
  delMessage: (item: Notification, e: any) => void,
  t: any
) => (
  <li
    className={`${selectedId === item.id ? styles.selected : ''}`}
    key={item.id}
    onClick={() => {
      readMessage(item);
    }}
  >
    <div
      className={`${styles.ni_avatar} ${!item.isRead && styles.n_unread}`}
      style={{
        backgroundImage: 'url(' + initCoverImg(item) + ')',
      }}
    />
    <div className={styles.ni_content}>
      <div className={styles.ni_info}>
        <h3 className={styles.ni_title}>{item.title}</h3>
        <span>{item.createdAt.split('T')[0]}</span>
      </div>
      <p>{getTextContent(item.body)}</p>
    </div>
    <span
      className={styles.del}
      onClick={e => {
        e.stopPropagation();
      }}
    >
      <Popconfirm
        title={t('systemMessage.isConfirmDelete')}
        onConfirm={e => {
          delMessage(item, e);
        }}
        okText={t('systemMessage.delete')}
        cancelText={t('systemMessage.cancel')}
      >
        <CloseIcon />
      </Popconfirm>
    </span>
  </li>
);

const renderDropdown = (
  messageType: any[],
  selectType: string,
  changeType: (item: any) => void
) => {
  return (
    <Dropdown
      overlay={
        <Menu
          className={styles.notice_type_menu}
          selectedKeys={[selectType]}
          onClick={changeType}
        >
          {messageType?.map((item: any) => (
            <Menu.Item key={item.id}>{item.typeInfoText}</Menu.Item>
          ))}
        </Menu>
      }
      trigger={['click']}
      placement="bottom"
      getPopupContainer={(trigger: HTMLElement) =>
        trigger.parentNode as HTMLElement
      }
    >
      <div className={styles.notice_types_trigger}>
        <span>
          {messageType?.length &&
            messageType.filter(item => item.id === parseInt(selectType))[0]
              .typeInfoText}
        </span>
        <CaretDownOutlined />
      </div>
    </Dropdown>
  );
};

const messageTypeList = [
  {
    id: 0,
    typeInfo: 'PERSONAL',
    typeInfoText: '私信',
  },
  {
    id: 1,
    typeInfo: 'BROADCAST',
    typeInfoText: '公告',
  },
  {
    id: 2,
    typeInfo: 'SYSTEM',
    typeInfoText: '系统通知',
  },
  {
    id: 3,
    typeInfo: 'PROMOTION',
    typeInfoText: '活动',
  },
];

const NoticeModal: React.FC<NoticeModalProps> = ({
  open,
  onClose,
  onMessageRead,
}) => {
  const [selectType, setSelectType] = useState<string>('0');
  const myMessage = useSparkCommonStore(state => state.myMessage);
  const setMyMessage = useSparkCommonStore(state => state.setMyMessage);
  const [messageType, setMessageType] = useState<any[]>(messageTypeList);
  const [messageDetail, setMessageDetail] = useState<string>('');
  const [selectedId, setSelectedId] = useState<number>(0);
  const [notificationData, setNotificationData] =
    useState<NotificationResponse | null>(null);
  const [selectMessageObj, setSelectMsgObj] = useState<any>({});
  const { t } = useTranslation();

  const changeType = (item: any) => {
    setSelectType(item.key);
    getMessages(item.key);
  };

  const getMessages = async (queryMessageType?: string) => {
    const queryParam = {
      type: queryMessageType || '0',
      unreadOnly: false,
      pageIndex: 1,
      pageSize: 100,
      offset: 0,
    };
    const messageResult = await getAllMessage(queryParam);
    setNotificationData(messageResult);
    // setMessageType(
    //   Object.keys(messageResult.notificationsByType).map(
    //     (item: string, index) => ({
    //       id: index,
    //       typeInfo: item,
    //     })
    //   )
    // );
  };
  const readMessage = async (messageItem: Notification) => {
    const readStatus = await changeMessageStatus({
      notificationIds: [messageItem.id],
      markAll: false,
    });
    setSelectMsgObj(messageItem);

    let payload: any = {};
    try {
      payload = JSON.parse(messageItem.payload || '{}');
    } catch (e) {
      console.warn('Failed to parse payload:', e);
    }

    setMessageDetail(messageItem.body || '');
    setSelectedId(messageItem.id);

    if (payload.outlink) {
      //
    }

    getMessages(selectType);
    // 调用父组件的回调，更新消息数量
    onMessageRead?.();
  };

  const delMessage = async (messageItem: Notification, e: any) => {
    deleteMessage(messageItem.id)
      .then(res => {
        message.success(t('systemMessage.deleteSuccess'));
        getMessages(selectType);
        // 调用父组件的回调，更新消息数量
        onMessageRead?.();
      })
      .catch(() => {
        message.error(t('systemMessage.deleteFail'));
      });
  };

  const readAll = () => {
    changeMessageStatus({
      notificationIds:
        notificationData?.notificationsByType[
          messageType[parseInt(selectType)].typeInfo
        ]?.map((item: Notification) => item.id) || [],
      markAll: false,
    })
      .then(res => {
        getMessages(selectType);
        // 调用父组件的回调，更新消息数量
        onMessageRead?.();
      })
      .catch(e => {
        message.error(t('systemMessage.historyAudioLoading'));
      });
  };

  useEffect(() => {
    getMessages();
  }, []);

  return (
    <div>
      <Modal
        title={false}
        centered
        open={open}
        className={styles.notice_modal}
        footer={false}
        width={785}
        onCancel={() => {
          onClose();
        }}
      >
        <div className={styles.notice_wrap}>
          <div className={styles.notice_list_wrap}>
            {messageType.length > 0 &&
              renderDropdown(messageType, selectType, changeType)}
            {messageType.length > 0 && (
              <Button
                className={styles.read_all}
                size="small"
                onClick={readAll}
              >
                {t('systemMessage.allRead')}
              </Button>
            )}
            <ul className={styles.notice_list}>
              {(!notificationData?.totalCount ||
                notificationData?.totalCount <= 0) &&
                renderEmptyState(t)}
              {!!notificationData?.totalCount &&
                notificationData?.totalCount > 0 &&
                notificationData?.notifications?.map((item: Notification) =>
                  renderNotificationItem(
                    item,
                    selectedId,
                    readMessage,
                    delMessage,
                    t
                  )
                )}
            </ul>
          </div>
          <div className={`${styles.notice_detail_wrap}`}>
            <div
              className={`${styles.notice_detail} ${
                !messageDetail || messageDetail === '' ? styles.nd_empty : ''
              }`}
              dangerouslySetInnerHTML={createSafeHTML(messageDetail)}
            />
            {renderSpecialMsg(selectMessageObj)}
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default NoticeModal;
