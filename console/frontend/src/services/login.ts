import http from '@/utils/http';
import type { User } from '@/store/user-store';

export async function getUserInfoMe(): Promise<User> {
  return http.get('/user-info/me');
}
