import { useMemo } from 'react';
import useUserStore from '@/store/user-store';
import useSpaceStore from '@/store/space-store';
import { RoleType } from '@/types/permission';

export const useUserStoreHook = () => {
  const { user, getUserRole } = useUserStore();
  useSpaceStore();
  const role = getUserRole();
  const roleType = role?.roleType;
  const spaceType = role?.spaceType;

  const isSuperAdmin = useMemo(() => {
    return roleType === RoleType.SUPER_ADMIN;
  }, [roleType]);

  const isOwner = useMemo(() => {
    return roleType === RoleType.OWNER;
  }, [roleType]);

  const isAdmin = useMemo(() => {
    return roleType === RoleType.ADMIN;
  }, [roleType]);

  const isMember = useMemo(() => {
    return roleType === RoleType.MEMBER;
  }, [roleType]);

  const permissionParams = useMemo(() => {
    if (!spaceType || !roleType) return undefined;
    return {
      spaceType,
      roleType,
    };
  }, [spaceType, roleType]);

  const isExpires = useMemo(() => {
    const expiresAt = user.expiresAt;
    if (!expiresAt) return false;
    const timestamp =
      typeof expiresAt === 'number'
        ? expiresAt
        : typeof expiresAt === 'string'
          ? Number(expiresAt)
          : NaN;
    return Number.isFinite(timestamp) && timestamp < Date.now();
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
