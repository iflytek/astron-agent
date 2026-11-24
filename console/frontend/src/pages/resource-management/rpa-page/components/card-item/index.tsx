import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Modal } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { RpaInfo, RpaDetailFormInfo } from '@/types/rpa';
import { User } from '@/store/user-store';
import { jumpToLogin } from '@/utils/http';
import { deleteRpa, getRpaDetail } from '@/services/rpa';
import styles from '../../../knowledge-page/components/card-item/index.module.scss';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const edit = async (): Promise<void> => {
    if (!user?.login && !user?.uid) return jumpToLogin();
    setBusy(true);
    setError('');
    try {
      const result = await getRpaDetail(rpa.id);
      showModal({
        id: result.id,
        platformId: result.platformId,
        assistantName: result.assistantName,
        icon: result.icon,
        ...(result.fields || {}),
      } as RpaDetailFormInfo);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : '配置加载失败，请重新点击编辑。'
      );
    } finally {
      setBusy(false);
    }
  };
  const open = (): void => {
    if (rpa.status === 0) {
      if (!user?.login && !user?.uid) return jumpToLogin();
      showModal();
    } else navigate(`/resource/rpa/detail/${rpa.id}`);
  };
  return (
    <article className={styles.cardItem}>
      <div className={styles.header}>
        {rpa.icon ? (
          <img src={rpa.icon} className={styles.folderIcon} alt="" />
        ) : (
          <RobotOutlined className={styles.folderIcon} />
        )}
        <button className={`${styles.title} text-left`} onClick={open}>
          {rpa.assistantName || rpa.name}
        </button>
      </div>
      <p className={styles.description} title={rpa.remarks || ''}>
        {rpa.remarks || '暂无说明'}
      </p>
      <div className={styles.stats}>
        <span>{rpa.userName || 'RPA'}</span>
        <span>
          {t('rpa.robotResource')}: {rpa.robotCount || 0}
        </span>
      </div>
      {error && <Alert type="error" message={error} />}
      <footer className={styles.footer}>
        <Button
          type="text"
          danger
          disabled={busy}
          onClick={() =>
            Modal.confirm({
              title: t('rpa.deleteRpa'),
              content: t('rpa.deleteRpaConfirm'),
              okText: t('common.delete'),
              cancelText: t('common.cancel'),
              okButtonProps: { danger: true },
              onOk: () =>
                deleteRpa(rpa.id).then(() => {
                  refresh();
                }),
            })
          }
        >
          {t('rpa.delete')}
        </Button>
        <Button type="text" loading={busy} onClick={() => void edit()}>
          {t('rpa.edit')}
        </Button>
        <Button type="link" onClick={open}>
          查看详情
        </Button>
      </footer>
    </article>
  );
};
export default CardItem;
