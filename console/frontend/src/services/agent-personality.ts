import http from '@/utils/http';

interface PersonalityType {
  id: string;
  name: string;
}

interface PersonalityInfo {
  id: string;
  name: string;
  description: string;
  cover?: string;
  headCover?: string;
  prompt: string;
}

interface PersonalityListResponse {
  records: PersonalityInfo[];
}

export type PersonalityGenerateResponse =
  | string
  | {
      content?: string;
      data?: string | { content?: string };
    };

/** 获取人设库分类 */
export const getPersonalityCategory = (params?: {
  [key: string]: unknown;
}): Promise<PersonalityType[]> => {
  return http.get('/personality/getCategory', { params });
};

/** 获取分类对应的人设 */
export const getPersonalityByCategory = (params: {
  categoryId: string;
  pageNum: number;
  pageSize: number;
}): Promise<PersonalityListResponse> => {
  return http.get(`/personality/getRole`, {
    params,
  });
};

/** 生成人设内容 */
export const generatePersonalityContent = (params: {
  botName: string;
  category: string;
  info: string;
  prompt: string;
}): Promise<PersonalityGenerateResponse> => {
  const formData = new FormData();
  formData.append('botName', params.botName);
  formData.append('category', params.category);
  formData.append('info', params.info);
  formData.append('prompt', params.prompt);

  return http.post('/personality/aiGenerate', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/** 润色人设内容 */
export const polishPersonalityContent = (params: {
  botName: string;
  category: string;
  info: string;
  prompt: string;
  personality: string; // 当前用户的人设内容
}): Promise<PersonalityGenerateResponse> => {
  const formData = new FormData();
  formData.append('botName', params.botName);
  formData.append('category', params.category);
  formData.append('info', params.info);
  formData.append('prompt', params.prompt);
  formData.append('personality', params.personality);

  return http.post('/personality/aiPolishing', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
