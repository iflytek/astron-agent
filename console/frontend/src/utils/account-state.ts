import useUserStore from '@/store/user-store';
import useSpaceStore from '@/store/space-store';
import useEnterpriseStore from '@/store/enterprise-store';

// Selection is persisted for refreshes, but must never cross account sessions.
export const resetAccountState = (): void => {
  useUserStore.getState().resetUser();
  useSpaceStore.getState().resetSpace();
  useEnterpriseStore.getState().clearEnterpriseData();
};
