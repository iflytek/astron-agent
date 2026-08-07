import http from '../utils/http';
// 查询是否企业认证
export const checkCertification = () => {
  return http.get('/enterprise/check-certification');
};

// 更新企业logo
export const updateLogo = (params: string) => {
  return http.post('/enterprise/update-logo?logoUrl=' + params);
};

// 查询企业详情
export const getEnterpriseDetail = () => {
  return http.get('/enterprise/detail');
};
