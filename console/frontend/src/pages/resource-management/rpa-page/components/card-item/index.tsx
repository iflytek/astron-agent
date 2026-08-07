import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Dropdown, message, Modal } from 'antd';
import { EllipsisIcon } from '@/components/svg-icons/model';

import { RpaInfo, RpaDetailFormInfo } from '@/types/rpa';
import { User } from '@/store/user-store';
import { jumpToLogin } from '@/utils/http';
import { deleteRpa, getRpaDetail } from '@/services/rpa';

import styles from './index.module.scss';

interface CardItemProps {
  rpa: RpaInfo;
  user: User;
  refresh: () => void;
  showModal: (values?: RpaDetailFormInfo) => void;
}

export const CardItem: FC<CardItemProps> = ({
  rpa,
  user,
  refresh,
  showModal,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const actions = new Map([
    [
      'edit',
      async (record: RpaInfo) => {
        const result = await getRpaDetail(record.id);
        const formData = {
          id: result.id,
          platformId: result.platformId,
          assistantName: result.assistantName,
          icon: result.icon,
          ...(result.fields || {}),
        } as RpaDetailFormInfo;
        showModal(formData);
      },
    ],
    [
      'delete',
      (record: RpaInfo) => {
        Modal.confirm({
          title: t('rpa.deleteRpa'),
          content: t('rpa.deleteRpaConfirm'),
          onOk: () =>
            deleteRpa(record.id).then(() => {
              refresh?.();
            }),
        });
      },
    ],
  ]);

  return (
    <div
      className={styles.cardItem}
      key={rpa.id}
      onClick={() => {
        if (rpa.status == 0) {
          if (!user?.login && !user?.uid) {
            return jumpToLogin();
          }
          showModal?.();
        } else {
          navigate(`/resource/rpa/detail/${rpa.id}`);
        }
      }}
    >
      <div className={styles.header}>
        <span className="w-12 h-12 flex items-center justify-center rounded-lg overflow-hidden">
          {rpa.icon && (
            <img src={rpa?.icon} className="w-[48px] h-[48px]" alt="" />
          )}
        </span>
        <div className="flex flex-col gap-[2px] flex-1 overflow-hidden">
          <div className={styles.title} title={rpa.assistantName}>
            {rpa.assistantName}
          </div>
          <div className={styles.subTitle} title={rpa.userName || ''}>
            {rpa.userName}
          </div>
        </div>
      </div>
      <div className={styles.content} title={rpa.remarks || ''}>
        {rpa.remarks || ''}
      </div>
      <div className={styles.footer}>
        <div className={styles.footer_left}>
          <span>科大讯飞</span>
          <span className={styles.divider}></span>
          <span>
            {t('rpa.robotResource')}: {rpa.robotCount || 0}个
          </span>
        </div>
        <Dropdown
          className={styles.footer_right}
          menu={{
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              actions.get(key)?.(rpa);
            },
            items: [
              {
                label: <span className="text-[#6356EA]">{t('rpa.edit')}</span>,
                key: 'edit',
              },
              {
                label: <span className="text-red-500">{t('rpa.delete')}</span>,
                key: 'delete',
              },
            ],
          }}
        >
          <span onClick={e => e.stopPropagation()}>
            <EllipsisIcon style={{ color: '#7F7F7F' }} />
          </span>
        </Dropdown>
      </div>
    </div>
  );
};

export default CardItem;
