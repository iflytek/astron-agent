import { memo, type FC, useRef } from 'react';
import { jumpToLogin } from '@/utils/http';
import { useRpaPage } from './hooks/use-rpa-page';
import useUserStore from '@/store/user-store';
import { ModalForm } from './components/modal-form';
import { RpaDetailFormInfo } from '@/types/rpa';
import CardItem from './components/card-item';
import {
  ResourceCatalog,
  resourceStyles as styles,
} from '../knowledge-page/resource-surface';
const RpaPage: FC = () => {
  const modalFormRef = useRef<{
    showModal: (values?: RpaDetailFormInfo) => void;
  }>(null);
  const page = useRpaPage(modalFormRef);
  const user = useUserStore(state => state.user);
  const create = (): void => {
    if (!user?.login && !user?.uid) return jumpToLogin();
    modalFormRef.current?.showModal();
  };
  return (
    <>
      <ResourceCatalog
        title="RPA"
        description="管理自动化助手连接，查看机器人资源并运行任务。"
        search={page.searchValue}
        onSearch={page.search}
        onCreate={create}
        createText="新建 RPA"
        onRefresh={page.refresh}
        loading={page.loading}
        error={page.error}
        empty={!page.rpas.length}
      >
        <div className={styles.grid}>
          {page.rpas.map(rpa => (
            <CardItem
              key={rpa.id}
              rpa={rpa}
              user={user}
              refresh={page.refresh}
              showModal={values => modalFormRef.current?.showModal(values)}
            />
          ))}
        </div>
      </ResourceCatalog>
      <ModalForm ref={modalFormRef} refresh={page.refresh} />
    </>
  );
};
export default memo(RpaPage);
