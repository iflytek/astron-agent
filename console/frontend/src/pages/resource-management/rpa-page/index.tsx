import { memo, FC, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { jumpToLogin } from '@/utils/http';
import { useRpaPage } from './hooks/use-rpa-page';
import useUserStore from '@/store/user-store';
import { ModalForm } from './components/modal-form';
import { RpaDetailFormInfo } from '@/types/rpa';
import ResourceEmpty from '../resource-empty';
import SiderContainer from '@/components/sider-container';
import CardItem from './components/card-item';

const RpaPage: FC = () => {
  const { t } = useTranslation();
  const modalFormRef = useRef<{
    showModal: (values?: RpaDetailFormInfo) => void;
  }>(null);
  const { rpas, refresh, searchValue } = useRpaPage(modalFormRef);
  const user = useUserStore(state => state.user);

  const rightContent = useMemo(
    () => (
      <div className="h-full w-full">
        {rpas.length === 0 ? (
          <ResourceEmpty
            description={
              searchValue ? t('rpa.noSearchResults') : t('rpa.emptyDescription')
            }
            buttonText={t('rpa.createRpa')}
            onCreate={() => {
              if (!user?.login && !user?.uid) {
                return jumpToLogin();
              }
              modalFormRef.current?.showModal();
            }}
          />
        ) : (
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-3 gap-6">
            {rpas.map(rpa => (
              <CardItem
                rpa={rpa}
                key={rpa.id}
                user={user}
                refresh={refresh}
                showModal={values => modalFormRef.current?.showModal(values)}
              />
            ))}
          </div>
        )}
      </div>
    ),
    [rpas, user, searchValue, refresh, modalFormRef, t]
  );

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <SiderContainer rightContent={rightContent} />
      <ModalForm ref={modalFormRef} refresh={refresh} />
    </div>
  );
};

export default memo(RpaPage);
