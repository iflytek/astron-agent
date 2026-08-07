import { performLogout, casdoorSdk } from '@/config/casdoor';

export const handleLoginRedirect = (): void => {
  sessionStorage.setItem(
    'postLoginRedirect',
    window.location.pathname + window.location.search
  );
  casdoorSdk.signin_redirect();
};

export const handleLogout = (): void => {
  performLogout(window.location.origin);
};
