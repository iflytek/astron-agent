import { accountRequest } from './session';
import { resetAccountState } from './account-state';

export const handleLoginRedirect = (): void => {
  resetAccountState();
  if (
    ['/login', '/register', '/reset-password'].includes(
      window.location.pathname
    )
  )
    return;
  sessionStorage.setItem(
    'postLoginRedirect',
    window.location.pathname + window.location.search
  );
  window.location.assign('/login');
};

export const handleLogout = async (): Promise<void> => {
  await accountRequest('/auth/logout', {});
  resetAccountState();
  window.location.assign('/login');
};
