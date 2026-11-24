import { useCallback, useEffect, useRef, useState } from 'react';
import useUserStore from '@/store/user-store';
import useSpaceStore from '@/store/space-store';
import { SpaceType, RoleType } from '@/types/permission';
import { roleToRoleType } from '@/pages/space/config';
import { getSpaceDetail, visitSpace } from '@/services/space';

export interface SpaceInfo {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'member';
  memberCount: number;
  totalMembers: number;
  ownerName: string;
  userRole: number;
  enterpriseId?: string;
  canEdit: boolean;
  canDelete: boolean;
}

interface UseSpaceInfoReturn {
  spaceInfo: SpaceInfo | null;
  loading: boolean;
  error: string;
  loadSpaceInfo: () => Promise<void>;
}

export const useSpaceInfo = (
  spaceId: string | undefined
): UseSpaceInfoReturn => {
  const uid = useUserStore(state => state.user.uid);
  const [spaceInfo, setSpaceInfo] = useState<SpaceInfo | null>(null);
  const [loadedFor, setLoadedFor] = useState('');
  const [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  const [error, setError] = useState('');
  const identity = JSON.stringify([uid, spaceId]);
  const loadSpaceInfo = useCallback(async (): Promise<void> => {
    const current = ++sequence.current;
    useUserStore.getState().clearUserRole();
    setSpaceInfo(null);
    setError('');
    if (!uid || !spaceId) return;
    const selected = useSpaceStore.getState();
    const isCurrent = (): boolean =>
      current === sequence.current && useUserStore.getState().user.uid === uid;
    setLoading(true);
    try {
      const result = (await getSpaceDetail(spaceId)) as unknown as SpaceInfo;
      if (!isCurrent()) return;
      const active = useSpaceStore.getState();
      if (
        active.spaceId !== selected.spaceId ||
        active.enterpriseId !== selected.enterpriseId
      ) {
        setError('当前空间已切换，请重试。');
        return;
      }
      const team = Boolean(result.enterpriseId);
      const enterpriseId = result.enterpriseId
        ? String(result.enterpriseId)
        : '';
      useSpaceStore.getState().setSpaceStore({
        spaceId: String(result.id),
        spaceName: result.name,
        enterpriseId,
        enterpriseName:
          enterpriseId === selected.enterpriseId ? selected.enterpriseName : '',
        spaceType: team ? 'team' : 'personal',
        spaceAvatar: result.avatarUrl || '',
      });
      useUserStore
        .getState()
        .setUserRole(
          team ? SpaceType.ENTERPRISE : SpaceType.PERSONAL,
          roleToRoleType(result.userRole, team) as RoleType,
          String(result.id),
          enterpriseId
        );
      setSpaceInfo(result);
      void visitSpace(spaceId).catch(() => undefined);
    } catch (error) {
      if (isCurrent()) {
        setSpaceInfo(null);
        useUserStore.getState().clearUserRole();
        setError('无法读取此空间，或您已没有访问权限。');
      }
    } finally {
      if (isCurrent()) {
        setLoadedFor(identity);
        setLoading(false);
      }
    }
  }, [uid, spaceId, identity]);
  useEffect(() => {
    void loadSpaceInfo();
    return () => {
      sequence.current += 1;
    };
  }, [loadSpaceInfo]);
  const current = loadedFor === identity && Boolean(uid);
  return {
    spaceInfo: current ? spaceInfo : null,
    loading: loading || !current,
    error,
    loadSpaceInfo,
  };
};
