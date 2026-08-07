import { useState } from 'react';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import BaseConfig from '@/components/config-page-component/config-base';

import styles from './index.module.scss';

const index = () => {
  const [currentRobot, setCurrentRobot] = useState<any>({});
  const [currentTab, setCurrentTab] = useState('base');
  const location = useLocation();

  return (
    <div className={styles.config_page_container}>
      <Routes>
        <Route
          path="/overview"
          element={
            <Navigate to={`/space/config/base${location.search}`} replace />
          }
        />
        <Route
          path="/base"
          element={
            <BaseConfig
              currentRobot={currentRobot}
              setCurrentRobot={setCurrentRobot}
              currentTab={currentTab}
              setCurrentTab={(activeKey: string) => setCurrentTab(activeKey)}
            />
          }
        />
      </Routes>
    </div>
  );
};

export default index;
