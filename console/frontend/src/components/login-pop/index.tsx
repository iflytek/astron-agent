import useUserStore, { UserState } from '@/store/user-store';
import { ReactElement } from 'react';
import { jumpToLogin } from '@/utils/http';
import { useLocation } from 'react-router-dom';

import loginPopImg from '@/assets/imgs/login/login-pop-img.png';
import styles from './style.module.scss';

const LoginPop = (): ReactElement => {
  const user = useUserStore((state: UserState) => state.user);
  const location = useLocation();

  const isHomePage = ['/', '/home'].includes(location.pathname);

  return user.nickname || user.login || !isHomePage ? (
    <></>
  ) : (
    <div className={styles.loginPopBox}>
      <div className={styles.loginPopWrap}>
        <img src={loginPopImg} alt="欢迎登录" />
        <div className={styles.loginPopIntro}>
          <h2>立即登录/注册，开启智能体创造之旅！</h2>
          <p>来星辰，创建属于你的AI应用</p>
        </div>
        <div className={styles.loginPopUse} onClick={() => jumpToLogin()}>
          开始使用
        </div>
      </div>
    </div>
  );
};

export default LoginPop;
