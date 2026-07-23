import { deepStrictEqual } from 'node:assert/strict';
import { buildDebugSseHeaders } from '../src/components/prompt-try/request-headers';

const baseContext = {
  languageCode: 'zh-CN',
  accessToken: 'test-token',
};

deepStrictEqual(
  buildDebugSseHeaders({
    ...baseContext,
    spaceId: '42',
    spaceType: 'team',
    enterpriseId: '7',
  }),
  {
    'Accept-Language': 'zh-CN',
    authorization: 'Bearer test-token',
    'space-id': '42',
    'enterprise-id': '7',
  },
  'team-space debug requests should carry space and enterprise context'
);

deepStrictEqual(
  buildDebugSseHeaders({
    ...baseContext,
    spaceId: '42',
    spaceType: 'personal',
    enterpriseId: '7',
  }),
  {
    'Accept-Language': 'zh-CN',
    authorization: 'Bearer test-token',
    'space-id': '42',
  },
  'non-team debug requests should not carry stale enterprise context'
);

deepStrictEqual(
  buildDebugSseHeaders({
    ...baseContext,
    spaceId: '',
    spaceType: 'personal',
    enterpriseId: '',
  }),
  {
    'Accept-Language': 'zh-CN',
    authorization: 'Bearer test-token',
  },
  'personal debug requests should omit empty space context'
);
