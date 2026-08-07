import { useMemo } from 'react';
import { useLocaleStore } from '@/store/spark-store/locale-store';
import {
  getTabOptions,
  getRoleOptions,
  getStatusOptions,
  getMessages,
  getRoleTextMap,
  getApplyStatusTextMap,
  getInvitationStatusTextMap,
  getMemberRoleOptions,
} from '../config';

export const useSpaceI18n = () => {
  const currentLocale = useLocaleStore.getState().locale;

  const tabOptions = useMemo(
    () => getTabOptions(currentLocale),
    [currentLocale]
  );
  const roleOptions = useMemo(
    () => getRoleOptions(currentLocale),
    [currentLocale]
  );
  const enterpriseRoleOptions = useMemo(
    () => getRoleOptions(currentLocale, true),
    [currentLocale]
  );
  const statusOptions = useMemo(
    () => getStatusOptions(currentLocale),
    [currentLocale]
  );
  const statusOptionsApply = useMemo(
    () => getStatusOptions(currentLocale, true),
    [currentLocale]
  );
  const applyStatusTextMap = useMemo(
    () => getApplyStatusTextMap(currentLocale),
    [currentLocale]
  );
  const invitationStatusTextMap = useMemo(
    () => getInvitationStatusTextMap(currentLocale),
    [currentLocale]
  );
  const messages = useMemo(() => getMessages(currentLocale), [currentLocale]);
  const roleTextMap = useMemo(
    () => getRoleTextMap(currentLocale),
    [currentLocale]
  );
  const memberRoleOptions = useMemo(
    () => getMemberRoleOptions(currentLocale),
    [currentLocale]
  );

  return {
    currentLocale,
    tabOptions,
    roleOptions,
    enterpriseRoleOptions,
    statusOptions,
    statusOptionsApply,
    applyStatusTextMap,
    invitationStatusTextMap,
    messages,
    roleTextMap,
    memberRoleOptions,
  };
};
