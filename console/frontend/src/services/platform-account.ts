import http from '@/utils/http';
import {
  PlatformAccountCard,
  PlatformAccountConfig,
  PlatformAccountRuntimeConfig,
  PlatformAccountType,
} from '@/types/platform-account';

export async function getPlatformAccountCards(): Promise<
  PlatformAccountCard[]
> {
  return await http.get('/api/platform-account/cards');
}

export async function getPlatformAccountConfig(
  type: PlatformAccountType
): Promise<PlatformAccountConfig> {
  return await http.get(`/api/platform-account/${type}`);
}

export async function savePlatformAccountConfig(
  type: PlatformAccountType,
  config: PlatformAccountConfig
): Promise<PlatformAccountConfig> {
  return await http.put(`/api/platform-account/${type}`, config);
}

export async function getPlatformAccountRuntimeConfig(): Promise<PlatformAccountRuntimeConfig> {
  return await http.get('/api/platform-account/runtime-config');
}
