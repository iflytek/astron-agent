import { accountRequest } from './session';

export const handleLoginRedirect = (): void => {
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
  window.location.assign('/login');
};
