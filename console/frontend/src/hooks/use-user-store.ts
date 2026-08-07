import { useCallback, useMemo } from 'react';
import useUserStore from '@/store/user-store';
import { RoleType } from '@/types/permission';

export const useUserStoreHook = () => {
  const { user } = useUserStore();

  const isSuperAdmin = useMemo(() => {
    return user.roleType === RoleType.SUPER_ADMIN;
  }, [user]);

  const isOwner = useMemo(() => {
    return user.roleType === RoleType.OWNER;
  }, [user]);

  const isAdmin = useMemo(() => {
    return user.roleType === RoleType.ADMIN;
  }, [user]);

  const isMember = useMemo(() => {
    return user.roleType === RoleType.MEMBER;
  }, [user]);

  const permissionParams: any = useMemo(() => {
    const { spaceType, roleType } = user;
    return {
      spaceType,
      roleType,
    };
  }, [user]);

  const isExpires = useMemo(() => {
    return user.expiresAt && user.expiresAt < Date.now();
  }, [user]);

  const returnValues = useMemo(
    () => ({
      isSuperAdmin,
      isAdmin,
      isMember,
      isOwner,
      permissionParams,
      isExpires,
    }),
    [isSuperAdmin, isAdmin, isMember, isOwner, permissionParams, isExpires]
  );

  return returnValues;
};
