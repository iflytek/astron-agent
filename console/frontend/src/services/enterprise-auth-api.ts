import http from '../utils/http';
import type { AxiosResponse } from 'axios';
// 查询是否企业认证
export const checkCertification = (): Promise<AxiosResponse> => {
  return http.get('/enterprise/check-certification');
};

// 更新企业logo
export const updateLogo = (params: string): Promise<AxiosResponse> => {
  return http.post('/enterprise/update-logo?logoUrl=' + params);
};

// 查询企业详情
export const getEnterpriseDetail = (): Promise<AxiosResponse> => {
  return http.get('/enterprise/detail');
};
