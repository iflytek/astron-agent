import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';

import styles from './index.module.scss';
import { useTranslation } from 'react-i18next';

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  //tab选中
  const [activeKey, setActiveKey] = useState('0');

  const { t } = useTranslation();
  const isAgentListPage =
    location.pathname === '/management/release' ||
    location.pathname === '/management/release/' ||
    location.pathname === '/management/release/all' ||
    location.pathname === '/management/release/all/' ||
    location.pathname === '/management/release/agent' ||
    location.pathname === '/management/release/agent/' ||
    location.pathname === '/management/release/workflow' ||
    location.pathname === '/management/release/workflow/' ||
    location.pathname === '/management/release/virtual' ||
    location.pathname === '/management/release/virtual/';

  const isApprovalPage =
    location.pathname === '/management/release/approval' ||
    location.pathname === '/management/release/approval/';

  const isAPIPage =
    location.pathname === '/management/release/apikey' ||
    location.pathname === '/management/release/apikey/';

  const handleTabClick = (key: string) => {
    setActiveKey(key);
    if (key === '1') navigate('/management/release');
    else if (key === '2') navigate('/management/release/apikey');
  };

  useEffect(() => {
    if (isAgentListPage) setActiveKey('1');
    else if (isApprovalPage) setActiveKey('3');
    else if (isAPIPage) setActiveKey('2');
  }, [location.pathname]);
  return (
    <div className={styles.releasePage}>
      <div className={styles.releasePageTop}>
        <div className={styles.content}>
          {(isAgentListPage || isApprovalPage) && (
            <>
              <div className={styles.title}>
                <div className={styles.aff}>
                  {t('releaseManagement.releaseManagement')}
                </div>
              </div>

              <div className={styles.changeTab}>
                <div
                  className={`${styles.changeBox} ${
                    (location.pathname === '/management/release' ||
                      location.pathname === '/management/release/' ||
                      location.pathname === '/management/release/all' ||
                      location.pathname === '/management/release/all/') &&
                    styles.activeBox
                  }`}
                  onClick={(): void => {
                    navigate('/management/release/all');
                  }}
                >
                  {t('releaseManagement.all')}
                </div>
                <div
                  className={`${styles.changeBox} ${
                    (location.pathname === '/management/release/agent' ||
                      location.pathname === '/management/release/agent/') &&
                    styles.activeBox
                  }`}
                  onClick={(): void => {
                    navigate('/management/release/agent');
                  }}
                >
                  {t('releaseManagement.instructional')}
                </div>
                <div
                  className={`${styles.changeBox} ${
                    (location.pathname === '/management/release/workflow' ||
                      location.pathname === '/management/release/workflow/') &&
                    styles.activeBox
                  }`}
                  onClick={(): void => {
                    navigate('/management/release/workflow');
                  }}
                >
                  {t('releaseManagement.workflow')}
                </div>
                <div
                  className={`${styles.changeBox} ${
                    (location.pathname === '/management/release/virtual' ||
                      location.pathname === '/management/release/virtual/') &&
                    styles.activeBox
                  }`}
                  onClick={(): void => {
                    navigate('/management/release/virtual');
                  }}
                >
                  {t('releaseManagement.virtual')}
                </div>
                <div
                  className={`${styles.changeBox} ${
                    isApprovalPage && styles.activeBox
                  }`}
                  onClick={(): void => {
                    navigate('/management/release/approval');
                  }}
                >
                  {t('releaseManagement.publishApproval')}
                </div>
              </div>
            </>
          )}

          <Outlet />
        </div>
      </div>
    </div>
  );
}
